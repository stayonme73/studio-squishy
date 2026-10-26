import type { studioCopyReviewBindV1 } from "@/config/studio-copy-review-bind-v1";
import type { PasteReadyCopyFile } from "@/lib/studio-copy-kit-light-harden/paste-ready-export";
import type { CopyQualityEvidence } from "@/lib/studio-kitchen-production/copy-quality";

export type CopyReviewSetStatus =
  | "individual_ready"
  | "partial_set"
  | "complete_reviewable_set"
  | "not_reviewable";

export type CopyReviewMemberKind = "email" | "sms";

export type CopyReviewProofMember = {
  memberId: string;
  memberKind: CopyReviewMemberKind;
  customerFormatLabel: string;
  subject?: string;
  previewText?: string;
  body: string;
  cta?: string;
  pieceContentSha256: string;
  requiredForSet: boolean;
};

export type CopyReviewArtifactContract = {
  packageId: typeof studioCopyReviewBindV1.packageId;
  campaignId: string;
  jobId: string;
  skuId: string;
  serviceName: string;
  renderVersion: number;
  workVersionId: string;
  artifactRelativePath: string;
  copySha256: string;
  factsFingerprint?: string;
  members: readonly CopyReviewProofMember[];
  requiredMemberCount: number;
  setStatus: CopyReviewSetStatus;
  observerOk: boolean;
  copyQualityEvidence?: CopyQualityEvidence;
  pasteReadyFiles?: readonly PasteReadyCopyFile[];
};

export type CopyReviewAuthorizeBlock =
  | "hold_sku"
  | "missing_artifact"
  | "corrupt_artifact"
  | "qa_does_not_authorize"
  | "hash_mismatch"
  | "stale_or_superseded"
  | "partial_required_set"
  | "job_not_review_eligible"
  | "observer_not_ok"
  | "customer_facing_leak"
  | "unsupported_claim"
  | "invented_or_missing_fact";

export type CopyReviewAuthorizeResult =
  | {
      ok: true;
      contract: CopyReviewArtifactContract;
      authorizedHashes: readonly string[];
    }
  | {
      ok: false;
      block: CopyReviewAuthorizeBlock;
      message: string;
      contract: CopyReviewArtifactContract;
    };
