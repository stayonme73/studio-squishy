/**
 * Studio Plan Review — maps RecommendationResult + plan state to customer-facing view model.
 */

import { getServiceById } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import type { RecommendationResult } from "@/recommendation/types";
import {
  allocateSelectedServices,
  computeAdditionalCostUsd,
  getAvailableServicesToAdd,
  getSameClassSwapCandidates,
  type StudioPlanState,
} from "@/studio-plan-review/planState";
import {
  STUDIO_PLAN_REVIEW_LABELS,
  type StudioPlanReviewCostSummary,
  type StudioPlanReviewModel,
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
  const { amountUsd, hasQuotedItems } = computeAdditionalCostUsd(additionalServiceIds);

  if (additionalServiceIds.length === 0) {
    return { display: formatUsd(0), amountUsd: 0, hasQuotedItems: false };
  }

  if (hasQuotedItems && amountUsd === 0) {
    return { display: "Quoted at checkout", amountUsd: 0, hasQuotedItems: true };
  }

  if (hasQuotedItems) {
    return {
      display: `${formatUsd(amountUsd)} plus quoted items`,
      amountUsd,
      hasQuotedItems: true,
    };
  }

  return { display: formatUsd(amountUsd), amountUsd, hasQuotedItems: false };
}

function buildServiceItem(
  serviceId: ServiceId,
  isIncluded: boolean,
  selectedIds: readonly ServiceId[],
): StudioPlanReviewServiceItem | null {
  const service = getServiceById(serviceId);
  if (!service) return null;

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
    pricingDisplay: service.pricing?.display ?? "Quoted at checkout",
    amountUsd: service.pricing?.amountUsd ?? 0,
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

/**
 * Transform recommendation output and current plan state into a StudioPlanReviewModel.
 */
export function buildStudioPlanReview(
  result: RecommendationResult,
  planState: StudioPlanState,
): StudioPlanReviewModel {
  const recommendedServiceIds = result.recommendations.map((entry) => entry.serviceId);
  const { includedServiceIds, additionalServiceIds } = allocateSelectedServices(
    planState.selectedServiceIds,
  );

  const recommendedSet = new Set(recommendedServiceIds);
  const includedServices = mapServiceIds(includedServiceIds, true, planState.selectedServiceIds);
  const additionalStudioServices = mapServiceIds(
    additionalServiceIds.filter((id) => recommendedSet.has(id)),
    false,
    planState.selectedServiceIds,
  );
  const addedToPlanServices = mapServiceIds(
    additionalServiceIds.filter((id) => !recommendedSet.has(id)),
    false,
    planState.selectedServiceIds,
  );
  const availableToAdd = mapServiceIds(
    getAvailableServicesToAdd(planState.selectedServiceIds),
    false,
    planState.selectedServiceIds,
  );

  const warnings = buildWarnings(result);
  const emptyStateMessage =
    planState.selectedServiceIds.length === 0
      ? "No services are in your plan yet. Add Studio Services from the menu below."
      : null;

  return {
    labels: STUDIO_PLAN_REVIEW_LABELS,
    recommendedServiceIds,
    includedServices,
    additionalStudioServices,
    addedToPlanServices,
    availableToAdd,
    additionalCost: buildCostSummary(additionalServiceIds),
    warnings,
    canApprove: planState.selectedServiceIds.length > 0,
    emptyStateMessage,
  };
}
