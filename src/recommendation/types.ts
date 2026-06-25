/**
 * Recommendation Engine — schema types.
 * Discovery brief in, ranked service recommendations out.
 * UI and campaign flows consume RecommendationResult — they do not re-score services.
 */

import type {
  DiscoveryMappingRule,
  ServiceBillingModel,
  ServiceCatalogEntry,
  ServiceDeliverable,
  ServiceId,
  StudioNeedId,
} from "@/catalog/types";
import type { DiscoveryTileId } from "@/config/business-discovery-studio";

/** Discovery prompt tiles that collect answers (excludes submit). */
export type DiscoveryFormTileId = Exclude<DiscoveryTileId, "submit-project">;

/**
 * Raw tile answers keyed by discovery prompt ID.
 * Values are normalized strings — multiselect tiles use comma-separated labels.
 */
export type DiscoveryBriefAnswers = Partial<Record<DiscoveryFormTileId, string>>;

/**
 * Discovery brief passed to the Recommendation Engine.
 * Answers mirror Business Discovery Studio tile state — config types only, no UI imports.
 */
export type DiscoveryBrief = {
  answers: DiscoveryBriefAnswers;
  /** Explicit outcome needs when collected outside tile answers. */
  selectedNeeds?: readonly StudioNeedId[];
};

/** A catalog discovery rule that matched against the brief. */
export type MatchedDiscoveryRule = {
  serviceId: ServiceId;
  rule: DiscoveryMappingRule;
  /** What in the brief triggered the match — for rationale and debugging. */
  matchedValue: string;
};

/** One ranked service candidate from the engine. */
export type ServiceRecommendation = {
  serviceId: ServiceId;
  score: number;
  matchedRules: readonly MatchedDiscoveryRule[];
  rank: number;
};

/** Internal rationale for ranking — not customer-facing copy. */
export type RecommendationRationale = {
  summary: string;
  matchedSignals: readonly string[];
};

export type DeliverablesSummaryItem = {
  serviceId: ServiceId;
  deliverables: readonly ServiceDeliverable[];
  totalQuantity: number;
};

export type PricingSummaryItem = {
  serviceId: ServiceId;
  display: string;
  amountUsd: number;
  billing: ServiceBillingModel;
};

/** Aggregated pricing across recommended services. */
export type PricingSummary = {
  items: readonly PricingSummaryItem[];
  totalAmountUsd: number;
};

/**
 * Approved recommendation object produced by the engine.
 * Downstream pages (Discovery Summary, Payment, Campaign Record) read this — they do not re-score.
 */
export type RecommendationResult = {
  brief: DiscoveryBrief;
  recommendations: readonly ServiceRecommendation[];
  /** Highest-ranked service with a positive score, if any. */
  primaryServiceId: ServiceId | null;
  rationale: RecommendationRationale;
  deliverablesSummary: readonly DeliverablesSummaryItem[];
  pricingSummary: PricingSummary;
  generatedAt: string;
  engineVersion: string;
};

/** Optional catalog override for tests — defaults to active services via accessors. */
export type RecommendationCatalogInput = readonly ServiceCatalogEntry[];
