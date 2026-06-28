import type { ServiceId } from "@/catalog/types";
import type { RecommendationResult } from "@/recommendation/types";

/** Auto-selected service IDs — foundation trio for starting fresh; all recommendations otherwise. */
export function getRecommendedServiceIds(result: RecommendationResult): ServiceId[] {
  return result.recommendations.map((entry) => entry.serviceId);
}

/** Consider-next service IDs — conditional greens for starting fresh; empty otherwise. */
export function getConsiderNextServiceIds(result: RecommendationResult): ServiceId[] {
  return result.considerNextRecommendations.map((entry) => entry.serviceId);
}
