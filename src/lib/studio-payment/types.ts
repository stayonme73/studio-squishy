import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioPaymentStatus } from "@/config/studio-payment-v1";
import type { PreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

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
        | "invalid_request";
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
        | "invalid_evidence";
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
