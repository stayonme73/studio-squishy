/**
 * Pay-per-cycle payment authority for sm-001-monthly.
 * Supplements sealed Payment Truth — does not replace campaign-level paymentTruth.
 * Does not mint productionCycleId. Does not open Stripe subscriptions.
 */

export const studioPaidCyclePaymentV1 = {
  packageId: "STUDIO-OPERATING-DESIGN-SM-001-MONTHLY-PAID-CYCLE-PAYMENT-AUTHORITY-IMPLEMENT-1",
  schemaVersion: 1 as const,
  purchaseKind: "paid_cycle" as const,
  skuId: "sm-001-monthly" as const,
  /** Stripe Checkout Session metadata keys (additive to studioPaymentV1.metadataKeys). */
  metadataKeys: {
    purchaseKind: "studio_purchase_kind",
    paidCyclePurchaseId: "studio_paid_cycle_purchase_id",
    cycleSkuId: "studio_cycle_sku_id",
    cyclePriceCents: "studio_cycle_price_cents",
  } as const,
} as const;

export type PaidCyclePurchaseStatus =
  | "initiated"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "expired";
