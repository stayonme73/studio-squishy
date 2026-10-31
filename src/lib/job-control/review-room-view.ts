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
  resolveRequiredDeliverableKeys,
  reviewDeliverableSetPrepared,
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
import {
  customerFacingReviewTextLeaks,
  isGeneralDesignReviewDeliverableKey,
} from "@/lib/studio-general-design-review-bind/customer-facing";
import {
  customerFacingCopyReviewTextLeaks,
  isCopyReviewDeliverableKey,
} from "@/lib/studio-copy-review-bind/customer-facing";

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
  /** Asked for and not yet received — the round is not spent yet. */
  revisionInFlight: boolean;
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

/** Feedback that decides read-only Review access — shared by the view and the proof file route. */
export function findReviewAccessFeedback(
  envelope: ServerTasksEnvelope,
  jobId: string,
): JobReviewFeedback | null {
  return (
    findActiveJobReviewFeedback(envelope, jobId) ??
    listLockedJobReviewFeedback(envelope, jobId).at(-1) ??
    null
  );
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

  if (!canClientViewJobReview(job, findReviewAccessFeedback(envelope, job.jobId))) {
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

  const frozenKeys = new Set(deliverables.map((entry) => entry.key));
  const generalDesignProofs = (job.fileRegistry ?? []).filter(
    (ref) =>
      isApprovedReviewProofReference(ref) &&
      isGeneralDesignReviewDeliverableKey(ref.deliverableKey) &&
      !frozenKeys.has(ref.deliverableKey ?? ""),
  );
  const generalByKey = new Map<string, typeof generalDesignProofs>();
  for (const ref of generalDesignProofs) {
    const key = ref.deliverableKey!;
    const list = generalByKey.get(key) ?? [];
    list.push(ref);
    generalByKey.set(key, list);
  }
  for (const [key, refs] of generalByKey) {
    const leak = customerFacingReviewTextLeaks(
      `${refs[0]?.deliverableLabel ?? ""} ${refs.map((item) => item.filename).join(" ")}`,
    );
    if (leak) continue;
    const prep = (job.deliverablePrep ?? []).find((entry) => entry.deliverableKey === key);
    if (!prep?.preparedAt) continue;
    deliverables.push({
      key,
      label: refs[0]?.deliverableLabel || "Design proof",
      prepared: true,
      preparedAt: prep.preparedAt,
      proofFiles: refs.map((ref) => ({
        id: ref.id,
        filename: ref.filename,
        fileType: ref.fileType,
        accessHref:
          resolveClientFacingFileHref({
            registryFileId: ref.id,
            url:
              ref.storageRef.provider === "google_shared_drive"
                ? ref.storageRef.reference
                : undefined,
            storageRef: ref.storageRef,
            purpose: "proof",
          }) || null,
        versionLabel: ref.versionLabel,
        addedAt: ref.addedAt,
      })),
    });
  }

  const copyProofs = (job.fileRegistry ?? []).filter(
    (ref) =>
      isApprovedReviewProofReference(ref) &&
      isCopyReviewDeliverableKey(ref.deliverableKey) &&
      !frozenKeys.has(ref.deliverableKey ?? "") &&
      !deliverables.some((entry) => entry.key === ref.deliverableKey),
  );
  const copyByKey = new Map<string, typeof copyProofs>();
  for (const ref of copyProofs) {
    const key = ref.deliverableKey!;
    const list = copyByKey.get(key) ?? [];
    list.push(ref);
    copyByKey.set(key, list);
  }
  for (const [key, refs] of copyByKey) {
    const leak = customerFacingCopyReviewTextLeaks(
      `${refs[0]?.deliverableLabel ?? ""} ${refs.map((item) => item.filename).join(" ")}`,
    );
    if (leak) continue;
    const prep = (job.deliverablePrep ?? []).find((entry) => entry.deliverableKey === key);
    if (!prep?.preparedAt) continue;
    deliverables.push({
      key,
      label: refs[0]?.deliverableLabel || "Copy",
      prepared: true,
      preparedAt: prep.preparedAt,
      proofFiles: refs.map((ref) => ({
        id: ref.id,
        filename: ref.filename,
        fileType: ref.fileType,
        accessHref:
          resolveClientFacingFileHref({
            registryFileId: ref.id,
            url:
              ref.storageRef.provider === "google_shared_drive"
                ? ref.storageRef.reference
                : undefined,
            storageRef: ref.storageRef,
            purpose: "proof",
          }) || null,
        versionLabel: ref.versionLabel,
        addedAt: ref.addedAt,
      })),
    });
  }

  // Condensed / launch-menu jobs may have Machine review proof + prep without plan-line deliverable labels.
  if (deliverables.length === 0) {
    for (const prep of job.deliverablePrep ?? []) {
      if (!prep.preparedAt || !prep.deliverableKey) continue;
      const refs = (job.fileRegistry ?? []).filter(
        (ref) =>
          isApprovedReviewProofReference(ref) &&
          ref.deliverableKey === prep.deliverableKey,
      );
      if (refs.length === 0) continue;
      deliverables.push({
        key: prep.deliverableKey,
        label: prep.label,
        prepared: true,
        preparedAt: prep.preparedAt,
        proofFiles: refs.map((ref) => ({
          id: ref.id,
          filename: ref.filename,
          fileType: ref.fileType,
          accessHref:
            resolveClientFacingFileHref({
              registryFileId: ref.id,
              url:
                ref.storageRef.provider === "google_shared_drive"
                  ? ref.storageRef.reference
                  : undefined,
              storageRef: ref.storageRef,
              purpose: "proof",
            }) || null,
          versionLabel: ref.versionLabel,
          addedAt: ref.addedAt,
        })),
      });
    }
  }

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
  const allPrepared = reviewDeliverableSetPrepared(job, requiredDeliverableLabels);

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

  const revisionInFlight = correctionAccounting.pending.some(
    (row) => row.jobId === job.jobId,
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
      revisionInFlight,
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
    revisionInFlight,
  };
}

/** Jobs eligible for client Review Room for a campaign. */
export function findReviewReadyJobs(
  jobs: readonly PurchasedJobRecord[],
): PurchasedJobRecord[] {
  return jobs.filter((job) => canClientAccessJobReview(job));
}

export type { CorrectionAccountingView, CorrectionUseRecord };
