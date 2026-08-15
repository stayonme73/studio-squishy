import type { CampaignRecord } from "@/config/studio-board";
import { requiredDeliverablesForJob } from "@/lib/approved-plan-line";
import { isClientOnly } from "@/lib/auth/roles";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import { applyJobSpineStatusChange } from "./actions";
import { appendJobActivityEvent } from "./activity-log";
import { enqueueJobCommunicationRecord } from "./communication";
import {
  appendCorrectionUseIdempotent,
  buildCorrectionUseIdempotencyKey,
  buildCorrectionUseRecord,
  deriveCorrectionAccounting,
  ensureWriteOnceRevisionAllowance,
  findCorrectionUseByKey,
  findCorrectionUseByPackageId,
  mergeReconstructedCorrectionUses,
  pickExtraGrantToConsume,
  type CorrectionUseRecord,
} from "./correction-round-ledger";
import {
  allRequiredDeliverablesPrepared,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import {
  ensureFeedbackPackageId,
  type JobReviewFeedback,
} from "./review-feedback-types";
import {
  findClientReviewReceivedForRelease,
  findLatestStudioReviewRelease,
  releaseMessageRef,
} from "./review-handoff-receipts";
import { buildCustomerApprovedArtifactAuthorization } from "@/lib/studio-approved-delivery";
import { assembleApprovedFlyerClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import {
  buildMachineFlyerRevisionEmphasis,
  currentFlyerWorkVersionId,
} from "@/lib/studio-review-revision/flyer-revision-emphasis";

import type { CampaignMaterialItem } from "@/lib/materials/types";

import { applySystemFinalDeliveryAuthorization } from "./final-delivery-actions";
import { materialContextFromLedger } from "./final-delivery-gates";
import { canClientAccessJobReview } from "./review-room-access";
import {
  canApproveJobForDelivery,
  canRequestJobRevision,
} from "./review-room-gates";
import {
  findActiveJobReviewFeedback,
  findJobReviewFeedback,
  listLockedJobReviewFeedback,
  upsertJobReviewFeedback,
} from "./review-room-view";
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
      correctionUse?: CorrectionUseRecord;
      correctionUseCreated?: boolean;
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

function resolveVersionLabel(job: PurchasedJobRecord): string | null {
  const labels = (job.fileRegistry ?? [])
    .map((ref) => ref.versionLabel?.trim())
    .filter((label): label is string => Boolean(label));
  return labels.at(-1) ?? null;
}

export function applyReviewRoomPatch(
  envelope: ServerTasksEnvelope,
  campaignInput: CampaignRecord,
  job: PurchasedJobRecord,
  body: ReviewRoomPatchBody,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  clientId = `unclaimed-client:${campaignInput.campaignId}`,
  materials: readonly CampaignMaterialItem[] = [],
  materialLedgerLoaded = true,
): ReviewRoomActionResult {
  const occurredAt = new Date().toISOString();
  const actor = clientActor(user);
  let events = [...(envelope.jobActivityEvents ?? [])];
  let currentJob = job;

  let workingEnvelope = mergeReconstructedCorrectionUses(
    envelope,
    campaignInput.campaignId,
  );
  const allowance = ensureWriteOnceRevisionAllowance(campaignInput, occurredAt);
  let campaign = allowance.campaign;

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
      findActiveJobReviewFeedback(workingEnvelope, job.jobId) ??
      findJobReviewFeedback(workingEnvelope, job.jobId) ??
      ({
        packageId: `pkg:${job.jobId}:draft:${release.activityId}`,
        jobId: job.jobId,
        campaignId: job.campaignId,
        sectionStatuses: {},
        stickyNotes: [],
        voiceNotes: [],
        drawSections: [],
        updatedAt: occurredAt,
        releaseActivityId: release.activityId,
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
        envelope: workingEnvelope,
        job: currentJob,
        feedback: existingFeedback,
        updatedCampaign: allowance.didSnapshot ? campaign : undefined,
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
      envelope: updateJobInEnvelope(workingEnvelope, currentJob, events),
      job: currentJob,
      feedback: existingFeedback,
      updatedCampaign: allowance.didSnapshot ? campaign : undefined,
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

  const accounting = deriveCorrectionAccounting({
    campaign,
    envelope: workingEnvelope,
  });

  switch (body.action) {
    case "save_feedback": {
      if (job.spineStatus !== "ready_for_review") {
        return { ok: false, error: "Job is not open for review.", status: 422 };
      }

      const existingActive = findActiveJobReviewFeedback(workingEnvelope, job.jobId);
      const locked = listLockedJobReviewFeedback(workingEnvelope, job.jobId);
      if (!existingActive && locked.some((entry) => entry.packageId === body.feedback.packageId)) {
        return { ok: false, error: "Locked feedback packages cannot be edited.", status: 422 };
      }
      if (existingActive?.submittedAt) {
        return { ok: false, error: "Review already submitted.", status: 422 };
      }

      const release = findLatestStudioReviewRelease(events, job.jobId);
      const feedback = ensureFeedbackPackageId({
        ...body.feedback,
        jobId: job.jobId,
        campaignId: job.campaignId,
        packageId:
          body.feedback.packageId ||
          existingActive?.packageId ||
          `pkg:${job.jobId}:draft:${release?.activityId ?? "open"}`,
        releaseActivityId:
          body.feedback.releaseActivityId ??
          existingActive?.releaseActivityId ??
          release?.activityId ??
          null,
        updatedAt: occurredAt,
        submittedAt: null,
        submissionType: null,
      });

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_review_feedback",
        occurredAt,
        actor,
        reason: "Client saved review feedback",
      });

      const nextEnvelope = upsertJobReviewFeedback(
        updateJobInEnvelope(workingEnvelope, currentJob, events),
        feedback,
      );

      return {
        ok: true,
        envelope: nextEnvelope,
        job: currentJob,
        feedback,
        updatedCampaign: allowance.didSnapshot ? campaign : undefined,
      };
    }

    case "request_revision": {
      const gate = canRequestJobRevision({
        job,
        feedback: body.feedback,
        revisionRoundsRemaining: accounting.remaining,
        allDeliverablesPrepared: allPrepared,
      });

      if (!gate.allowed) {
        const exhausted = accounting.remaining <= 0;
        return {
          ok: false,
          error: gate.reasons.join(" "),
          status: 422,
          revisionLimitReached: exhausted,
        };
      }

      const release = findLatestStudioReviewRelease(events, job.jobId);
      const active = findActiveJobReviewFeedback(workingEnvelope, job.jobId);
      const packageId =
        body.feedback.packageId ||
        active?.packageId ||
        `pkg:${job.jobId}:draft:${release?.activityId ?? occurredAt}`;

      const existingUse =
        findCorrectionUseByPackageId(workingEnvelope, packageId) ??
        findCorrectionUseByKey(
          workingEnvelope,
          buildCorrectionUseIdempotencyKey(job.jobId, body.feedback.submittedAt ?? ""),
        );
      if (existingUse) {
        const existingFeedback =
          listLockedJobReviewFeedback(workingEnvelope, job.jobId).find(
            (entry) => entry.packageId === packageId,
          ) ?? findJobReviewFeedback(workingEnvelope, job.jobId);
        return {
          ok: true,
          envelope: workingEnvelope,
          job: currentJob,
          feedback: existingFeedback ?? ensureFeedbackPackageId(body.feedback),
          updatedCampaign: campaign,
          correctionUse: existingUse,
          correctionUseCreated: false,
        };
      }

      if (
        listLockedJobReviewFeedback(workingEnvelope, job.jobId).some(
          (entry) => entry.packageId === packageId,
        )
      ) {
        return {
          ok: false,
          error: "This feedback package is already locked.",
          status: 422,
        };
      }

      const feedback = ensureFeedbackPackageId({
        ...body.feedback,
        packageId,
        jobId: job.jobId,
        campaignId: job.campaignId,
        releaseActivityId:
          body.feedback.releaseActivityId ??
          active?.releaseActivityId ??
          release?.activityId ??
          null,
        updatedAt: occurredAt,
        submittedAt: occurredAt,
        submissionType: "revision_requested",
      });

      let consumptionKind: "included" | "owner_extra" = "included";
      let extraGrantId: string | undefined;
      if (accounting.remainingIncluded > 0) {
        consumptionKind = "included";
      } else {
        const grant = pickExtraGrantToConsume(
          accounting.grants,
          accounting.history,
          job.jobId,
        );
        if (!grant) {
          return {
            ok: false,
            error: "All included correction rounds have been used.",
            status: 422,
            revisionLimitReached: true,
          };
        }
        consumptionKind = "owner_extra";
        extraGrantId = grant.id;
      }

      const statusResult = applyJobSpineStatusChange(currentJob, events, {
        job: currentJob,
        nextStatus: "revision_requested",
        actor,
        reason: "Client requested revision with feedback",
        occurredAt,
      });
      currentJob = {
        ...statusResult.job,
        // Prior review / delivery authorization must not authorize the next version.
        internalQaReviewAuthorization: undefined,
        customerApprovedArtifactAuthorization: undefined,
      };
      events = statusResult.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_revision_request",
        occurredAt,
        actor,
        reason: "Client requested revision",
        spineStatus: currentJob.spineStatus,
        messageRef: `correction:${packageId}:${occurredAt}`,
      });

      let nextEnvelope = enqueueJobCommunicationRecord(
        { ...workingEnvelope, jobActivityEvents: events },
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

      const correctionUse = buildCorrectionUseRecord({
        campaignId: job.campaignId,
        jobId: job.jobId,
        packageId,
        submittedAt: occurredAt,
        releaseActivityId: feedback.releaseActivityId ?? release?.activityId ?? null,
        versionLabel: resolveVersionLabel(job),
        actor,
        occurredAt,
        ordinal: accounting.history.length + 1,
        consumptionKind,
        extraGrantId,
        feedback,
      });

      const appended = appendCorrectionUseIdempotent(nextEnvelope, correctionUse);
      nextEnvelope = appended.envelope;

      if (!appended.created) {
        // Idempotent retry — return existing locked package / ledger row.
        const existingFeedback =
          listLockedJobReviewFeedback(nextEnvelope, job.jobId).find(
            (entry) => entry.packageId === packageId,
          ) ?? feedback;
        return {
          ok: true,
          envelope: nextEnvelope,
          job: currentJob,
          feedback: existingFeedback,
          updatedCampaign: campaign,
          correctionUse: appended.record,
          correctionUseCreated: false,
        };
      }

      const ledgerUsed = (nextEnvelope.jobCorrectionUses ?? []).length;
      const emphasis = buildMachineFlyerRevisionEmphasis({
        feedback,
        campaign,
        priorWorkVersionId: currentFlyerWorkVersionId(job),
        recordedAt: occurredAt,
      });
      const updatedCampaign: CampaignRecord = {
        ...campaign,
        revisionRoundsIncluded: campaign.revisionRoundsIncluded,
        revisionRoundsIncludedSource: campaign.revisionRoundsIncludedSource,
        revisionRoundsUsed: ledgerUsed,
        ...(emphasis ? { machineFlyerRevisionEmphasis: emphasis } : {}),
        updatedAt: occurredAt,
      };

      nextEnvelope = upsertJobReviewFeedback(
        {
          ...nextEnvelope,
          tasks: markTasksNeedsRevision(workingEnvelope.tasks ?? [], job.skuId),
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
        correctionUse: appended.record,
        correctionUseCreated: true,
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

      const release = findLatestStudioReviewRelease(events, job.jobId);
      const active = findActiveJobReviewFeedback(workingEnvelope, job.jobId);
      const feedback = ensureFeedbackPackageId({
        ...body.feedback,
        packageId:
          body.feedback.packageId ||
          active?.packageId ||
          `pkg:${job.jobId}:draft:${release?.activityId ?? occurredAt}`,
        jobId: job.jobId,
        campaignId: job.campaignId,
        releaseActivityId:
          body.feedback.releaseActivityId ??
          active?.releaseActivityId ??
          release?.activityId ??
          null,
        updatedAt: occurredAt,
        submittedAt: occurredAt,
        submissionType: "approved_for_delivery",
      });

      const approvalPin = buildCustomerApprovedArtifactAuthorization({
        job: currentJob,
        feedback,
        approvedAt: occurredAt,
      });
      if (!approvalPin.ok) {
        return { ok: false, error: approvalPin.error, status: 422 };
      }

      const statusResult = applyJobSpineStatusChange(currentJob, events, {
        job: currentJob,
        nextStatus: "approved",
        actor,
        reason:
          "Client approved for delivery — Studio release checks authorize Final Delivery when candidate matches",
        occurredAt,
      });
      // Routine path: do NOT set ownerApprovalPending. Owner hold only via
      // requestOwnerApprovalBeforeDelivery for genuine exceptions.
      currentJob = {
        ...statusResult.job,
        ownerApprovalPending: null,
        customerApprovedArtifactAuthorization: approvalPin.authorization,
      };
      events = statusResult.events;

      const assembled = assembleApprovedFlyerClientDelivery({
        job: currentJob,
        events,
        actor,
        occurredAt,
        requiredDeliverableLabel: requiredDeliverables[0],
        requiredDeliverables,
      });
      currentJob = assembled.job;
      events = assembled.events;

      events = appendJobActivityEvent(events, {
        campaignId: job.campaignId,
        jobId: job.jobId,
        kind: "client_delivery_approval",
        occurredAt,
        actor,
        reason: "Client approved for delivery",
        spineStatus: "approved",
      });

      // If final files are already assembled and match, system opens Final Delivery now.
      // Material-use ledger is required — customer approval cannot waive rights holds.
      const systemRelease = applySystemFinalDeliveryAuthorization(
        currentJob,
        events,
        requiredDeliverablesForJob(campaign, currentJob),
        {
          occurredAt,
          materialUse: materialLedgerLoaded
            ? materialContextFromLedger(materials)
            : { ledgerLoaded: false, items: [] },
        },
      );
      currentJob = systemRelease.job;
      events = systemRelease.events;

      let nextEnvelope = upsertJobReviewFeedback(workingEnvelope, feedback);
      nextEnvelope = enqueueJobCommunicationRecord(
        { ...nextEnvelope, jobActivityEvents: events },
        {
          campaign,
          clientId,
          job: currentJob,
          eventType: systemRelease.applied
            ? "final_delivery_available"
            : "approved_for_delivery",
          sender: actor,
          occurredAt,
          idempotencyKey: occurredAt,
        },
      );
      events = nextEnvelope.jobActivityEvents ?? [];
      nextEnvelope = updateJobInEnvelope(nextEnvelope, currentJob, events);

      return {
        ok: true,
        envelope: nextEnvelope,
        job: currentJob,
        feedback,
        updatedCampaign: allowance.didSnapshot ? campaign : undefined,
      };
    }

    default:
      return { ok: false, error: "Unknown action.", status: 400 };
  }
}
