/**
 * Discovery Summary — view-model types.
 * Customer-facing presentation of RecommendationResult — no scoring or catalog rules here.
 */

import type { ServiceBillingModel, ServiceId } from "@/catalog/types";
import type { RecommendationWarningKind } from "@/recommendation/types";

export type DiscoverySummaryDeliverable = {
  label: string;
  quantity: number;
};

export type DiscoverySummaryInvestment = {
  display: string;
  amountUsd: number;
  billing: ServiceBillingModel;
};

export type DiscoverySummaryServiceItem = {
  serviceId: ServiceId;
  rank: number;
  title: string;
  explanation: string;
  deliverables: readonly DiscoverySummaryDeliverable[];
  investment: DiscoverySummaryInvestment;
  timelineLabel: string;
};

export type DiscoverySummaryTotalInvestment = {
  display: string;
  amountUsd: number;
  hasQuotedItems: boolean;
};

export type DiscoverySummaryTimeline = {
  customerLabel: string;
  totalBusinessDays: number;
};

export type DiscoverySummaryNextStep = {
  headline: string;
  body: string;
  actionLabel: string;
};

export type DiscoverySummaryWarning = {
  kind: RecommendationWarningKind;
  message: string;
  serviceId?: ServiceId;
};

/**
 * Customer-readable summary of a recommendation — consumed by Discovery Summary UI.
 * Built from RecommendationResult + catalog labels; UI renders this object only.
 */
export type DiscoverySummaryModel = {
  recommendedServices: readonly DiscoverySummaryServiceItem[];
  primaryServiceId: ServiceId | null;
  totalInvestment: DiscoverySummaryTotalInvestment;
  estimatedTimeline: DiscoverySummaryTimeline;
  nextStep: DiscoverySummaryNextStep;
  warnings: readonly DiscoverySummaryWarning[];
  requiresApproval: boolean;
  source: {
    generatedAt: string;
    engineVersion: string;
  };
};
