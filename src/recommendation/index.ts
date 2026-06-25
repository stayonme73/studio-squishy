/**
 * Recommendation Engine — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Payment → Campaign Record
 * Import from `@/recommendation` only; do not reach into submodules from UI.
 */

export type {
  DeliverablesSummaryItem,
  DiscoveryBrief,
  DiscoveryBriefAnswers,
  DiscoveryFormTileId,
  MatchedDiscoveryRule,
  PricingSummary,
  PricingSummaryItem,
  RecommendationCatalogInput,
  RecommendationRationale,
  RecommendationResult,
  ServiceRecommendation,
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
