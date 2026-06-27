import type { BillingType, ServiceId } from "@/catalog/types";
import type { ApprovedStudioPlanLineItem } from "@/config/studio-board";
import { readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";
import {
  buildPlanLineItems,
  computePlanPricingTotals,
  formatUsdFromCents,
} from "@/lib/plan-pricing";
import type { StudioPlanReviewModel } from "@/studio-plan-review";

export type PaymentPlanSummarySource = "storage" | "empty";

export type PaymentPlanLineItem = {
  serviceId: ServiceId;
  name: string;
  priceDisplay: string;
  priceCents: number;
  billingType: BillingType;
};

export type PaymentPlanSummary = {
  lineItems: readonly PaymentPlanLineItem[];
  services: readonly string[];
  oneTimeSubtotalCents: number;
  monthlySubtotalCents: number;
  amountDueTodayCents: number;
  oneTimeSubtotalDisplay: string;
  monthlySubtotalDisplay: string;
  amountDueTodayDisplay: string;
  investmentLabel: "Estimated Investment" | "Monthly Total" | "Amount Due Today";
  investmentDisplay: string;
  source: PaymentPlanSummarySource;
};

function resolveApprovedServiceIds(
  approved: NonNullable<ReturnType<typeof readCurrentCampaignHydrated>>["approvedStudioPlan"],
): ServiceId[] {
  if (!approved) return [];
  if (approved.selectedServiceIds?.length) {
    return [...approved.selectedServiceIds];
  }
  return [...approved.includedServiceIds, ...approved.additionalServiceIds];
}

function buildSummaryFromServiceIds(
  serviceIds: readonly ServiceId[],
  source: PaymentPlanSummarySource,
): PaymentPlanSummary {
  const totals = computePlanPricingTotals(serviceIds);
  const lineItems = totals.lineItems.map((line) => ({
    serviceId: line.serviceId,
    name: line.name,
    priceDisplay: line.priceDisplay,
    priceCents: line.priceCents,
    billingType: line.billingType,
  }));
  const services = lineItems.map((line) => line.name);

  const hasMonthly = totals.monthlySubtotalCents > 0;
  const hasOneTime = totals.oneTimeSubtotalCents > 0;

  let investmentLabel: PaymentPlanSummary["investmentLabel"] = "Amount Due Today";
  let investmentDisplay = formatUsdFromCents(totals.amountDueTodayCents);

  if (hasMonthly && !hasOneTime) {
    investmentLabel = "Monthly Total";
    investmentDisplay = `${formatUsdFromCents(totals.monthlySubtotalCents)}/month`;
  } else if (hasOneTime) {
    investmentLabel = "Amount Due Today";
    investmentDisplay = formatUsdFromCents(totals.amountDueTodayCents);
  }

  return {
    lineItems,
    services,
    oneTimeSubtotalCents: totals.oneTimeSubtotalCents,
    monthlySubtotalCents: totals.monthlySubtotalCents,
    amountDueTodayCents: totals.amountDueTodayCents,
    oneTimeSubtotalDisplay: formatUsdFromCents(totals.oneTimeSubtotalCents),
    monthlySubtotalDisplay: formatUsdFromCents(totals.monthlySubtotalCents),
    amountDueTodayDisplay: formatUsdFromCents(totals.amountDueTodayCents),
    investmentLabel,
    investmentDisplay,
    source,
  };
}

function normalizeLineItem(line: ApprovedStudioPlanLineItem): PaymentPlanLineItem {
  const skuId = line.skuId ?? line.serviceId!;
  const name = line.serviceName ?? line.name!;
  const priceCents = line.exactPriceCents ?? line.priceCents ?? 0;

  return {
    serviceId: skuId,
    name,
    priceDisplay: line.priceDisplay,
    priceCents,
    billingType: line.billingType,
  };
}

function buildSummaryFromLineItemSnapshot(
  approved: NonNullable<ReturnType<typeof readCurrentCampaignHydrated>>["approvedStudioPlan"],
): PaymentPlanSummary | null {
  if (!approved?.lineItems?.length) return null;

  const lineItems: PaymentPlanLineItem[] = approved.lineItems.map((line) => normalizeLineItem(line));

  const services = lineItems.map((line) => line.name);
  const hasMonthly = approved.monthlyTotalCents > 0;
  const hasOneTime = approved.oneTimeTotalCents > 0;

  let investmentLabel: PaymentPlanSummary["investmentLabel"] = "Amount Due Today";
  let investmentDisplay = formatUsdFromCents(approved.amountDueTodayCents);

  if (hasMonthly && !hasOneTime) {
    investmentLabel = "Monthly Total";
    investmentDisplay = `${formatUsdFromCents(approved.monthlyTotalCents)}/month`;
  } else if (hasOneTime) {
    investmentLabel = "Amount Due Today";
    investmentDisplay = formatUsdFromCents(approved.amountDueTodayCents);
  }

  return {
    lineItems,
    services,
    oneTimeSubtotalCents: approved.oneTimeTotalCents,
    monthlySubtotalCents: approved.monthlyTotalCents,
    amountDueTodayCents: approved.amountDueTodayCents,
    oneTimeSubtotalDisplay: formatUsdFromCents(approved.oneTimeTotalCents),
    monthlySubtotalDisplay: formatUsdFromCents(approved.monthlyTotalCents),
    amountDueTodayDisplay: formatUsdFromCents(approved.amountDueTodayCents),
    investmentLabel,
    investmentDisplay,
    source: "storage",
  };
}

/**
 * Left-panel Studio Plan summary — reads approved plan from campaign storage when present.
 */
export function buildPaymentPlanSummary(): PaymentPlanSummary {
  const campaign = readCurrentCampaignHydrated();
  const approved = campaign?.approvedStudioPlan;

  if (approved) {
    const snapshot = buildSummaryFromLineItemSnapshot(approved);
    if (snapshot) return snapshot;

    const serviceIds = resolveApprovedServiceIds(approved);
    if (serviceIds.length > 0) {
      return buildSummaryFromServiceIds(serviceIds, "storage");
    }
  }

  return {
    lineItems: [],
    services: [],
    oneTimeSubtotalCents: 0,
    monthlySubtotalCents: 0,
    amountDueTodayCents: 0,
    oneTimeSubtotalDisplay: formatUsdFromCents(0),
    monthlySubtotalDisplay: formatUsdFromCents(0),
    amountDueTodayDisplay: formatUsdFromCents(0),
    investmentLabel: "Amount Due Today",
    investmentDisplay: "Total updates as you customize your plan.",
    source: "empty",
  };
}

/**
 * Live Studio Plan summary for inline checkout — reflects current customize selections.
 * Uses only plan.selectedServiceIds; recommendations never appear unless explicitly selected.
 */
export function buildPaymentPlanSummaryFromPlan(plan: StudioPlanReviewModel): PaymentPlanSummary {
  if (plan.selectedServiceIds.length === 0) {
    return {
      lineItems: [],
      services: [],
      oneTimeSubtotalCents: 0,
      monthlySubtotalCents: 0,
      amountDueTodayCents: 0,
      oneTimeSubtotalDisplay: formatUsdFromCents(0),
      monthlySubtotalDisplay: formatUsdFromCents(0),
      amountDueTodayDisplay: formatUsdFromCents(0),
      investmentLabel: "Amount Due Today",
      investmentDisplay: "Total updates as you customize your plan.",
      source: "empty",
    };
  }
  return buildSummaryFromServiceIds([...plan.selectedServiceIds], "storage");
}

/** Re-export for consumers that need line items without full summary wrapper. */
export { buildPlanLineItems, computePlanPricingTotals };
