import type { ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlanLineItem, CampaignRecord } from "@/config/studio-board";
import {
  SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID,
  socialPromoCustomerDeliverableLabels,
} from "@/config/studio-social-promo-current-door-contract-v1";
import { lineSkuId } from "@/lib/approved-plan-line";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";

import { isPaymentConfirmedForActivation } from "./resolve-phase";

/** Fail-closed when paid production scope cannot be derived from payment authority. */
export class ProductionScopeRestoreError extends Error {
  readonly code = "production_scope_restore_failed" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProductionScopeRestoreError";
  }
}

function authoritativePaidSkuIds(campaign: CampaignRecord): ServiceId[] {
  if (campaign.paymentTruth?.status !== "confirmed") return [];
  const skuIds = campaign.paymentTruth.selectedServiceIds ?? [];
  return skuIds.length ? ([...skuIds] as ServiceId[]) : [];
}

function planSkusMatchPayment(
  planSkus: readonly string[],
  paymentSkus: readonly string[],
): boolean {
  if (!planSkus.length) return true;
  if (planSkus.length !== paymentSkus.length) return false;
  const pay = new Set(paymentSkus);
  return planSkus.every((id) => pay.has(id));
}

function trustedPlanLinesForPayment(
  plan: NonNullable<CampaignRecord["approvedStudioPlan"]>,
  skuIds: readonly ServiceId[],
): ApprovedStudioPlanLineItem[] | null {
  const paid = new Set(skuIds);
  const matched = plan.lineItems.filter((line) => paid.has(lineSkuId(line) as ServiceId));
  if (matched.length !== skuIds.length) return null;
  if (!planSkusMatchPayment(matched.map((line) => lineSkuId(line)), skuIds)) return null;
  return matched;
}

function buildCondensedDoorLineItem(
  campaign: CampaignRecord,
  skuId: ServiceId,
): ApprovedStudioPlanLineItem | null {
  if (skuId !== SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID) return null;
  const priceCents =
    campaign.condensedOffer?.listPriceCents ??
    campaign.condensedOffer?.priceCents ??
    campaign.paymentTruth?.expectedAmountCents ??
    0;
  return {
    skuId,
    serviceName: campaign.condensedOffer?.name ?? "Social & Promo Graphics",
    billingType: "one_time",
    exactPriceCents: priceCents,
    priceDisplay: `$${Math.round(priceCents / 100)}`,
    deliverables: [...socialPromoCustomerDeliverableLabels()],
    exclusions: [],
    timingWindowLabel: "Timing varies by package.",
    revisionRule: "Three revision rounds per package snapshot.",
    clientResponsibilities: ["Files are sent from My Studio after payment."],
    executionResponsibility: "The Studio",
  };
}

function buildLineItemsFromPaymentAuthority(
  campaign: CampaignRecord,
  skuIds: readonly ServiceId[],
): ApprovedStudioPlanLineItem[] {
  const plan = campaign.approvedStudioPlan;
  if (plan?.lineItems.length) {
    const trusted = trustedPlanLinesForPayment(plan, skuIds);
    if (trusted?.length) {
      const production = filterProductionPlanLineItems({ ...plan, lineItems: trusted });
      return production.length > 0 ? production : trusted;
    }
  }

  const catalogLines = buildServiceScopeSnapshot(skuIds);
  if (catalogLines.length === skuIds.length) return catalogLines;

  const doorLines = skuIds
    .map((skuId) => buildCondensedDoorLineItem(campaign, skuId))
    .filter((line): line is ApprovedStudioPlanLineItem => line !== null);
  if (doorLines.length === skuIds.length) return doorLines;

  return [];
}

/**
 * Restore missing or empty production plan lines from processor-confirmed payment
 * truth only. Never reads client intake or route-map drafts for SKU scope.
 */
export function restoreProductionScopeFromPaymentAuthority(
  campaign: CampaignRecord,
): CampaignRecord {
  const plan = campaign.approvedStudioPlan;
  const skuIdsEarly = authoritativePaidSkuIds(campaign);
  if (plan?.lineItems.length && skuIdsEarly.length) {
    const trusted = trustedPlanLinesForPayment(plan, skuIdsEarly);
    if (trusted?.length) {
      return campaign;
    }
  }
  if (plan && filterProductionPlanLineItems(plan).length > 0) {
    return campaign;
  }

  if (!isPaymentConfirmedForActivation(campaign)) {
    throw new ProductionScopeRestoreError(
      "Cannot restore production scope without processor-confirmed payment.",
    );
  }

  const skuIds = authoritativePaidSkuIds(campaign);
  if (!skuIds.length) {
    throw new ProductionScopeRestoreError(
      "Confirmed payment has no selectedServiceIds — production scope is ambiguous.",
    );
  }

  if (plan?.selectedServiceIds?.length && !planSkusMatchPayment(plan.selectedServiceIds, skuIds)) {
    throw new ProductionScopeRestoreError(
      "Approved plan selectedServiceIds disagree with confirmed payment selectedServiceIds.",
    );
  }

  const lineItems = buildLineItemsFromPaymentAuthority(campaign, skuIds);
  if (!lineItems.length) {
    throw new ProductionScopeRestoreError(
      `No production line items could be built for paid SKUs: ${skuIds.join(", ")}.`,
    );
  }

  const confirmedCents =
    campaign.paymentTruth?.confirmedAmountCents ??
    campaign.paymentTruth?.expectedAmountCents;

  const oneTimeFromLines = lineItems.reduce(
    (sum, line) => sum + (line.exactPriceCents ?? 0),
    0,
  );

  return {
    ...campaign,
    approvedStudioPlan: {
      selectedServiceIds: [...skuIds],
      includedServiceIds: plan?.includedServiceIds?.length
        ? [...plan.includedServiceIds]
        : [...skuIds],
      additionalServiceIds: plan?.additionalServiceIds ?? [],
      additionalCostUsd: plan?.additionalCostUsd ?? 0,
      oneTimeTotalCents: plan?.oneTimeTotalCents ?? oneTimeFromLines,
      monthlyTotalCents: plan?.monthlyTotalCents ?? 0,
      amountDueTodayCents: plan?.amountDueTodayCents ?? confirmedCents ?? oneTimeFromLines,
      lineItems,
      approvedAt:
        plan?.approvedAt ??
        campaign.paymentTruth?.confirmedAt ??
        new Date().toISOString(),
    },
  };
}
