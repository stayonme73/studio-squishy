/**
 * Studio Plan Review — maps RecommendationResult + plan state to customer-facing view model.
 */

import { getDerivedServicePricing, getServiceById } from "@/catalog/accessors";
import { validateExecutionAddOnsInPlan } from "@/catalog/validate";
import { SERVICE_CATALOG } from "@/catalog/services";
import type { ServiceId } from "@/catalog/types";
import { buildCustomerWhyExplanation } from "@/discovery-summary/recommendation-copy";
import { computePlanPricingTotals, formatUsdFromCents } from "@/lib/plan-pricing";
import type { RecommendationResult } from "@/recommendation/types";
import {
  computeAdditionalCostUsd,
  getAvailableServicesToAdd,
  getSameClassSwapCandidates,
  type StudioPlanState,
} from "@/studio-plan-review/planState";
import {
  STUDIO_PLAN_REVIEW_LABELS,
  type StudioPlanReviewConsiderNextItem,
  type StudioPlanReviewCostSummary,
  type StudioPlanReviewModel,
  type StudioPlanReviewPlanTotals,
  type StudioPlanReviewServiceItem,
} from "@/studio-plan-review/types";

const CUSTOMER_WARNING_MESSAGES: Partial<
  Record<RecommendationResult["warnings"][number]["kind"], string>
> = {
  "low-confidence-match":
    "This is our best match from what you shared so far — review your plan before approving.",
};

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildCostSummary(additionalServiceIds: readonly ServiceId[]): StudioPlanReviewCostSummary {
  const { amountUsd } = computeAdditionalCostUsd(additionalServiceIds);

  if (additionalServiceIds.length === 0) {
    return { display: formatUsd(0), amountUsd: 0, hasQuotedItems: false };
  }

  return { display: formatUsd(amountUsd), amountUsd, hasQuotedItems: false };
}

function buildPlanTotals(selectedServiceIds: readonly ServiceId[]): StudioPlanReviewPlanTotals {
  const totals = computePlanPricingTotals(selectedServiceIds);

  return {
    oneTimeSubtotalDisplay: formatUsdFromCents(totals.oneTimeSubtotalCents),
    monthlySubtotalDisplay: formatUsdFromCents(totals.monthlySubtotalCents),
    amountDueTodayDisplay: formatUsdFromCents(totals.amountDueTodayCents),
    oneTimeSubtotalCents: totals.oneTimeSubtotalCents,
    monthlySubtotalCents: totals.monthlySubtotalCents,
    amountDueTodayCents: totals.amountDueTodayCents,
  };
}

function buildServiceItem(
  serviceId: ServiceId,
  isIncluded: boolean,
  selectedIds: readonly ServiceId[],
): StudioPlanReviewServiceItem | null {
  const service = getServiceById(serviceId);
  if (!service) return null;

  const pricing = getDerivedServicePricing(serviceId);

  const swapCandidates = getSameClassSwapCandidates(serviceId, selectedIds)
    .map((candidateId) => {
      const candidate = getServiceById(candidateId);
      if (!candidate) return null;
      return { serviceId: candidateId, title: candidate.name };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    serviceId,
    title: service.name,
    pricingDisplay: pricing?.display ?? formatUsd(0),
    amountUsd: pricing?.amountUsd ?? 0,
    isIncluded,
    swapCandidates,
  };
}

function mapServiceIds(
  serviceIds: readonly ServiceId[],
  isIncluded: boolean,
  selectedIds: readonly ServiceId[],
): StudioPlanReviewServiceItem[] {
  return serviceIds
    .map((serviceId) => buildServiceItem(serviceId, isIncluded, selectedIds))
    .filter((item): item is StudioPlanReviewServiceItem => item !== null);
}

function buildWarnings(result: RecommendationResult): string[] {
  return result.warnings
    .map((warning) => CUSTOMER_WARNING_MESSAGES[warning.kind] ?? null)
    .filter((message): message is string => Boolean(message));
}

function buildConsiderNextItem(
  recommendation: RecommendationResult["considerNextRecommendations"][number],
  brief: RecommendationResult["brief"],
  selectedIds: readonly ServiceId[],
): StudioPlanReviewConsiderNextItem | null {
  const service = getServiceById(recommendation.serviceId);
  if (!service) return null;

  const pricing = getDerivedServicePricing(recommendation.serviceId);
  const customerDescription = service.customerDescription ?? service.customerReceives ?? "";
  const explanation =
    buildCustomerWhyExplanation(recommendation.serviceId, brief, customerDescription) ||
    service.name;

  return {
    serviceId: recommendation.serviceId,
    title: service.name,
    pricingDisplay: pricing?.display ?? formatUsd(0),
    amountUsd: pricing?.amountUsd ?? 0,
    isIncluded: false,
    explanation,
    swapCandidates: getSameClassSwapCandidates(recommendation.serviceId, selectedIds)
      .map((candidateId) => {
        const candidate = getServiceById(candidateId);
        if (!candidate) return null;
        return { serviceId: candidateId, title: candidate.name };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  };
}

/**
 * Transform recommendation output and current plan state into a StudioPlanReviewModel.
 */
export function buildStudioPlanReview(
  result: RecommendationResult,
  planState: StudioPlanState,
): StudioPlanReviewModel {
  const recommendedServiceIds = result.recommendations.map((entry) => entry.serviceId);
  const considerNextIds = new Set(
    result.considerNextRecommendations.map((entry) => entry.serviceId),
  );
  const recommendedSet = new Set(recommendedServiceIds);
  const selectedIds = planState.selectedServiceIds;

  // Included Services = every service currently in the live plan (recommended, Consider Next, swapped, manual).
  const includedServices = mapServiceIds(selectedIds, true, selectedIds);
  const clientAddedIds = selectedIds.filter((id) => !recommendedSet.has(id));
  const considerNextServices = result.considerNextRecommendations
    .filter((entry) => !selectedIds.includes(entry.serviceId))
    .map((entry) => buildConsiderNextItem(entry, result.brief, selectedIds))
    .filter((item): item is StudioPlanReviewConsiderNextItem => item !== null);
  const additionalStudioServices: StudioPlanReviewServiceItem[] = [];
  const addedToPlanServices: StudioPlanReviewServiceItem[] = [];
  const availableToAdd = mapServiceIds(
    getAvailableServicesToAdd(planState.selectedServiceIds).filter(
      (serviceId) => !considerNextIds.has(serviceId),
    ),
    false,
    planState.selectedServiceIds,
  );

  const planValidation = validateExecutionAddOnsInPlan(
    planState.selectedServiceIds,
    SERVICE_CATALOG,
  );
  const hasServices = planState.selectedServiceIds.length > 0;
  const planValid = hasServices && planValidation.valid;

  const warnings = buildWarnings(result);
  const emptyStateMessage =
    planState.selectedServiceIds.length === 0
      ? "No services are in your plan yet. Add Studio Services from the menu below."
      : null;

  return {
    labels: STUDIO_PLAN_REVIEW_LABELS,
    selectedServiceIds: planState.selectedServiceIds,
    recommendedServiceIds,
    includedServices,
    considerNextServices,
    additionalStudioServices,
    addedToPlanServices,
    availableToAdd,
    additionalCost: buildCostSummary(clientAddedIds),
    planTotals: buildPlanTotals(planState.selectedServiceIds),
    warnings,
    canApprove: planValid,
    planValid,
    emptyStateMessage,
  };
}
