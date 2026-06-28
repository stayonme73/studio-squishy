/**
 * Discovery Summary — view-model types.
 * Customer-facing presentation of RecommendationResult — no scoring or catalog rules here.
 */

import type { ServiceBillingModel, ServiceId } from "@/catalog/types";
import type { RecommendationWarningKind } from "@/recommendation/types";
import type { CustomerSectionLabels } from "@/catalog/production-allocation";

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

export type DiscoverySummaryConsiderNextItem = DiscoverySummaryServiceItem;

export type DiscoverySummaryTotalInvestment = {
  display: string;
  amountUsd: number;
  hasQuotedItems: boolean;
  oneTimeSubtotalDisplay: string;
  monthlySubtotalDisplay: string;
  amountDueTodayDisplay: string;
  monthlySubtotalCents: number;
};

export type DiscoverySummaryTimeline = {
  customerLabel: string;
  totalBusinessDays: number;
  oneTimeLabel?: string;
  monthlyLabel?: string;
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
  considerNextServices: readonly DiscoverySummaryConsiderNextItem[];
  additionalStudioServices: readonly DiscoverySummaryServiceItem[];
  sectionLabels: CustomerSectionLabels;
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
