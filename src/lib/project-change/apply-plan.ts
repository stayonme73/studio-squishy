import { getServiceById, getServicePriceCents, resolveLegacyServiceId } from "@/catalog/accessors";
import { SERVICE_CATALOG } from "@/catalog/seeds";
import type { ServiceId } from "@/catalog/types";
import { validateExecutionAddOnsInPlan } from "@/catalog/validate";
import type { ApprovedStudioPlan, CampaignRecord } from "@/config/studio-board";
import { resolveApprovedPlanRevisionRounds } from "@/lib/approved-plan-display";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { allocateSelectedServices, computeAdditionalCostUsd } from "@/studio-plan-review";

import type { ProjectChangeDelta } from "./types";

function resolveCatalogServiceId(rawId: ServiceId): ServiceId | null {
  const resolved = resolveLegacyServiceId(rawId) ?? rawId;
  const service = getServiceById(resolved);
  if (!service) return null;
  return service.id;
}

function isActivePurchasableService(service: NonNullable<ReturnType<typeof getServiceById>>): boolean {
  return (
    service.serviceStatus === "active" &&
    service.launchStatus === "active" &&
    service.status === "active"
  );
}

export function requiresPaymentForPlanChange(
  current: ApprovedStudioPlan,
  next: ApprovedStudioPlan,
): boolean {
  return (
    next.oneTimeTotalCents > current.oneTimeTotalCents ||
    next.monthlyTotalCents > current.monthlyTotalCents ||
    next.additionalCostUsd > current.additionalCostUsd
  );
}

export type ComputeNextApprovedPlanResult =
  | { ok: true; plan: ApprovedStudioPlan; serviceName: string }
  | { ok: false; error: string; paymentRequired?: boolean };

export function computeNextSelectedServiceIds(
  current: ApprovedStudioPlan,
  delta: ProjectChangeDelta,
): { ok: true; selectedServiceIds: ServiceId[]; serviceName: string } | { ok: false; error: string } {
  const resolvedId = resolveCatalogServiceId(delta.serviceId);
  if (!resolvedId) {
    return { ok: false, error: "Unknown catalog service." };
  }

  const service = getServiceById(resolvedId);
  if (!service) {
    return { ok: false, error: "Unknown catalog service." };
  }

  const currentIds = [...current.selectedServiceIds];

  if (delta.kind === "add_service") {
    if (!isActivePurchasableService(service)) {
      return { ok: false, error: "Service is not available for purchase." };
    }
    if (currentIds.includes(resolvedId)) {
      return { ok: false, error: "Service is already in the approved plan." };
    }
    return {
      ok: true,
      selectedServiceIds: [...currentIds, resolvedId],
      serviceName: service.name,
    };
  }

  if (!currentIds.includes(resolvedId)) {
    return { ok: false, error: "Service is not in the approved plan." };
  }
  if (currentIds.length <= 1) {
    return { ok: false, error: "The approved plan must retain at least one service." };
  }

  return {
    ok: true,
    selectedServiceIds: currentIds.filter((id) => id !== resolvedId),
    serviceName: service.name,
  };
}

export function computeNextApprovedStudioPlan(
  current: ApprovedStudioPlan,
  delta: ProjectChangeDelta,
): ComputeNextApprovedPlanResult {
  const selection = computeNextSelectedServiceIds(current, delta);
  if (!selection.ok) return selection;

  const validation = validateExecutionAddOnsInPlan(selection.selectedServiceIds, SERVICE_CATALOG);
  if (!validation.valid) {
    return { ok: false, error: validation.errors[0] ?? "Plan validation failed." };
  }

  const { includedServiceIds, additionalServiceIds } = allocateSelectedServices(
    selection.selectedServiceIds,
  );
  const { amountUsd } = computeAdditionalCostUsd(additionalServiceIds);
  const pricing = computePlanPricingTotals(selection.selectedServiceIds);
  const lineItems = buildServiceScopeSnapshot(selection.selectedServiceIds);
  const now = new Date().toISOString();

  const nextPlan: ApprovedStudioPlan = {
    selectedServiceIds: selection.selectedServiceIds,
    includedServiceIds,
    additionalServiceIds,
    additionalCostUsd: amountUsd,
    oneTimeTotalCents: pricing.oneTimeSubtotalCents,
    monthlyTotalCents: pricing.monthlySubtotalCents,
    amountDueTodayCents: pricing.amountDueTodayCents,
    lineItems,
    approvedAt: now,
    acknowledgmentVersion: current.acknowledgmentVersion,
    acknowledgmentText: current.acknowledgmentText,
    acknowledgedAt: current.acknowledgedAt,
  };

  if (delta.kind === "add_service") {
    const resolvedAddId = resolveCatalogServiceId(delta.serviceId);
    const pricedCents = resolvedAddId ? getServicePriceCents(resolvedAddId) : 0;
    if (pricedCents > 0 || requiresPaymentForPlanChange(current, nextPlan)) {
      return {
        ok: false,
        error:
          "This service addition requires payment before it can be applied. The request remains on hold for Studio handling.",
        paymentRequired: true,
      };
    }
  }

  return { ok: true, plan: nextPlan, serviceName: selection.serviceName };
}

export function buildCampaignWithAppliedPlan(
  campaign: CampaignRecord,
  nextPlan: ApprovedStudioPlan,
): CampaignRecord {
  const now = new Date().toISOString();
  return {
    ...campaign,
    approvedStudioPlan: nextPlan,
    revisionRoundsIncluded: resolveApprovedPlanRevisionRounds(nextPlan),
    updatedAt: now,
  };
}

export function customerSafeAppliedDetail(delta: ProjectChangeDelta, serviceName: string): string {
  if (delta.kind === "add_service") {
    return `${serviceName} was added to your Studio Plan.`;
  }
  return `${serviceName} was removed from your Studio Plan.`;
}
