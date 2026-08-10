import type { StudioApprovedDeliveryOutcome } from "@/config/studio-approved-delivery-v1";

export type DeliveryEligibilityBlockCode =
  | "no_approval"
  | "missing_qa_pin"
  | "version_mismatch"
  | "artifact_mismatch"
  | "hash_mismatch"
  | "superseded"
  | "release_hold"
  | "unbound_final_file"
  | "multi_deliverable_mismatch";

/**
 * Durable pin of the exact thing the customer approved.
 * Copied from internal QA Review authorization + locked feedback package.
 */
export type CustomerApprovedArtifactAuthorization = {
  status: "CUSTOMER_APPROVED";
  decisionId: string;
  schemaVersion: number;
  packageId: string;
  jobId: string;
  campaignId: string;
  skuId: string;
  workVersionId: string | null;
  artifactIds: readonly string[];
  contentSha256s: readonly string[];
  qaRecordIds: readonly string[];
  reviewPackageId: string;
  releaseActivityId: string | null;
  approvedAt: string;
  feedbackSubmissionType: "approved_for_delivery";
  /** Internal QA decision that authorized the Review package the customer approved. */
  sourceQaDecisionId: string;
};

/** Candidate presented for Owner release / client download / mark delivered. */
export type DeliveryCandidateRef = {
  workVersionId?: string | null;
  artifactIds?: readonly string[];
  contentSha256s?: readonly string[];
  /** Final file ids being released/delivered. */
  clientDeliveryFileIds?: readonly string[];
  /** Per-file bound hashes (when available on CDF). */
  fileContentSha256s?: readonly string[];
  /** Per-file stamp linking CDF to approval decision. */
  fileApprovalDecisionIds?: readonly string[];
};

export type DeliveryEligibilityDecision = {
  decisionId: string;
  schemaVersion: number;
  packageId: string;
  outcome: StudioApprovedDeliveryOutcome;
  jobId: string;
  campaignId: string;
  skuId: string;
  approvedAuthorizationDecisionId: string | null;
  workVersionId: string | null;
  contentSha256s: readonly string[];
  artifactIds: readonly string[];
  blockCodes: readonly DeliveryEligibilityBlockCode[];
  reasons: readonly string[];
  escalationTarget: "none";
  customerMessage: string | null;
  evaluatedAt: string;
};

/** Bound at mark_delivered — reconstruct approval → delivered artifact. */
export type FinalDeliveryAuthorizationRecord = {
  status: "DELIVERED";
  deliveryId: string;
  approvedAuthorizationDecisionId: string;
  workVersionId: string | null;
  contentSha256s: readonly string[];
  artifactIds: readonly string[];
  clientDeliveryFileIds: readonly string[];
  /** Review package the customer approved (package-level identity). */
  reviewPackageId: string;
  sourceQaDecisionId: string;
  deliveredAt: string;
  packageId: string;
};
