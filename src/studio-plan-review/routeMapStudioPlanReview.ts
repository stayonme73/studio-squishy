/**
 * Route Map Studio Plan Review — builds the shared plan review model without Discovery scoring.
 */

import { getDerivedServicePricing, getServiceById } from "@/catalog/accessors";
import { SERVICE_CATALOG } from "@/catalog";
import { ROUTE_MAP_V2_POST_PUBLISH_ADDON } from "@/catalog/route-map-v2-launch";
import { validateExecutionAddOnsInPlan } from "@/catalog/validate";
import type { ServiceId } from "@/catalog/types";
import { ROUTE_MAP_V1 } from "@/config/route-map-v1";
import { addServiceToRouteMapPlanState } from "@/lib/route-map-campaign";
import { computePlanPricingTotals, formatUsdFromCents } from "@/lib/plan-pricing";
import {
  computeAdditionalCostUsd,
  getSameClassSwapCandidates,
  type StudioPlanState,
} from "@/studio-plan-review/planState";
import {
  STUDIO_PLAN_REVIEW_LABELS,
  type StudioPlanReviewCostSummary,
  type StudioPlanReviewModel,
  type StudioPlanReviewPlanTotals,
  type StudioPlanReviewServiceItem,
} from "@/studio-plan-review/types";

const ROUTE_MAP_PLAN_SERVICE_IDS = [
  ...ROUTE_MAP_V1.jobs.map((job) => job.id as ServiceId),
  ROUTE_MAP_V2_POST_PUBLISH_ADDON.id,
] as const;

const ROUTE_MAP_PLAN_SERVICE_SET = new Set<ServiceId>(ROUTE_MAP_PLAN_SERVICE_IDS);

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
    .filter((candidateId) => ROUTE_MAP_PLAN_SERVICE_SET.has(candidateId))
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
    .filter((serviceId) => ROUTE_MAP_PLAN_SERVICE_SET.has(serviceId))
    .map((serviceId) => buildServiceItem(serviceId, isIncluded, selectedIds))
    .filter((item): item is StudioPlanReviewServiceItem => item !== null);
}

export function buildRouteMapStudioPlanReview(
  planState: StudioPlanState,
): StudioPlanReviewModel {
  const selectedIds = planState.selectedServiceIds;
  const availableToAdd = ROUTE_MAP_PLAN_SERVICE_IDS.filter((serviceId) =>
    addServiceToRouteMapPlanState(planState, serviceId).selectedServiceIds !== selectedIds,
  );
  const planValidation = validateExecutionAddOnsInPlan(selectedIds, SERVICE_CATALOG);
  const hasServices = selectedIds.length > 0;
  const planValid = hasServices && planValidation.valid;

  return {
    labels: {
      ...STUDIO_PLAN_REVIEW_LABELS,
      approvePlan: "Continue to Checkout",
      addService: "+ Add to Studio Plan",
    },
    selectedServiceIds: selectedIds,
    recommendedServiceIds: [],
    includedServices: mapServiceIds(selectedIds, true, selectedIds),
    considerNextServices: [],
    additionalStudioServices: [],
    addedToPlanServices: [],
    availableToAdd: mapServiceIds(availableToAdd, false, selectedIds),
    additionalCost: buildCostSummary([]),
    planTotals: buildPlanTotals(selectedIds),
    warnings: [],
    canApprove: planValid,
    planValid,
    emptyStateMessage: hasServices
      ? null
      : "Your Studio Plan is empty. Return to the Route Map to add a service.",
  };
}
