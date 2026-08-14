import { getServiceById, getServicePriceCents } from "@/catalog/accessors";
import type { ServiceId } from "@/catalog/types";
import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";
import { studioPaymentV1 } from "@/config/studio-payment-v1";

export type PaidCycleAmountResult =
  | {
      ok: true;
      amountCents: number;
      cyclePriceCents: number;
      currency: "usd";
      skuIds: ServiceId[];
      cycleSkuId: typeof studioPaidCyclePaymentV1.skuId;
    }
  | {
      ok: false;
      reason:
        | "empty_selection"
        | "missing_cycle_sku"
        | "wrong_cycle_sku"
        | "zero_amount"
        | "cycle_price_not_included";
    };

/**
 * Amount for an explicit paid-cycle Checkout.
 * Charges catalog prices for every selected SKU (one-time + this cycle’s monthly),
 * so sm-001-monthly cannot ride as an unpaid entitlement label.
 */
export function derivePaidCycleCheckoutAmountCents(
  selectedServiceIds: readonly string[],
): PaidCycleAmountResult {
  const skuIds = selectedServiceIds.map(String) as ServiceId[];
  if (skuIds.length === 0) {
    return { ok: false, reason: "empty_selection" };
  }

  const cycleSkuId = studioPaidCyclePaymentV1.skuId;
  if (!skuIds.includes(cycleSkuId)) {
    return { ok: false, reason: "missing_cycle_sku" };
  }

  const cycleService = getServiceById(cycleSkuId);
  if (!cycleService || cycleService.billingType !== "monthly") {
    return { ok: false, reason: "wrong_cycle_sku" };
  }

  let amountCents = 0;
  for (const id of skuIds) {
    const service = getServiceById(id);
    if (!service) continue;
    amountCents += getServicePriceCents(id);
  }

  const cyclePriceCents = getServicePriceCents(cycleSkuId);
  if (amountCents <= 0) {
    return { ok: false, reason: "zero_amount" };
  }
  if (amountCents < cyclePriceCents || cyclePriceCents <= 0) {
    return { ok: false, reason: "cycle_price_not_included" };
  }

  return {
    ok: true,
    amountCents,
    cyclePriceCents,
    currency: studioPaymentV1.currency,
    skuIds,
    cycleSkuId,
  };
}

export function amountIncludesCyclePrice(
  expectedAmountCents: number,
  cyclePriceCents: number,
): boolean {
  return (
    Number.isFinite(expectedAmountCents) &&
    Number.isFinite(cyclePriceCents) &&
    cyclePriceCents > 0 &&
    expectedAmountCents >= cyclePriceCents
  );
}
