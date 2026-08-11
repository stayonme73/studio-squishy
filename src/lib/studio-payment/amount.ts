import type { ServiceId } from "@/catalog/types";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { computePlanPricingTotals } from "@/lib/plan-pricing";

/** Server-derived amount due today — never trust client-posted cents. */
export function deriveCheckoutAmountCents(
  selectedServiceIds: readonly string[],
): {
  ok: true;
  amountCents: number;
  currency: "usd";
  skuIds: ServiceId[];
} | {
  ok: false;
  reason: "empty_selection" | "zero_amount";
} {
  const skuIds = selectedServiceIds.map(String) as ServiceId[];
  if (skuIds.length === 0) {
    return { ok: false, reason: "empty_selection" };
  }
  const totals = computePlanPricingTotals(skuIds);
  if (totals.amountDueTodayCents <= 0) {
    return { ok: false, reason: "zero_amount" };
  }
  return {
    ok: true,
    amountCents: totals.amountDueTodayCents,
    currency: studioPaymentV1.currency,
    skuIds,
  };
}

export function normalizeCurrency(currency: string): string {
  return currency.trim().toLowerCase();
}

export function skuIdsKey(selectedServiceIds: readonly string[]): string {
  return [...selectedServiceIds].map(String).sort().join(",");
}

export function skuSetsMatch(
  a: readonly string[],
  b: readonly string[],
): boolean {
  return skuIdsKey(a) === skuIdsKey(b);
}
