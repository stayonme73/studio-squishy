/**
 * Studio Payment Truth V1 — Stripe Checkout (hosted).
 * Money truth is processor-authoritative. Browser return is not fulfillment.
 */

export const studioPaymentV1 = {
  packageId: "STUDIO-OPERATING-PAYMENT-TRUTH-1",
  processor: "stripe" as const,
  integration: "checkout_hosted" as const,
  currency: "usd" as const,
  /** Stripe Checkout Session metadata keys (keep values short). */
  metadataKeys: {
    campaignId: "studio_campaign_id",
    decisionId: "studio_decision_id",
    factFingerprint: "studio_fact_fingerprint",
    amountCents: "studio_amount_cents",
    currency: "studio_currency",
    skuIds: "studio_sku_ids",
    draftRevision: "studio_draft_revision",
    /** Additive paid-cycle keys — see studioPaidCyclePaymentV1.metadataKeys. */
    purchaseKind: "studio_purchase_kind",
    paidCyclePurchaseId: "studio_paid_cycle_purchase_id",
    cycleSkuId: "studio_cycle_sku_id",
    cyclePriceCents: "studio_cycle_price_cents",
  } as const,
  env: {
    secretKey: "STRIPE_SECRET_KEY",
    webhookSecret: "STRIPE_WEBHOOK_SECRET",
    publishableKey: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    /** Optional explicit mode; otherwise inferred from secret key prefix. */
    mode: "STRIPE_MODE",
  } as const,
  routes: {
    createCheckoutSession: "/api/payments/checkout-session",
    webhook: "/api/payments/webhook",
    reconcile: "/api/payments/reconcile",
    sandboxConfirm: "/api/payments/sandbox-confirm",
  } as const,
  customerCopy: {
    processorNotConfigured:
      "Card payment is not ready yet. Please try again later or contact The Studio.",
    processorCredentialsInvalid:
      "Card payment could not open. Please try again later or contact The Studio.",
    processorSessionFailed:
      "Checkout could not start. Your project is still saved — try again later or contact The Studio.",
    clearRequired:
      "Your project needs a clear go-ahead before checkout can open. Return to Studio Plan to resolve what is still open.",
    amountInvalid:
      "Checkout could not start because the investment amount could not be confirmed.",
    paymentPending:
      "We are confirming your payment with the processor. This page alone is not proof of payment.",
    paymentConfirmed: "Payment confirmed. You can continue to Project Intake.",
    paymentCancelled:
      "Checkout was cancelled. Your project is still saved — you can try payment again when ready.",
    paymentFailed:
      "Payment was not completed. Your project is still saved — you can try again when ready.",
    legacyPaidBlocked:
      "Local checkout can no longer mark a project paid. Payment must be confirmed by Stripe.",
    sandboxFixtureOnly:
      "Developer sandbox confirm is a local fixture only. It does not open Stripe Checkout and does not prove Stripe integration.",
  } as const,
} as const;

export type StudioPaymentProcessor = typeof studioPaymentV1.processor;
export type StudioPaymentStatus =
  | "initiated"
  | "pending"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "expired";
