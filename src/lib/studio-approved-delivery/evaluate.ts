import {
  studioApprovedDeliveryV1,
  type StudioApprovedDeliveryOutcome,
} from "@/config/studio-approved-delivery-v1";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { qaPinMatchesCustomerApproval, setsEqual, sortedUnique } from "./pin";
import type {
  DeliveryCandidateRef,
  DeliveryEligibilityBlockCode,
  DeliveryEligibilityDecision,
  FinalDeliveryAuthorizationRecord,
} from "./types";

function newDecisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ade-${crypto.randomUUID()}`;
  }
  return `ade-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function approvalHasMaterialBinding(approval: {
  workVersionId: string | null;
  contentSha256s: readonly string[];
  artifactIds: readonly string[];
  sourceQaDecisionId: string;
  reviewPackageId: string;
}): boolean {
  // Prefer hash/version/artifact. Package-level identity (QA decision + review package) is
  // accepted only when those are absent — still stronger than filename alone.
  return (
    Boolean(approval.workVersionId?.trim()) ||
    approval.contentSha256s.length > 0 ||
    approval.artifactIds.length > 0 ||
    Boolean(approval.sourceQaDecisionId?.trim() && approval.reviewPackageId?.trim())
  );
}

function collectFileHashes(job: PurchasedJobRecord, candidate?: DeliveryCandidateRef): string[] {
  if (candidate?.fileContentSha256s) {
    return sortedUnique(candidate.fileContentSha256s);
  }
  return sortedUnique(
    (job.clientDeliveryFiles ?? [])
      .map((file) => file.contentSha256?.trim() ?? "")
      .filter(Boolean),
  );
}

function collectFileApprovalIds(
  job: PurchasedJobRecord,
  candidate?: DeliveryCandidateRef,
): string[] {
  if (candidate?.fileApprovalDecisionIds) {
    return sortedUnique(candidate.fileApprovalDecisionIds);
  }
  return sortedUnique(
    (job.clientDeliveryFiles ?? [])
      .map((file) => file.approvedAuthorizationDecisionId?.trim() ?? "")
      .filter(Boolean),
  );
}

function collectFileWorkVersions(job: PurchasedJobRecord): string[] {
  return sortedUnique(
    (job.clientDeliveryFiles ?? [])
      .map((file) => file.approvedWorkVersionId?.trim() ?? "")
      .filter(Boolean),
  );
}

/**
 * Is this exact delivery candidate the exact customer-approved artifact/version
 * and otherwise free of Studio release holds encoded in this check?
 *
 * Release-hold here means: Owner final-release pending gate still required, or
 * explicit hold state (ownerApprovalPending cleared without release, wrong spine).
 * Customer approval never bypasses Owner release authorization.
 */
export function evaluateDeliveryEligibility(input: {
  job: PurchasedJobRecord;
  candidate?: DeliveryCandidateRef;
  /**
   * When true, Owner release hold (before_delivery) is expected and does not block
   * the approval-match portion — callers still use canOwnerFinalRelease separately.
   * When false (download / mark delivered), release hold blocks.
   */
  forOwnerFinalRelease?: boolean;
  evaluatedAt?: string;
  decisionId?: string;
}): DeliveryEligibilityDecision {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const job = input.job;
  const approval = job.customerApprovedArtifactAuthorization;
  const blockCodes: DeliveryEligibilityBlockCode[] = [];
  const reasons: string[] = [];

  const push = (code: DeliveryEligibilityBlockCode, message: string) => {
    if (!blockCodes.includes(code)) blockCodes.push(code);
    reasons.push(message);
  };

  if (!approval || approval.status !== "CUSTOMER_APPROVED") {
    push("no_approval", studioApprovedDeliveryV1.staffCopy.noApproval);
  } else {
    if (approval.jobId !== job.jobId || approval.campaignId !== job.campaignId) {
      push("artifact_mismatch", studioApprovedDeliveryV1.staffCopy.artifactMismatch);
    }
    if (approval.skuId !== job.skuId) {
      push("artifact_mismatch", studioApprovedDeliveryV1.staffCopy.artifactMismatch);
    }

    if (!approvalHasMaterialBinding(approval)) {
      push(
        "hash_mismatch",
        "Exact approved binding cannot be proven — approval pin lacks version, artifact, and hash identity.",
      );
    }

    const qa = job.internalQaReviewAuthorization;
    if (!qaPinMatchesCustomerApproval(approval, qa)) {
      if (!qa) {
        push("superseded", studioApprovedDeliveryV1.staffCopy.superseded);
      } else if ((qa.workVersionId ?? null) !== (approval.workVersionId ?? null)) {
        push("version_mismatch", studioApprovedDeliveryV1.staffCopy.versionMismatch);
      } else if (!setsEqual(qa.contentSha256s, approval.contentSha256s)) {
        push("hash_mismatch", studioApprovedDeliveryV1.staffCopy.hashMismatch);
      } else if (!setsEqual(qa.artifactIds, approval.artifactIds)) {
        push("artifact_mismatch", studioApprovedDeliveryV1.staffCopy.artifactMismatch);
      } else {
        push("superseded", studioApprovedDeliveryV1.staffCopy.superseded);
      }
    }

    const candidate = input.candidate;
    if (candidate) {
      if (
        candidate.workVersionId !== undefined &&
        (candidate.workVersionId ?? null) !== (approval.workVersionId ?? null)
      ) {
        push("version_mismatch", studioApprovedDeliveryV1.staffCopy.versionMismatch);
      }
      if (
        candidate.artifactIds &&
        !setsEqual(candidate.artifactIds, approval.artifactIds)
      ) {
        push("artifact_mismatch", studioApprovedDeliveryV1.staffCopy.artifactMismatch);
      }
      if (
        candidate.contentSha256s &&
        !setsEqual(candidate.contentSha256s, approval.contentSha256s)
      ) {
        push("hash_mismatch", studioApprovedDeliveryV1.staffCopy.hashMismatch);
      }
    }

    const files = job.clientDeliveryFiles ?? [];
    if (files.length > 0) {
      const fileHashes = collectFileHashes(job, candidate);
      const fileApprovalIds = collectFileApprovalIds(job, candidate);
      const fileVersions = collectFileWorkVersions(job);

      if (approval.contentSha256s.length > 0) {
        const unbound = files.filter((file) => {
          const hash = file.contentSha256?.trim();
          return !hash || !approval.contentSha256s.includes(hash);
        });
        if (unbound.length > 0) {
          push(
            unbound.length === files.length ? "unbound_final_file" : "multi_deliverable_mismatch",
            unbound.length === files.length
              ? studioApprovedDeliveryV1.staffCopy.unboundFinalFile
              : studioApprovedDeliveryV1.staffCopy.multiDeliverableMismatch,
          );
        }
        if (fileHashes.length > 0 && !fileHashes.every((hash) => approval.contentSha256s.includes(hash))) {
          push("hash_mismatch", studioApprovedDeliveryV1.staffCopy.hashMismatch);
        }
      } else if (approval.workVersionId) {
        const unbound = files.filter(
          (file) => file.approvedWorkVersionId?.trim() !== approval.workVersionId,
        );
        if (unbound.length > 0) {
          push(
            unbound.length < files.length
              ? "multi_deliverable_mismatch"
              : "version_mismatch",
            unbound.length < files.length
              ? studioApprovedDeliveryV1.staffCopy.multiDeliverableMismatch
              : studioApprovedDeliveryV1.staffCopy.versionMismatch,
          );
        }
        if (
          fileVersions.length > 0 &&
          !fileVersions.every((version) => version === approval.workVersionId)
        ) {
          push("version_mismatch", studioApprovedDeliveryV1.staffCopy.versionMismatch);
        }
      } else if (approval.artifactIds.length > 0) {
        const unbound = files.filter((file) => {
          const artifactId = file.artifactId?.trim();
          return !artifactId || !approval.artifactIds.includes(artifactId);
        });
        if (unbound.length > 0) {
          push(
            unbound.length < files.length
              ? "multi_deliverable_mismatch"
              : "artifact_mismatch",
            unbound.length < files.length
              ? studioApprovedDeliveryV1.staffCopy.multiDeliverableMismatch
              : studioApprovedDeliveryV1.staffCopy.artifactMismatch,
          );
        }
      } else {
        // Package-level approval: every final file must carry this approval decision id.
        const unbound = files.filter(
          (file) => file.approvedAuthorizationDecisionId?.trim() !== approval.decisionId,
        );
        if (unbound.length > 0) {
          push(
            unbound.length < files.length
              ? "multi_deliverable_mismatch"
              : "unbound_final_file",
            unbound.length < files.length
              ? studioApprovedDeliveryV1.staffCopy.multiDeliverableMismatch
              : studioApprovedDeliveryV1.staffCopy.unboundFinalFile,
          );
        }
      }

      // Package stamp must not point at a different approval when present.
      if (
        fileApprovalIds.length > 0 &&
        !fileApprovalIds.every((id) => id === approval.decisionId)
      ) {
        push("artifact_mismatch", studioApprovedDeliveryV1.staffCopy.artifactMismatch);
      }
    }
  }

  // Studio release authorization remains independent of customer creative approval.
  if (!input.forOwnerFinalRelease) {
    const released =
      job.spineStatus === "ready_for_delivery" || job.spineStatus === "delivered";
    if (!released || job.ownerApprovalPending === "before_delivery") {
      push("release_hold", studioApprovedDeliveryV1.staffCopy.releaseHold);
    }
  }

  let outcome: StudioApprovedDeliveryOutcome =
    studioApprovedDeliveryV1.outcomes.eligibleForDelivery;
  if (blockCodes.length === 0) {
    outcome = studioApprovedDeliveryV1.outcomes.eligibleForDelivery;
  } else if (blockCodes.includes("no_approval")) {
    outcome = studioApprovedDeliveryV1.outcomes.blockedNoApproval;
  } else if (
    blockCodes.includes("release_hold") &&
    blockCodes.every((code) => code === "release_hold")
  ) {
    outcome = studioApprovedDeliveryV1.outcomes.blockedReleaseHold;
  } else if (
    blockCodes.some(
      (code) => code !== "release_hold" && code !== "no_approval",
    )
  ) {
    outcome = studioApprovedDeliveryV1.outcomes.blockedApprovalMismatch;
  } else {
    outcome = studioApprovedDeliveryV1.outcomes.blockedReleaseHold;
  }

  const eligible =
    outcome === studioApprovedDeliveryV1.outcomes.eligibleForDelivery;

  return {
    decisionId: input.decisionId ?? newDecisionId(),
    schemaVersion: studioApprovedDeliveryV1.decisionSchemaVersion,
    packageId: studioApprovedDeliveryV1.packageId,
    outcome,
    jobId: job.jobId,
    campaignId: job.campaignId,
    skuId: job.skuId,
    approvedAuthorizationDecisionId: approval?.decisionId ?? null,
    workVersionId: approval?.workVersionId ?? null,
    contentSha256s: approval ? [...approval.contentSha256s] : [],
    artifactIds: approval ? [...approval.artifactIds] : [],
    blockCodes,
    reasons,
    escalationTarget: "none",
    customerMessage: eligible
      ? null
      : studioApprovedDeliveryV1.customerCopy.preparingDelivery,
    evaluatedAt,
  };
}

export function isEligibleForDelivery(decision: DeliveryEligibilityDecision): boolean {
  return decision.outcome === studioApprovedDeliveryV1.outcomes.eligibleForDelivery;
}

/** Match-only check used at Owner final release (release hold handled by Owner gate). */
export function evaluateApprovalMatchForRelease(input: {
  job: PurchasedJobRecord;
  candidate?: DeliveryCandidateRef;
  evaluatedAt?: string;
}): DeliveryEligibilityDecision {
  return evaluateDeliveryEligibility({
    ...input,
    forOwnerFinalRelease: true,
  });
}

export function buildFinalDeliveryAuthorizationRecord(input: {
  job: PurchasedJobRecord;
  deliveredAt?: string;
  deliveryId?: string;
}): FinalDeliveryAuthorizationRecord | null {
  const approval = input.job.customerApprovedArtifactAuthorization;
  if (!approval || approval.status !== "CUSTOMER_APPROVED") return null;

  const deliveredAt = input.deliveredAt ?? new Date().toISOString();
  const clientDeliveryFileIds = (input.job.clientDeliveryFiles ?? []).map((file) => file.id);

  return {
    status: "DELIVERED",
    deliveryId:
      input.deliveryId ??
      `del:${input.job.jobId}:${approval.decisionId}:${deliveredAt}`,
    approvedAuthorizationDecisionId: approval.decisionId,
    workVersionId: approval.workVersionId,
    contentSha256s: [...approval.contentSha256s],
    artifactIds: [...approval.artifactIds],
    clientDeliveryFileIds,
    reviewPackageId: approval.reviewPackageId,
    sourceQaDecisionId: approval.sourceQaDecisionId,
    deliveredAt,
    packageId: studioApprovedDeliveryV1.packageId,
  };
}

/**
 * Bind CDF rows to the customer approval pin.
 * Stamps decision + work version only — content hashes/artifacts must be set per file
 * when the approval pin carries them (never invent a shared hash across deliverables).
 */
export function stampClientDeliveryFilesWithApproval(
  job: PurchasedJobRecord,
): PurchasedJobRecord {
  const approval = job.customerApprovedArtifactAuthorization;
  if (!approval) return job;

  const clientDeliveryFiles = (job.clientDeliveryFiles ?? []).map((file) => ({
    ...file,
    approvedAuthorizationDecisionId:
      file.approvedAuthorizationDecisionId ?? approval.decisionId,
    approvedWorkVersionId:
      file.approvedWorkVersionId ?? approval.workVersionId ?? undefined,
  }));

  return { ...job, clientDeliveryFiles };
}
