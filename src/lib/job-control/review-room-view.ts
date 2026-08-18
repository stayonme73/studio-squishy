import { feedbackStudio } from "@/config/feedback-studio";
import type { CampaignRecord } from "@/config/studio-board";
import { findProductionPlanLineForJob } from "@/lib/approved-plan-line";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

import { mergeActivityEvents, deriveBaselineActivityEvents } from "./activity-log";
import {
  deriveCorrectionAccounting,
  ensureWriteOnceRevisionAllowance,
  mergeReconstructedCorrectionUses,
  type CorrectionAccountingView,
  type CorrectionUseRecord,
} from "./correction-round-ledger";
import {
  allRequiredDeliverablesPrepared,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import {
  createEmptyJobReviewFeedback,
  ensureFeedbackPackageId,
  type ClientReviewDeliverable,
  type JobReviewFeedback,
} from "./review-feedback-types";
import {
  findLatestStudioReviewRelease,
} from "./review-handoff-receipts";
import {
  projectCustomerUpdateHistory,
  type CustomerUpdateHistoryItem,
} from "./customer-update-history";
import {
  canClientAccessJobReview,
  canClientViewJobReview,
  filterClientVisibleActivity,
} from "./review-room-access";
import {
  canApproveJobForDelivery,
  canRequestJobRevision,
  resolveReviewBlockedReasons,
} from "./review-room-gates";
import type { JobActivityEvent, PurchasedJobRecord } from "./types";
import { isApprovedReviewProofReference } from "@/lib/file-registry/job-files";
import { resolveClientFacingFileHref } from "@/lib/file-storage/routes";

export type ClientReviewView = {
  jobId: string;
  campaignId: string;
  serviceName: string;
  campaignName: string;
  spineStatus: PurchasedJobRecord["spineStatus"];
  deliverables: ClientReviewDeliverable[];
  revisionRoundsIncluded: number;
  revisionRoundsUsed: number;
  revisionRoundsRemaining: number;
  extraCorrectionRemaining: number;
  correctionAccounting: CorrectionAccountingView;
  feedback: JobReviewFeedback;
  /** Prior locked packages for this job — immutable history. */
  lockedFeedbackPackages: readonly JobReviewFeedback[];
  activity: readonly JobActivityEvent[];
  /** UPDATE-HISTORY-1 — customer-safe projection over authoritative job activity. */
  updateHistory: readonly CustomerUpdateHistoryItem[];
  canRequestRevision: boolean;
  canApproveForDelivery: boolean;
  blockedReasons: readonly string[];
  exhaustedWording: string | null;
};

export const CORRECTION_EXHAUSTED_WORDING =
  feedbackStudio.feedbackPanel.revisionLimitNotice;

/** Active editable draft for a job (no submittedAt). */
export function findActiveJobReviewFeedback(
  envelope: ServerTasksEnvelope,
  jobId: string,
): JobReviewFeedback | undefined {
  const drafts = (envelope.jobReviewFeedback ?? [])
    .filter((entry) => entry.jobId === jobId && !entry.submittedAt)
    .map(ensureFeedbackPackageId);
  return drafts.at(-1);
}

/** Locked submitted packages for a job — chronological. */
export function listLockedJobReviewFeedback(
  envelope: ServerTasksEnvelope,
  jobId: string,
): JobReviewFeedback[] {
  return (envelope.jobReviewFeedback ?? [])
    .filter((entry) => entry.jobId === jobId && Boolean(entry.submittedAt))
    .map(ensureFeedbackPackageId)
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
}

/**
 * Active draft when present; otherwise latest locked package (post-submit view).
 * Prefer findActiveJobReviewFeedback / listLockedJobReviewFeedback for C8c cycles.
 */
export function findJobReviewFeedback(
  envelope: ServerTasksEnvelope,
  jobId: string,
): JobReviewFeedback | undefined {
  const active = findActiveJobReviewFeedback(envelope, jobId);
  if (active) return active;
  const locked = listLockedJobReviewFeedback(envelope, jobId);
  return locked.at(-1);
}

export function upsertJobReviewFeedback(
  envelope: ServerTasksEnvelope,
  feedback: JobReviewFeedback,
): ServerTasksEnvelope {
  const normalized = ensureFeedbackPackageId(feedback);
  const existing = envelope.jobReviewFeedback ?? [];
  const index = existing.findIndex(
    (entry) =>
      entry.packageId === normalized.packageId ||
      (!entry.packageId &&
        entry.jobId === normalized.jobId &&
        !entry.submittedAt &&
        !normalized.submittedAt),
  );
  const next =
    index >= 0
      ? existing.map((entry, i) => (i === index ? normalized : entry))
      : [...existing, normalized];

  return {
    ...envelope,
    jobReviewFeedback: next,
    updatedAt: normalized.updatedAt,
  };
}

export function resolveClientReviewView(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  envelope: ServerTasksEnvelope;
  materials?: readonly unknown[];
}): ClientReviewView | null {
  const { campaign: rawCampaign, job } = input;
  let envelope = mergeReconstructedCorrectionUses(
    input.envelope,
    rawCampaign.campaignId,
  );
  const allowance = ensureWriteOnceRevisionAllowance(rawCampaign);
  const campaign = allowance.campaign;

  const existingActive = findActiveJobReviewFeedback(envelope, job.jobId);
  const lockedPackages = listLockedJobReviewFeedback(envelope, job.jobId);
  const existingForAccess = existingActive ?? lockedPackages.at(-1);

  if (!canClientViewJobReview(job, existingForAccess ?? null)) {
    return null;
  }

  const line = findProductionPlanLineForJob(campaign, job);

  const requiredDefs = resolveRequiredDeliverableKeys(line?.deliverables ?? []);
  const deliverables: ClientReviewDeliverable[] = requiredDefs
    .map((def) => {
      const prep = (job.deliverablePrep ?? []).find((entry) => entry.deliverableKey === def.key);
      const proofFiles = (job.fileRegistry ?? [])
        .filter(
          (ref) =>
            isApprovedReviewProofReference(ref) &&
            ref.deliverableKey === def.key,
        )
        .map((ref) => ({
          id: ref.id,
          filename: ref.filename,
          fileType: ref.fileType,
          accessHref:
            resolveClientFacingFileHref({
              registryFileId: ref.id,
              url: ref.storageRef.provider === "google_shared_drive" ? ref.storageRef.reference : undefined,
              storageRef: ref.storageRef,
              purpose: "proof",
            }) || null,
          versionLabel: ref.versionLabel,
          addedAt: ref.addedAt,
        }));
      return {
        key: def.key,
        label: def.label,
        prepared: Boolean(prep?.preparedAt),
        preparedAt: prep?.preparedAt,
        proofFiles,
      };
    })
    .filter((entry) => entry.prepared && entry.proofFiles.length > 0);

  const deliverableKeys = deliverables.map((entry) => entry.key);
  const release = findLatestStudioReviewRelease(
    envelope.jobActivityEvents ?? [],
    job.jobId,
  );

  let feedback: JobReviewFeedback;
  if (existingActive) {
    feedback = existingActive;
  } else if (canClientAccessJobReview(job)) {
    // New review release — present a stable draft identity; prior locked packages stay.
    // Draft is persisted on first save_feedback / formal submit (not on GET).
    feedback = createEmptyJobReviewFeedback(
      campaign.campaignId,
      job.jobId,
      deliverableKeys,
      {
        packageId: `pkg:${job.jobId}:draft:${release?.activityId ?? "open"}`,
        releaseActivityId: release?.activityId ?? null,
      },
    );
  } else {
    feedback =
      lockedPackages.at(-1) ??
      createEmptyJobReviewFeedback(campaign.campaignId, job.jobId, deliverableKeys);
  }

  const correctionAccounting = deriveCorrectionAccounting({
    campaign,
    envelope,
  });

  const requiredDeliverableLabels = line?.deliverables ?? [];
  const allPrepared = allRequiredDeliverablesPrepared(job, requiredDeliverableLabels);

  const blockedReasons = resolveReviewBlockedReasons({
    job,
    feedback,
    allDeliverablesPrepared: allPrepared,
    deliverableCount: deliverables.length,
  });

  const mergedActivity = mergeActivityEvents(
    envelope.jobActivityEvents,
    deriveBaselineActivityEvents(
      campaign,
      [job],
      [],
      envelope.exceptionEvents,
    ),
  );
  const activity = filterClientVisibleActivity(mergedActivity, job.jobId);
  /** UPDATE-HISTORY-1 — project from persisted job activity only (no synthetic baseline). */
  const updateHistory = projectCustomerUpdateHistory(
    envelope.jobActivityEvents ?? [],
    job.jobId,
    { currentSpineStatus: job.spineStatus },
  );

  return {
    jobId: job.jobId,
    campaignId: job.campaignId,
    serviceName: job.serviceName,
    campaignName: campaign.campaignName,
    spineStatus: job.spineStatus,
    deliverables,
    revisionRoundsIncluded: correctionAccounting.included,
    revisionRoundsUsed: correctionAccounting.effectiveUsed,
    revisionRoundsRemaining: correctionAccounting.remaining,
    extraCorrectionRemaining: correctionAccounting.extraRemaining,
    correctionAccounting,
    feedback,
    lockedFeedbackPackages: lockedPackages,
    activity,
    updateHistory,
    canRequestRevision: canRequestJobRevision({
      job,
      feedback,
      revisionRoundsRemaining: correctionAccounting.remaining,
      allDeliverablesPrepared: allPrepared,
    }).allowed,
    canApproveForDelivery: canApproveJobForDelivery({
      job,
      feedback,
      allDeliverablesPrepared: allPrepared,
      deliverableCount: deliverables.length,
    }).allowed,
    blockedReasons,
    exhaustedWording: correctionAccounting.exhausted
      ? CORRECTION_EXHAUSTED_WORDING
      : null,
  };
}

/** Jobs eligible for client Review Room for a campaign. */
export function findReviewReadyJobs(
  jobs: readonly PurchasedJobRecord[],
): PurchasedJobRecord[] {
  return jobs.filter((job) => canClientAccessJobReview(job));
}

export type { CorrectionAccountingView, CorrectionUseRecord };
