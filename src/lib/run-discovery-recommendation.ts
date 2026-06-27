import { buildDiscoverySummary } from "@/discovery-summary/buildDiscoverySummary";
import type { DiscoverySummaryModel } from "@/discovery-summary/types";
import { buildDiscoveryBrief } from "@/lib/discovery-brief";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import { recommendFromDiscovery } from "@/recommendation/engine";
import type { DiscoveryBrief, RecommendationResult } from "@/recommendation/types";

export type DiscoveryRecommendationPipeline = {
  brief: DiscoveryBrief;
  recommendation: RecommendationResult;
  summary: DiscoverySummaryModel;
};

/** answers → brief → recommendFromDiscovery → buildDiscoverySummary */
export function runDiscoveryRecommendation(
  answers: DiscoveryAnswers,
): DiscoveryRecommendationPipeline {
  const brief = buildDiscoveryBrief(answers);
  const recommendation = recommendFromDiscovery(brief);
  const summary = buildDiscoverySummary(recommendation);
  return { brief, recommendation, summary };
}
