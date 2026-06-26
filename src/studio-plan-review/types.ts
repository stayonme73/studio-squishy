/**
 * Studio Plan Review — view-model types.
 * Customer-facing presentation of plan selection — no scoring or catalog rules here.
 */

import type { ServiceId } from "@/catalog/types";

export const STUDIO_PLAN_REVIEW_LABELS = {
  recommendedPlan: "Recommended Studio Plan",
  includedServices: "Included Services",
  additionalStudioServices: "Additional Studio Services",
  addedToPlan: "Added to Your Plan",
  additionalCost: "Additional Cost",
  approvePlan: "Approve Studio Plan",
  removeService: "Remove",
  swapService: "Swap",
  addService: "Add to Plan",
} as const;

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

/**
 * Customer-readable Studio Plan Review — consumed by Studio Plan Review UI.
 */
export type StudioPlanReviewModel = {
  labels: typeof STUDIO_PLAN_REVIEW_LABELS;
  recommendedServiceIds: readonly ServiceId[];
  includedServices: readonly StudioPlanReviewServiceItem[];
  additionalStudioServices: readonly StudioPlanReviewServiceItem[];
  addedToPlanServices: readonly StudioPlanReviewServiceItem[];
  availableToAdd: readonly StudioPlanReviewServiceItem[];
  additionalCost: StudioPlanReviewCostSummary;
  warnings: readonly string[];
  canApprove: boolean;
  emptyStateMessage: string | null;
};
