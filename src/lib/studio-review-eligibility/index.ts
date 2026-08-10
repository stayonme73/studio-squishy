export { studioReviewEligibilityV1 } from "@/config/studio-review-eligibility-v1";
export type { StudioReviewEligibilityOutcome } from "@/config/studio-review-eligibility-v1";

export {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
  isEligibleForReview,
  resolveRequiredQaKinds,
} from "./evaluate";

export {
  evaluateCategoryEvidenceGaps,
  hasCopyGatePassForSku,
  hasDesignGatePassForSku,
  hasKitchenPinnedWorkVersionPass,
  hasLandingPageQaEvidenceForSku,
  isLandingPageSku,
  isMethodCoveredCopySku,
  isMethodCoveredDesignSku,
  isProfileKitSku,
  METHOD_COVERED_COPY_SKUS,
  METHOD_COVERED_DESIGN_SKUS,
} from "./sku-evidence";

export type {
  InternalQaReviewAuthorization,
  ReviewCandidateRef,
  ReviewEligibilityBlockCode,
  ReviewEligibilityDecision,
  ReviewEligibilityQaKind,
} from "./types";
