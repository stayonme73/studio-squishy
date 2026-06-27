import type { ServiceId } from "@/catalog/types";
import type { RecommendationResult } from "@/recommendation/types";

/** All ranked service IDs from the engine — not limited by production allocation. */
export function getRecommendedServiceIds(result: RecommendationResult): ServiceId[] {
  return result.recommendations.map((entry) => entry.serviceId);
}
