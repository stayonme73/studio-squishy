/**
 * Per-order fulfillment usage for Studio Extras.
 * Units come from the provider response. Dollars stay UNKNOWN until a rate
 * is verified against a real invoice. This is the extras job truth, not a
 * second accounting system.
 */

import type { StudioExtraId } from "@/config/studio-extras-v1";
import { STUDIO_PROVIDER_RATE_CARD_V1 } from "@/config/studio-production-cost-telemetry-v1";
import {
  priceProviderUsage,
  type ProviderCallRecord,
  type ProviderCostLedger,
} from "@/lib/studio-project-alpha/cost-telemetry";

import type {
  CampaignStudioExtras,
  FulfillmentDollarStatus,
  FulfillmentUsageLine,
  StudioExtraState,
} from "./types";

export type FulfillmentUsageContext = {
  campaignId: string;
  packageId: CampaignStudioExtras["packageId"];
  extraId: StudioExtraId;
  selectedExtras: readonly StudioExtraId[];
  unitId: string;
  productionLine: string;
  /** Package revision round already assigned to this Extra. Not a new allowance. */
  packageRevisionRound: number | null;
  deliveryState: StudioExtraState;
  route: "primary" | "recovery";
  at: string;
  /** Provider lines already stored for this unit, so a later revision does not reuse ids. */
  sequenceBase: number;
};

function emptyUsage(): FulfillmentUsageLine["usage"] {
  return {
    textInputTokens: 0,
    cachedTextInputTokens: 0,
    imageInputTokens: 0,
    textOutputTokens: 0,
    imageOutputTokens: 0,
    renderCredits: null,
  };
}

function dollarFor(call: ProviderCallRecord): {
  dollarStatus: FulfillmentDollarStatus;
  costUsd: number | null;
  rateSource: FulfillmentUsageLine["rateSource"];
} {
  if (!STUDIO_PROVIDER_RATE_CARD_V1.ratesVerifiedAgainstLiveBilling || call.rateMissing) {
    return { dollarStatus: "UNKNOWN", costUsd: null, rateSource: "unverified_list_rate_not_used" };
  }
  return {
    dollarStatus: "DERIVED",
    costUsd: priceProviderUsage(call.model, call.usage),
    rateSource: "verified_rate_card",
  };
}

export function fulfillmentLinesFromProviderLedger(
  ledger: ProviderCostLedger,
  context: FulfillmentUsageContext,
): FulfillmentUsageLine[] {
  return ledger.calls.map((call, index) => {
    const priced = dollarFor(call);
    return {
      lineId: [
        context.campaignId,
        context.extraId,
        context.unitId,
        context.route,
        context.sequenceBase + index,
        call.provider,
        call.model,
        call.purpose,
        call.attempt,
        call.httpStatus,
      ].join("|"),
      campaignId: context.campaignId,
      packageId: context.packageId,
      extraId: context.extraId,
      selectedExtras: [...context.selectedExtras],
      unitId: context.unitId,
      productionLine: context.productionLine,
      kind: "provider_usage",
      provider: call.provider,
      model: call.model,
      purpose: call.purpose,
      attempt: call.attempt,
      httpStatus: call.httpStatus,
      billable: call.billable,
      usage: {
        textInputTokens: call.usage.textInputTokens,
        cachedTextInputTokens: call.usage.cachedTextInputTokens,
        imageInputTokens: call.usage.imageInputTokens,
        textOutputTokens: call.usage.textOutputTokens,
        imageOutputTokens: call.usage.imageOutputTokens,
        renderCredits: null,
      },
      dollarStatus: priced.dollarStatus,
      costUsd: priced.costUsd,
      rateSource: priced.rateSource,
      packageRevisionRound: context.packageRevisionRound,
      sharesPackageRevisionRounds: true,
      separateExtraRevisionAllowance: false,
      deliveryState: context.deliveryState,
      at: context.at,
    };
  });
}

export function qualityUsageLine(
  context: FulfillmentUsageContext,
  outcome: "passed" | "below_standard",
  attemptCount: number,
): FulfillmentUsageLine {
  return {
    lineId: `${context.campaignId}|${context.extraId}|${context.unitId}|quality|${attemptCount}|${outcome}`,
    campaignId: context.campaignId,
    packageId: context.packageId,
    extraId: context.extraId,
    selectedExtras: [...context.selectedExtras],
    unitId: context.unitId,
    productionLine: context.productionLine,
    kind: "quality_check",
    provider: "studio_quality",
    model: null,
    purpose: "quality_check",
    attempt: attemptCount,
    httpStatus: null,
    billable: false,
    usage: emptyUsage(),
    dollarStatus: "UNKNOWN",
    costUsd: null,
    rateSource: "no_invoice",
    packageRevisionRound: context.packageRevisionRound,
    sharesPackageRevisionRounds: true,
    separateExtraRevisionAllowance: false,
    deliveryState: context.deliveryState,
    at: context.at,
  };
}

/** A refund line exists only after a Courtesy Adjustment has actually been issued. */
export function refundUsageLine(
  truth: CampaignStudioExtras,
  campaignId: string,
): FulfillmentUsageLine[] {
  const courtesy = truth.courtesy;
  if (!courtesy || courtesy.status !== "issued" || courtesy.paymentExecution !== "completed") {
    return [];
  }
  return [
    {
      lineId: `${campaignId}|courtesy-issued|${courtesy.computedAt}|${courtesy.totalAdjustmentCents}`,
      campaignId,
      packageId: truth.packageId,
      extraId: null,
      selectedExtras: [...truth.selected],
      unitId: null,
      productionLine: "courtesy_adjustment",
      kind: "refund",
      provider: "stripe",
      model: null,
      purpose: "courtesy_adjustment",
      attempt: 1,
      httpStatus: null,
      billable: true,
      usage: emptyUsage(),
      dollarStatus: "DERIVED",
      costUsd: courtesy.totalAdjustmentCents / 100,
      rateSource: "courtesy_policy_of_amount_paid",
      packageRevisionRound: null,
      sharesPackageRevisionRounds: true,
      separateExtraRevisionAllowance: false,
      deliveryState: "package",
      at: courtesy.computedAt,
    },
  ];
}

export function appendFulfillmentUsage(
  truth: CampaignStudioExtras,
  lines: readonly FulfillmentUsageLine[],
): CampaignStudioExtras {
  if (lines.length === 0) return truth;
  const existing = truth.fulfillmentUsage ?? [];
  const seen = new Set(existing.map((line) => line.lineId));
  const added = lines.filter((line) => {
    if (seen.has(line.lineId)) return false;
    seen.add(line.lineId);
    return true;
  });
  if (added.length === 0) return truth;
  return { ...truth, fulfillmentUsage: [...existing, ...added] };
}

export function providerTokenTotal(
  lines: readonly FulfillmentUsageLine[],
  field: keyof FulfillmentUsageLine["usage"],
): number {
  return lines
    .filter((line) => line.kind === "provider_usage")
    .reduce((sum, line) => sum + (typeof line.usage[field] === "number" ? line.usage[field] : 0), 0);
}
