import { studioApprovedDeliveryV1 } from "@/config/studio-approved-delivery-v1";
import type { InternalQaReviewAuthorization } from "@/lib/studio-review-eligibility";
import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import type { CustomerApprovedArtifactAuthorization } from "./types";

function newDecisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `caa-${crypto.randomUUID()}`;
  }
  return `caa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type BuildCustomerApprovalPinResult =
  | { ok: true; authorization: CustomerApprovedArtifactAuthorization }
  | { ok: false; error: string };

/**
 * Write-once pin of the exact Review candidate the customer approved.
 * Requires an internal QA Review authorization — approval must not bind an unpinned package.
 */
export function buildCustomerApprovedArtifactAuthorization(input: {
  job: PurchasedJobRecord;
  feedback: Pick<JobReviewFeedback, "packageId" | "releaseActivityId" | "submissionType">;
  qaAuthorization?: InternalQaReviewAuthorization | null;
  approvedAt?: string;
  decisionId?: string;
}): BuildCustomerApprovalPinResult {
  const qa = input.qaAuthorization ?? input.job.internalQaReviewAuthorization;
  if (!qa || qa.status !== "ELIGIBLE_FOR_REVIEW") {
    return {
      ok: false,
      error: studioApprovedDeliveryV1.staffCopy.missingQaPin,
    };
  }

  const reviewPackageId = input.feedback.packageId?.trim();
  if (!reviewPackageId) {
    return {
      ok: false,
      error: "Customer approval requires a durable Review feedback package identity.",
    };
  }

  const approvedAt = input.approvedAt ?? new Date().toISOString();

  return {
    ok: true,
    authorization: {
      status: "CUSTOMER_APPROVED",
      decisionId: input.decisionId ?? newDecisionId(),
      schemaVersion: studioApprovedDeliveryV1.decisionSchemaVersion,
      packageId: studioApprovedDeliveryV1.packageId,
      jobId: input.job.jobId,
      campaignId: input.job.campaignId,
      skuId: input.job.skuId,
      workVersionId: qa.workVersionId,
      artifactIds: [...qa.artifactIds],
      contentSha256s: [...qa.contentSha256s],
      qaRecordIds: [...qa.qaRecordIds],
      reviewPackageId,
      releaseActivityId: input.feedback.releaseActivityId ?? null,
      approvedAt,
      feedbackSubmissionType: "approved_for_delivery",
      sourceQaDecisionId: qa.decisionId,
    },
  };
}

export function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function setsEqual(a: readonly string[], b: readonly string[]): boolean {
  const left = sortedUnique(a);
  const right = sortedUnique(b);
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

/** Material identity still matches the pinned approval (QA pin not silently replaced). */
export function qaPinMatchesCustomerApproval(
  approval: CustomerApprovedArtifactAuthorization,
  qa: InternalQaReviewAuthorization | null | undefined,
): boolean {
  if (!qa || qa.status !== "ELIGIBLE_FOR_REVIEW") return false;
  if (qa.skuId !== approval.skuId) return false;
  if ((qa.workVersionId ?? null) !== (approval.workVersionId ?? null)) return false;
  if (!setsEqual(qa.contentSha256s, approval.contentSha256s)) return false;
  if (!setsEqual(qa.artifactIds, approval.artifactIds)) return false;
  if (approval.sourceQaDecisionId && qa.decisionId !== approval.sourceQaDecisionId) {
    return false;
  }
  return true;
}
