import type { ServiceId } from "@/catalog/types";
import type { PaidCyclePurchaseStatus } from "@/config/studio-paid-cycle-payment-v1";
import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";

export type PaidCyclePurchaseKind = typeof studioPaidCyclePaymentV1.purchaseKind;

/**
 * Durable paid-cycle purchase authority — one row per explicit cycle buy.
 * Confirmed rows authorize exactly one sm-001-monthly cycle purchase.
 * productionCycleId is NOT created here.
 */
export type PaidCyclePurchaseRecord = {
  schemaVersion: typeof studioPaidCyclePaymentV1.schemaVersion;
  paidCyclePurchaseId: string;
  campaignId: string;
  skuId: typeof studioPaidCyclePaymentV1.skuId;
  purchaseKind: PaidCyclePurchaseKind;
  status: PaidCyclePurchaseStatus;
  /** Full Checkout Session expected amount (may include bundled one-time SKUs). */
  expectedAmountCents: number;
  /** Catalog price for sm-001-monthly at bind time — must be covered by expectedAmountCents. */
  cyclePriceCents: number;
  currency: "usd";
  checkoutSessionId: string;
  paymentIntentId?: string | null;
  stripeEventId?: string | null;
  selectedServiceIds: readonly ServiceId[];
  decisionId: string;
  factFingerprint: string;
  draftRevision: number;
  initiatedAt: string;
  confirmedAt?: string;
  sandbox?: boolean;
};
