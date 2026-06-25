/**
 * Recommendation Engine — schema types.
 * Discovery brief in, ranked service recommendations out.
 * UI and campaign flows consume RecommendationResult — they do not re-score services.
 */

import type {
  DiscoveryMappingRule,
  DiscoverySignalKind,
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

/** Why a service was recommended — one entry per matched discovery rule. */
export type RecommendationReason = {
  signal: DiscoverySignalKind;
  value: string;
  weight: number;
  /** Internal explanation — not customer-facing copy. */
  detail: string;
};

/** One ranked service candidate from the engine. */
export type ServiceRecommendation = {
  serviceId: ServiceId;
  score: number;
  matchedRules: readonly MatchedDiscoveryRule[];
  reasons: readonly RecommendationReason[];
  rank: number;
};

/** Internal aggregate rationale — not customer-facing copy. */
export type RecommendationRationale = {
  summary: string;
  matchedSignals: readonly string[];
};

export type DeliverablesSummaryItem = {
  serviceId: ServiceId;
  deliverables: readonly ServiceDeliverable[];
  totalQuantity: number;
};

export type InvestmentLineItem = {
  serviceId: ServiceId;
  display: string;
  amountUsd: number;
  billing: ServiceBillingModel;
};

/** Aggregated pricing across recommended services. */
export type EstimatedInvestment = {
  items: readonly InvestmentLineItem[];
  totalAmountUsd: number;
  /** True when any recommended service has quoted or unknown pricing. */
  hasQuotedItems: boolean;
};

export type TimelineLineItem = {
  serviceId: ServiceId;
  customerLabel: string;
  businessDays: number;
};

/** Production timeline aggregated from recommended services. */
export type EstimatedTimeline = {
  items: readonly TimelineLineItem[];
  /** Longest business-day estimate across recommended services. */
  totalBusinessDays: number;
  /** Label from the service driving the longest timeline (ties broken by serviceId). */
  customerLabel: string;
};

export type RecommendationWarningKind =
  | "missing-discovery-answer"
  | "inactive-service-match"
  | "unmet-dependency"
  | "low-confidence-match"
  | "no-recommendations";

export type RecommendationWarning = {
  kind: RecommendationWarningKind;
  message: string;
  serviceId?: ServiceId;
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
  estimatedInvestment: EstimatedInvestment;
  estimatedTimeline: EstimatedTimeline;
  warnings: readonly RecommendationWarning[];
  /** True when human review is advised before checkout or campaign start. */
  requiresApproval: boolean;
  generatedAt: string;
  engineVersion: string;
};

/** Optional catalog override for tests — defaults to active services via accessors. */
export type RecommendationCatalogInput = readonly ServiceCatalogEntry[];
