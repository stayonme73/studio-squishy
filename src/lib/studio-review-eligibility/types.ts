import type { StudioReviewEligibilityOutcome } from "@/config/studio-review-eligibility-v1";

export type ReviewEligibilityBlockCode =
  | "missing_qa"
  | "qa_failed"
  | "stale_qa"
  | "wrong_artifact"
  | "wrong_version"
  | "wrong_hash"
  | "superseded"
  | "missing_tasks"
  | "video_render_without_qa"
  | "family_gate_missing";

export type ReviewCandidateRef = {
  artifactId?: string;
  workVersionId?: string;
  contentSha256?: string;
  scriptVersionId?: string;
};

export type ReviewEligibilityQaKind =
  | "copy"
  | "design"
  | "audio"
  | "video"
  | "task_qa_pass";

export type ReviewEligibilityDecision = {
  decisionId: string;
  schemaVersion: number;
  packageId: string;
  outcome: StudioReviewEligibilityOutcome;
  jobId: string;
  campaignId: string;
  skuId: string;
  requiredQaKinds: readonly ReviewEligibilityQaKind[];
  qaRecordIds: readonly string[];
  workVersionId: string | null;
  contentSha256s: readonly string[];
  artifactIds: readonly string[];
  blockCodes: readonly ReviewEligibilityBlockCode[];
  reasons: readonly string[];
  /** Routine QA correction never escalates Owner. */
  escalationTarget: "none";
  customerMessage: string | null;
  evaluatedAt: string;
};

/** Write-once pin stored on PurchasedJobRecord when Review opens. */
export type InternalQaReviewAuthorization = {
  status: "ELIGIBLE_FOR_REVIEW";
  decisionId: string;
  packageId: string;
  skuId: string;
  qaRecordIds: readonly string[];
  workVersionId: string | null;
  contentSha256s: readonly string[];
  artifactIds: readonly string[];
  authorizedAt: string;
};
