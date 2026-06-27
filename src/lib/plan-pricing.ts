/**
 * Shared plan pricing — single calculation path for Project Summary and checkout.
 */

import {
  getDerivedServicePricing,
  getServiceById,
  getServicePriceCents,
  resolveLegacyServiceId,
} from "@/catalog/accessors";
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

function formatCentsDisplay(cents: number, billingType: BillingType): string {
  const amountUsd = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
  return billingType === "monthly" ? `${formatted}/month` : formatted;
}

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
    const pricing = getDerivedServicePricing(resolved);

    lines.push({
      serviceId: service.id,
      name: service.name,
      priceCents,
      billingType: service.billingType,
      priceDisplay: pricing?.display ?? formatCentsDisplay(priceCents, service.billingType),
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

function resolveTimingWindowLabel(service: NonNullable<ReturnType<typeof getServiceById>>): string {
  if (service.monthlyCycleWindow?.label) return service.monthlyCycleWindow.label;
  if (service.finalDeliveryWindow?.label) return service.finalDeliveryWindow.label;
  return service.firstReviewWindow.label;
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
    const pricing = getDerivedServicePricing(resolved);
    const parentSkuId = resolveParentSkuId(service);

    lines.push({
      skuId: service.id,
      serviceName: service.name,
      billingType: service.billingType,
      exactPriceCents: priceCents,
      priceDisplay: pricing?.display ?? formatCentsDisplay(priceCents, service.billingType),
      deliverables: [...service.deliverables],
      exclusions: [...service.exclusions],
      timingWindowLabel: resolveTimingWindowLabel(service),
      revisionRule: service.revisionRule,
      clientResponsibilities: [...service.clientResponsibilities],
      executionResponsibility: EXECUTION_MODE_LABELS[service.executionMode],
      parentSkuId,
      parentFamilyId: service.eligibleParentFamilyIds?.[0] as ServiceFamilyId | undefined,
    });
  }

  return lines;
}
