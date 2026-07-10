/**
 * Studio Plan Review — view-model types.
 * Customer-facing presentation of plan selection — no scoring or catalog rules here.
 */

import type { ServiceId } from "@/catalog/types";

export const STUDIO_PLAN_REVIEW_LABELS = {
  recommendedPlan: "Recommended Studio Plan",
  includedServices: "Included Services",
  considerNext: "Consider next",
  additionalStudioServices: "Additional Studio Services",
  addedToPlan: "Added to Your Plan",
  additionalCost: "Additional Cost",
  approvePlan: "Approve Studio Plan",
  removeService: "Remove",
  swapService: "Swap",
  addService: "+ Add to plan",
  viewDetails: "View Details",
} as const;

export type StudioPlanReviewLabels = Record<keyof typeof STUDIO_PLAN_REVIEW_LABELS, string>;

export type StudioPlanReviewSwapOption = {
  serviceId: ServiceId;
  title: string;
};

export type StudioPlanReviewServiceItem = {
  serviceId: ServiceId;
  title: string;
  pricingDisplay: string;
  amountUsd: number;
  isIncluded: boolean;
  swapCandidates: readonly StudioPlanReviewSwapOption[];
};

export type StudioPlanReviewCostSummary = {
  display: string;
  amountUsd: number;
  hasQuotedItems: boolean;
};

export type StudioPlanReviewPlanTotals = {
  oneTimeSubtotalDisplay: string;
  monthlySubtotalDisplay: string;
  amountDueTodayDisplay: string;
  oneTimeSubtotalCents: number;
  monthlySubtotalCents: number;
  amountDueTodayCents: number;
};

export type StudioPlanReviewConsiderNextItem = StudioPlanReviewServiceItem & {
  explanation: string;
};

/**
 * Customer-readable Studio Plan Review — consumed by Studio Plan Review UI.
 */
export type StudioPlanReviewModel = {
  labels: StudioPlanReviewLabels;
  selectedServiceIds: readonly ServiceId[];
  recommendedServiceIds: readonly ServiceId[];
  includedServices: readonly StudioPlanReviewServiceItem[];
  considerNextServices: readonly StudioPlanReviewConsiderNextItem[];
  additionalStudioServices: readonly StudioPlanReviewServiceItem[];
  addedToPlanServices: readonly StudioPlanReviewServiceItem[];
  availableToAdd: readonly StudioPlanReviewServiceItem[];
  additionalCost: StudioPlanReviewCostSummary;
  planTotals: StudioPlanReviewPlanTotals;
  warnings: readonly string[];
  canApprove: boolean;
  planValid: boolean;
  emptyStateMessage: string | null;
};
