import type { CampaignRecord } from "@/config/studio-board";
import { bridgeExceptionFromRevisionExhausted } from "@/lib/campaign-tasks/exceptions-actions";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";

import { applyJobSpineStatusChange } from "./actions";
import { appendJobActivityEvent } from "./activity-log";
import {
  allRequiredDeliverablesPrepared,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import type { JobReviewFeedback } from "./review-feedback-types";
import {
  canApproveJobForDelivery,
  canRequestJobRevision,
  clientRevisionRoundWouldExceed,
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

function lineSkuId(line: { skuId?: string; serviceId?: string }): string {
  return (line.skuId ?? line.serviceId)!;
}

function requiredDeliverablesForJob(
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
): readonly string[] {
  const plan = campaign.approvedStudioPlan;
  const line = plan
    ? filterProductionPlanLineItems(plan).find(
        (item) => lineSkuId(item) === job.skuId,
      )
    : undefined;
  return line?.deliverables ?? [];
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
): ReviewRoomActionResult {
  const occurredAt = new Date().toISOString();
  const actor = clientActor(user);
  let events = [...(envelope.jobActivityEvents ?? [])];
  let currentJob = job;

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

  const revisionRoundsIncluded = campaign.revisionRoundsIncluded ?? 1;
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
      if (clientRevisionRoundWouldExceed(revisionRoundsUsed, revisionRoundsIncluded)) {
        const taskId =
          envelope.tasks?.find((task) => task.relatedServiceIds.includes(job.skuId as never))
            ?.id ?? job.jobId;

        let nextEnvelope = bridgeExceptionFromRevisionExhausted(
          envelope,
          taskId,
          campaign,
          user,
          assignments,
        );

        events = appendJobActivityEvent(events, {
          campaignId: job.campaignId,
          jobId: job.jobId,
          kind: "client_revision_request",
          occurredAt,
          actor,
          reason: "Revision limit reached — escalated to Owner Desk",
        });

        nextEnvelope = updateJobInEnvelope(nextEnvelope, currentJob, events);

        return {
          ok: false,
          error: "Revision allowance exhausted. Your request has been sent to the Owner Desk.",
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

      const statusResult = applyJobSpineStatusChange(currentJob, events, {
        job: currentJob,
        nextStatus: "revision_requested",
        actor,
        reason: "Client requested revision with feedback",
        occurredAt,
      });
      currentJob = statusResult.job;
      events = statusResult.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_revision_request",
        occurredAt,
        actor,
        reason: "Client requested revision",
        spineStatus: "revision_requested",
      });

      const updatedCampaign: CampaignRecord = {
        ...campaign,
        revisionRoundsUsed: revisionRoundsUsed + 1,
        updatedAt: occurredAt,
      };

      let nextEnvelope = upsertJobReviewFeedback(
        {
          ...envelope,
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
      nextEnvelope = updateJobInEnvelope(nextEnvelope, currentJob, events);

      return { ok: true, envelope: nextEnvelope, job: currentJob, feedback };
    }

    default:
      return { ok: false, error: "Unknown action.", status: 400 };
  }
}
