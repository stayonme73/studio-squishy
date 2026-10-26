import type { studioGeneralDesignReviewBindV1 } from "@/config/studio-general-design-review-bind-v1";

export type GeneralDesignReviewSetStatus =
  | "individual_ready"
  | "partial_set"
  | "complete_reviewable_set"
  | "not_reviewable";

export type GeneralDesignReviewMemberId =
  | "square"
  | "portrait"
  | "front"
  | "back"
  | "post-1"
  | "post-2"
  | "post-3"
  | "post-4"
  | "menu"
  | "service-sheet";

export type GeneralDesignReviewProofMember = {
  memberId: GeneralDesignReviewMemberId;
  customerFormatLabel: string;
  mimeType: "image/png";
  widthPx: number;
  heightPx: number;
  pngRelativePath: string;
  pngContentSha256: string;
  pdfRelativePath?: string;
  pdfContentSha256?: string;
  requiredForSet: boolean;
};

export type GeneralDesignReviewArtifactContract = {
  packageId: typeof studioGeneralDesignReviewBindV1.packageId;
  campaignId: string;
  jobId: string;
  skuId: string;
  serviceName: string;
  renderVersion: number;
  workVersionId: string;
  members: readonly GeneralDesignReviewProofMember[];
  requiredMemberCount: number;
  setStatus: GeneralDesignReviewSetStatus;
  observerOk: boolean;
  captionTextRelativePath?: string;
  captionTextSha256?: string;
  postingOrderTextRelativePath?: string;
  postingOrderTextSha256?: string;
};

export type GeneralDesignReviewAuthorizeBlock =
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
  | "unsupported_plate";

export type GeneralDesignReviewAuthorizeResult =
  | {
      ok: true;
      contract: GeneralDesignReviewArtifactContract;
      authorizedHashes: readonly string[];
    }
  | {
      ok: false;
      block: GeneralDesignReviewAuthorizeBlock;
      message: string;
      contract: GeneralDesignReviewArtifactContract;
    };
