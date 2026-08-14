import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioPaymentStatus } from "@/config/studio-payment-v1";
import type { PreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

export type CheckoutPurchaseKind = "studio_plan" | "paid_cycle";

export type CheckoutSessionCreateRequest = {
  campaignId: string;
  /** Material facts for server-side CLEAR re-evaluation. */
  facts: PreAcceptanceProjectFacts;
  /**
   * Optional client-built authorization; server re-asserts CLEAR and rebuilds
   * the durable pin from the current decision.
   */
  authorization?: PreAcceptancePaymentAuthorization | null;
  /** Absolute origin for success/cancel URLs (e.g. https://example.com). */
  returnOrigin: string;
  /** Optional display email for Stripe Checkout. */
  customerEmail?: string;
  /**
   * Local/dev fixture only. When true (and sandbox is available), creates a
   * synthetic session for /api/payments/sandbox-confirm — never Stripe hosted Checkout.
   * Complete Checkout must omit this and require a real Stripe session URL.
   */
  preferSandbox?: boolean;
  /**
   * `paid_cycle` — explicit sm-001-monthly pay-per-cycle purchase (Cycle 1 or N+1).
   * Default `studio_plan` preserves sealed Payment Truth checkout behavior.
   */
  purchaseKind?: CheckoutPurchaseKind;
  /**
   * ma-001 Promotion Pack — locked composition required when ma-001 is selected.
   * Server re-validates; client cannot invent a default pack.
   */
  ma001PackComposition?: import("@/lib/studio-design-renderer/ma-001-intake-truth").Ma001LiveCompositionInput
    | import("@/lib/studio-design-renderer/ma-001-intake-truth").Ma001CompositionLiveTruth
    | null;
  /**
   * rm-j002 Social Profile Setup Kit — platform + facts lock required when selected.
   * Server re-validates; client cannot invent a default platform kit.
   */
  rmj002KitLock?: import("@/lib/studio-design-renderer/rm-j002-intake-truth").RmJ002LiveKitLockInput
    | import("@/lib/studio-design-renderer/rm-j002-intake-truth").RmJ002KitLiveTruth
    | null;
  /**
   * rm-j008 Social Profile Update Kit — platform + customer-supplied before-state
   * + full replacement membership lock required when selected.
   */
  rmj008KitLock?: import("@/lib/studio-design-renderer/rm-j008-intake-truth").RmJ008LiveKitLockInput
    | import("@/lib/studio-design-renderer/rm-j008-intake-truth").RmJ008KitLiveTruth
    | null;
};

export type CheckoutSessionCreateResult =
  | {
      ok: true;
      mode: "stripe";
      checkoutSessionId: string;
      url: string;
      expectedAmountCents: number;
      currency: "usd";
      campaignId: string;
      purchaseKind?: CheckoutPurchaseKind;
      paidCyclePurchaseId?: string;
      cyclePriceCents?: number;
    }
  | {
      ok: true;
      mode: "sandbox";
      checkoutSessionId: string;
      /** Client confirms via sandbox-confirm — not paid until then. */
      sandboxConfirmRequired: true;
      expectedAmountCents: number;
      currency: "usd";
      campaignId: string;
      purchaseKind?: CheckoutPurchaseKind;
      paidCyclePurchaseId?: string;
      cyclePriceCents?: number;
    }
  | {
      ok: false;
      error:
        | "processor_not_configured"
        | "processor_credentials_invalid"
        | "processor_session_failed"
        | "clear_required"
        | "amount_invalid"
        | "campaign_mismatch"
        | "already_paid"
        | "invalid_request"
        | "paid_cycle_invalid"
        | "ma001_composition_required"
        | "rmj002_kit_lock_required"
        | "rmj008_kit_lock_required";
      message: string;
    };

export type PaymentConfirmationInput = {
  campaignId: string;
  checkoutSessionId: string;
  paymentIntentId?: string | null;
  expectedAmountCents: number;
  confirmedAmountCents: number;
  currency: string;
  selectedServiceIds: readonly string[];
  decisionId: string;
  factFingerprint: string;
  draftRevision: number;
  authorization: PreAcceptancePaymentAuthorization;
  stripeEventId?: string | null;
  sandbox?: boolean;
  confirmedAt?: string;
  /**
   * Must match checkout binding seal when ma-001 was purchased.
   */
  ma001CompositionSeal?: import("@/lib/studio-design-renderer/ma-001-composition-payment-gate").Ma001CompositionPaymentSeal
    | null;
  /**
   * Must match checkout binding seal when rm-j002 was purchased.
   */
  rmj002KitSeal?: import("@/lib/studio-design-renderer/rm-j002-kit-payment-gate").RmJ002KitPaymentSeal
    | null;
  /**
   * Must match checkout binding seal when rm-j008 was purchased.
   */
  rmj008KitSeal?: import("@/lib/studio-design-renderer/rm-j008-kit-payment-gate").RmJ008KitPaymentSeal
    | null;
};

export type PaymentConfirmationResult =
  | {
      ok: true;
      campaign: CampaignRecord;
      alreadyPaid: boolean;
    }
  | {
      ok: false;
      error:
        | "campaign_not_found"
        | "amount_mismatch"
        | "currency_mismatch"
        | "project_mismatch"
        | "sku_mismatch"
        | "decision_mismatch"
        | "transaction_reuse"
        | "not_clear_bound"
        | "invalid_evidence"
        | "paid_cycle_invalid"
        | "purchase_mismatch";
      message: string;
    };

export type ReconcileCheckoutResult =
  | {
      ok: true;
      status: StudioPaymentStatus | "unpaid";
      paid: boolean;
      campaign: CampaignRecord | null;
      checkoutSessionId: string;
      message: string;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

export type CheckoutBindingSnapshot = {
  campaignId: string;
  selectedServiceIds: readonly ServiceId[];
  expectedAmountCents: number;
  currency: "usd";
  decisionId: string;
  factFingerprint: string;
  draftRevision: number;
  authorization: PreAcceptancePaymentAuthorization;
};
