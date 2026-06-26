/**
 * Recommendation Engine — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Payment → Campaign Record
 * Import from `@/recommendation` only; do not reach into submodules from UI.
 *
 * Principles (locked): RECOMMENDATION_PRINCIPLES.md · docs/recommendation-not-direction-v1-locked.md
 */

export type {
  DeliverablesSummaryItem,
  DiscoveryBrief,
  DiscoveryBriefAnswers,
  DiscoveryFormTileId,
  EstimatedInvestment,
  EstimatedTimeline,
  InvestmentLineItem,
  MatchedDiscoveryRule,
  RecommendationCatalogInput,
  RecommendationRationale,
  RecommendationReason,
  RecommendationResult,
  RecommendationWarning,
  RecommendationWarningKind,
  ServiceRecommendation,
  TimelineLineItem,
} from "@/recommendation/types";

export {
  matchDiscoveryRule,
  recommendFromDiscovery,
  RECOMMENDATION_ENGINE_VERSION,
} from "@/recommendation/engine";

export {
  DiscoveryBriefValidationError,
  validateDiscoveryBrief,
} from "@/recommendation/validate";
