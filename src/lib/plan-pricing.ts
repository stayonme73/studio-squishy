/**
 * Shared plan pricing — single calculation path for Project Summary and checkout.
 */

import {
  getServiceById,
  getServicePriceCents,
  resolveLegacyServiceId,
} from "@/catalog/accessors";
import { getCheckoutPriceDisplay, getCheckoutTimingLabel } from "@/catalog/route-map-display";
import type { BillingType, ServiceFamilyId, ServiceId } from "@/catalog/types";
import { EXECUTION_MODE_LABELS } from "@/config/service-guide";
import type { ApprovedStudioPlanLineItem } from "@/config/studio-board";

export type PlanServiceLine = {
  serviceId: ServiceId;
  name: string;
  priceCents: number;
  billingType: BillingType;
  priceDisplay: string;
};

export type PlanPricingTotals = {
  lineItems: readonly PlanServiceLine[];
  oneTimeSubtotalCents: number;
  monthlySubtotalCents: number;
  amountDueTodayCents: number;
};

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Build ordered line items from selected SKU IDs — preserves selection order. */
export function buildPlanLineItems(selectedServiceIds: readonly ServiceId[]): PlanServiceLine[] {
  const lines: PlanServiceLine[] = [];

  for (const rawId of selectedServiceIds) {
    const resolved = resolveLegacyServiceId(rawId) ?? rawId;
    const service = getServiceById(resolved);
    if (!service) continue;

    const priceCents = getServicePriceCents(resolved);

    lines.push({
      serviceId: service.id,
      name: service.name,
      priceCents,
      billingType: service.billingType,
      priceDisplay: getCheckoutPriceDisplay(service),
    });
  }

  return lines;
}

/** Compute one-time / monthly subtotals and amount due today (one-time only). */
export function computePlanPricingTotals(
  selectedServiceIds: readonly ServiceId[],
): PlanPricingTotals {
  const lineItems = buildPlanLineItems(selectedServiceIds);
  let oneTimeSubtotalCents = 0;
  let monthlySubtotalCents = 0;

  for (const line of lineItems) {
    if (line.billingType === "monthly") {
      monthlySubtotalCents += line.priceCents;
    } else {
      oneTimeSubtotalCents += line.priceCents;
    }
  }

  return {
    lineItems,
    oneTimeSubtotalCents,
    monthlySubtotalCents,
    amountDueTodayCents: oneTimeSubtotalCents,
  };
}

function resolveParentSkuId(service: NonNullable<ReturnType<typeof getServiceById>>): ServiceId | undefined {
  if (!service.isExecutionAddOn) return undefined;
  return service.dependencies[0] ?? undefined;
}

/** Build immutable approved-plan line items with full scope snapshot from catalog at approval time. */
export function buildServiceScopeSnapshot(
  selectedServiceIds: readonly ServiceId[],
): ApprovedStudioPlanLineItem[] {
  const lines: ApprovedStudioPlanLineItem[] = [];

  for (const rawId of selectedServiceIds) {
    const resolved = resolveLegacyServiceId(rawId) ?? rawId;
    const service = getServiceById(resolved);
    if (!service) continue;

    const priceCents = getServicePriceCents(resolved);
    const parentSkuId = resolveParentSkuId(service);

    lines.push({
      skuId: service.id,
      serviceName: service.name,
      billingType: service.billingType,
      exactPriceCents: priceCents,
      priceDisplay: getCheckoutPriceDisplay(service),
      deliverables: [...service.deliverables],
      exclusions: [...service.exclusions],
      timingWindowLabel: getCheckoutTimingLabel(service),
      revisionRule: service.revisionRule,
      clientResponsibilities: [...service.clientResponsibilities],
      executionResponsibility: EXECUTION_MODE_LABELS[service.executionMode],
      parentSkuId,
      parentFamilyId: service.eligibleParentFamilyIds?.[0] as ServiceFamilyId | undefined,
    });
  }

  return lines;
}
