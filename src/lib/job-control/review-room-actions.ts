import type { CampaignRecord } from "@/config/studio-board";
import { requiredDeliverablesForJob } from "@/lib/approved-plan-line";
import { resolveCampaignRevisionRounds } from "@/lib/approved-plan-display";
import { isClientOnly } from "@/lib/auth/roles";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import { applyJobSpineStatusChange } from "./actions";
import { appendJobActivityEvent } from "./activity-log";
import { enqueueJobCommunicationRecord } from "./communication";
import {
  allRequiredDeliverablesPrepared,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import type { JobReviewFeedback } from "./review-feedback-types";
import {
  findClientReviewReceivedForRelease,
  findLatestStudioReviewRelease,
  releaseMessageRef,
} from "./review-handoff-receipts";
import { canClientAccessJobReview } from "./review-room-access";
import {
  canApproveJobForDelivery,
  canRequestJobRevision,
  clientRevisionRoundHardStops,
  clientRevisionRoundRequiresReserveHandling,
} from "./review-room-gates";
import { findJobReviewFeedback, upsertJobReviewFeedback } from "./review-room-view";
import type { JobActivityActor, JobActivityEvent, PurchasedJobRecord } from "./types";

export type ReviewRoomPatchBody =
  | {
      action: "save_feedback";
      feedback: JobReviewFeedback;
    }
  | {
      action: "request_revision";
      feedback: JobReviewFeedback;
    }
  | {
      action: "approve_for_delivery";
      feedback: JobReviewFeedback;
    }
  | {
      /** C8b — authorized customer open of an active review release. */
      action: "acknowledge_review_received";
    };

export type ReviewRoomActionResult =
  | {
      ok: true;
      envelope: ServerTasksEnvelope;
      job: PurchasedJobRecord;
      feedback: JobReviewFeedback;
      updatedCampaign?: CampaignRecord;
    }
  | { ok: false; error: string; status: number; revisionLimitReached?: boolean };

function clientActor(user: StudioUser): JobActivityActor {
  return {
    role: "client",
    userId: user.id,
    displayName: user.displayName ?? "Client",
  };
}

function updateJobInEnvelope(
  envelope: ServerTasksEnvelope,
  job: PurchasedJobRecord,
  events: JobActivityEvent[],
): ServerTasksEnvelope {
  const jobRecords = (envelope.jobRecords ?? []).map((entry) =>
    entry.jobId === job.jobId ? job : entry,
  );
  return {
    ...envelope,
    jobRecords,
    jobActivityEvents: events,
    updatedAt: job.updatedAt,
  };
}

function markTasksNeedsRevision(
  tasks: readonly CampaignTaskItem[],
  skuId: string,
): CampaignTaskItem[] {
  return tasks.map((task) => {
    if (!task.relatedServiceIds.includes(skuId as never)) return task;
    if (task.workflowState === "complete" || task.workflowState === "cancelled") {
      return task;
    }
    return {
      ...task,
      workflowState: "needs_revision" as const,
      status: "needs_revision" as const,
    };
  });
}

function validateFeedbackJobScope(
  feedback: JobReviewFeedback,
  campaignId: string,
  jobId: string,
): string | null {
  if (feedback.campaignId !== campaignId || feedback.jobId !== jobId) {
    return "Feedback must match the requested job.";
  }
  return null;
}

export function applyReviewRoomPatch(
  envelope: ServerTasksEnvelope,
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
  body: ReviewRoomPatchBody,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  clientId = `unclaimed-client:${campaign.campaignId}`,
): ReviewRoomActionResult {
  const occurredAt = new Date().toISOString();
  const actor = clientActor(user);
  let events = [...(envelope.jobActivityEvents ?? [])];
  let currentJob = job;

  if (body.action === "acknowledge_review_received") {
    if (!isClientOnly(user)) {
      return {
        ok: false,
        error: "Only the authorized customer can record review receipt.",
        status: 403,
      };
    }
    if (!canClientAccessJobReview(job)) {
      return { ok: false, error: "Job is not open for review.", status: 422 };
    }

    const release = findLatestStudioReviewRelease(events, job.jobId);
    if (!release) {
      return {
        ok: false,
        error: "No Studio review release is available to acknowledge.",
        status: 422,
      };
    }

    const existingFeedback =
      findJobReviewFeedback(envelope, job.jobId) ??
      ({
        jobId: job.jobId,
        campaignId: job.campaignId,
        sectionStatuses: {},
        stickyNotes: [],
        voiceNotes: [],
        drawSections: [],
        updatedAt: occurredAt,
        submittedAt: null,
        submissionType: null,
      } satisfies JobReviewFeedback);

    const existingReceipt = findClientReviewReceivedForRelease(
      events,
      job.jobId,
      release.activityId,
    );
    if (existingReceipt) {
      return {
        ok: true,
        envelope,
        job: currentJob,
        feedback: existingFeedback,
      };
    }

    events = appendJobActivityEvent(events, {
      campaignId: job.campaignId,
      jobId: job.jobId,
      kind: "client_review_received",
      occurredAt,
      actor,
      reason: "Customer opened the released review",
      messageRef: releaseMessageRef(release.activityId),
      spineStatus: job.spineStatus,
    });

    return {
      ok: true,
      envelope: updateJobInEnvelope(envelope, currentJob, events),
      job: currentJob,
      feedback: existingFeedback,
    };
  }

  const scopeError = validateFeedbackJobScope(body.feedback, job.campaignId, job.jobId);
  if (scopeError) {
    return { ok: false, error: scopeError, status: 422 };
  }

  const requiredDeliverables = requiredDeliverablesForJob(campaign, job);
  const allPrepared = allRequiredDeliverablesPrepared(job, requiredDeliverables);
  const deliverableKeys = resolveRequiredDeliverableKeys(requiredDeliverables)
    .filter((def) =>
      (job.deliverablePrep ?? []).some(
        (entry) => entry.deliverableKey === def.key && entry.preparedAt,
      ),
    )
    .map((def) => def.key);

  const revisionRoundsIncluded = resolveCampaignRevisionRounds(campaign);
  const revisionRoundsUsed = campaign.revisionRoundsUsed ?? 0;

  switch (body.action) {
    case "save_feedback": {
      if (job.spineStatus !== "ready_for_review") {
        return { ok: false, error: "Job is not open for review.", status: 422 };
      }

      const existing = findJobReviewFeedback(envelope, job.jobId);
      if (existing?.submittedAt) {
        return { ok: false, error: "Review already submitted.", status: 422 };
      }

      const feedback: JobReviewFeedback = {
        ...body.feedback,
        jobId: job.jobId,
        campaignId: job.campaignId,
        updatedAt: occurredAt,
      };

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_review_feedback",
        occurredAt,
        actor,
        reason: "Client saved review feedback",
      });

      const nextEnvelope = upsertJobReviewFeedback(
        updateJobInEnvelope(envelope, currentJob, events),
        feedback,
      );

      return { ok: true, envelope: nextEnvelope, job: currentJob, feedback };
    }

    case "request_revision": {
      if (clientRevisionRoundHardStops(revisionRoundsUsed)) {
        events = appendJobActivityEvent(events, {
          campaignId: job.campaignId,
          jobId: job.jobId,
          kind: "client_revision_request",
          occurredAt,
          actor,
          reason: "Revision hard stop reached - Squishy will hold policy unless this becomes a boundary, scope, goodwill, or relationship decision.",
        });

        return {
          ok: false,
          error: "This job has reached the revision hard stop. Squishy will follow policy unless the request becomes a business judgment issue.",
          status: 422,
          revisionLimitReached: true,
        };
      }

      const gate = canRequestJobRevision({
        job,
        feedback: body.feedback,
        revisionRoundsUsed,
        revisionRoundsIncluded,
        allDeliverablesPrepared: allPrepared,
      });

      if (!gate.allowed) {
        return { ok: false, error: gate.reasons.join(" "), status: 422 };
      }

      const feedback: JobReviewFeedback = {
        ...body.feedback,
        jobId: job.jobId,
        campaignId: job.campaignId,
        updatedAt: occurredAt,
        submittedAt: occurredAt,
        submissionType: "revision_requested",
      };
      const isReserveRevision = clientRevisionRoundRequiresReserveHandling(revisionRoundsUsed);

      const statusResult = applyJobSpineStatusChange(currentJob, events, {
        job: currentJob,
        nextStatus: isReserveRevision ? "ready_for_queue" : "revision_requested",
        actor,
        reason: isReserveRevision
          ? "Reserve revision requested with feedback - returned to production queue"
          : "Client requested revision with feedback",
        occurredAt,
      });
      currentJob = isReserveRevision
        ? { ...statusResult.job, laneQueuedAt: occurredAt }
        : statusResult.job;
      events = statusResult.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_revision_request",
        occurredAt,
        actor,
        reason: isReserveRevision
          ? "Reserve revision round requested - required questions and delay acknowledgment handled by Squishy and Decision Core"
          : "Client requested revision",
        spineStatus: currentJob.spineStatus,
      });
      let nextEnvelope = enqueueJobCommunicationRecord(
        { ...envelope, jobActivityEvents: events },
        {
          campaign,
          clientId,
          job: currentJob,
          eventType: "revision_requested",
          sender: actor,
          occurredAt,
          idempotencyKey: occurredAt,
        },
      );
      events = nextEnvelope.jobActivityEvents ?? [];

      const updatedCampaign: CampaignRecord = {
        ...campaign,
        revisionRoundsUsed: revisionRoundsUsed + 1,
        updatedAt: occurredAt,
      };

      nextEnvelope = upsertJobReviewFeedback(
        {
          ...nextEnvelope,
          tasks: markTasksNeedsRevision(envelope.tasks ?? [], job.skuId),
        },
        feedback,
      );
      nextEnvelope = updateJobInEnvelope(nextEnvelope, currentJob, events);

      return {
        ok: true,
        envelope: nextEnvelope,
        job: currentJob,
        feedback,
        updatedCampaign,
      };
    }

    case "approve_for_delivery": {
      const gate = canApproveJobForDelivery({
        job,
        feedback: body.feedback,
        allDeliverablesPrepared: allPrepared,
        deliverableCount: deliverableKeys.length,
      });

      if (!gate.allowed) {
        return { ok: false, error: gate.reasons.join(" "), status: 422 };
      }

      const feedback: JobReviewFeedback = {
        ...body.feedback,
        jobId: job.jobId,
        campaignId: job.campaignId,
        updatedAt: occurredAt,
        submittedAt: occurredAt,
        submissionType: "approved_for_delivery",
      };

      const statusResult = applyJobSpineStatusChange(currentJob, events, {
        job: currentJob,
        nextStatus: "approved",
        actor,
        reason: "Client approved for delivery — awaiting Owner final approval",
        occurredAt,
      });
      currentJob = {
        ...statusResult.job,
        ownerApprovalPending: "before_delivery",
      };
      events = statusResult.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_delivery_approval",
        occurredAt,
        actor,
        reason: "Client approved for delivery",
        spineStatus: "approved",
      });

      let nextEnvelope = upsertJobReviewFeedback(envelope, feedback);
      nextEnvelope = enqueueJobCommunicationRecord(
        { ...nextEnvelope, jobActivityEvents: events },
        {
          campaign,
          clientId,
          job: currentJob,
          eventType: "approved_for_delivery",
          sender: actor,
          occurredAt,
          idempotencyKey: occurredAt,
        },
      );
      events = nextEnvelope.jobActivityEvents ?? [];
      nextEnvelope = updateJobInEnvelope(nextEnvelope, currentJob, events);

      return { ok: true, envelope: nextEnvelope, job: currentJob, feedback };
    }

    default:
      return { ok: false, error: "Unknown action.", status: 400 };
  }
}
