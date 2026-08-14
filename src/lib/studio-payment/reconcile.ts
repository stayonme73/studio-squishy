import Stripe from "stripe";

import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";

import { confirmPaymentFromProcessor } from "./confirm";
import {
  assertStripeSafeForTests,
  isStripeConfigured,
  readStripeSecretKey,
} from "./env";
import { readCheckoutSessionBinding } from "./events-store";
import type { ReconcileCheckoutResult } from "./types";

/**
 * Server retrieval after browser return — may establish paid truth when webhook
 * is delayed. Success page itself is never authority; this is.
 */
export async function reconcileCheckoutSession(
  checkoutSessionId: string,
  options?: {
    stripe?: Pick<Stripe, "checkout">;
    env?: NodeJS.ProcessEnv;
  },
): Promise<ReconcileCheckoutResult> {
  const env = options?.env ?? process.env;
  assertStripeSafeForTests(env);

  if (!checkoutSessionId) {
    return {
      ok: false,
      error: "invalid_request",
      message: "checkout session id is required",
    };
  }

  const binding = await readCheckoutSessionBinding(checkoutSessionId);
  if (!binding) {
    return {
      ok: false,
      error: "unknown_session",
      message: "Unknown checkout session.",
    };
  }

  const envelope = await readCampaignEnvelope(binding.campaignId);

  // Paid-cycle sessions: campaign-level paymentReceivedAt must NOT short-circuit.
  // Only a confirmed ledger row for this session/purchase is authority.
  if (binding.purchaseKind === "paid_cycle" && binding.paidCyclePurchaseId) {
    const row = envelope?.record.paidCyclePurchases?.find(
      (entry) =>
        entry.paidCyclePurchaseId === binding.paidCyclePurchaseId &&
        entry.checkoutSessionId === checkoutSessionId,
    );
    if (row?.status === "confirmed") {
      return {
        ok: true,
        status: "confirmed",
        paid: true,
        campaign: envelope?.record ?? null,
        checkoutSessionId,
        message: studioPaymentV1.customerCopy.paymentConfirmed,
      };
    }
  } else if (envelope?.record.paymentReceivedAt) {
    return {
      ok: true,
      status: "confirmed",
      paid: true,
      campaign: envelope.record,
      checkoutSessionId,
      message: studioPaymentV1.customerCopy.paymentConfirmed,
    };
  }

  if (binding.sandbox) {
    return {
      ok: true,
      status: "pending",
      paid: false,
      campaign: envelope?.record ?? null,
      checkoutSessionId,
      message: studioPaymentV1.customerCopy.paymentPending,
    };
  }

  if (!isStripeConfigured(env)) {
    return {
      ok: false,
      error: "processor_not_configured",
      message: studioPaymentV1.customerCopy.processorNotConfigured,
    };
  }

  const secret = readStripeSecretKey(env)!;
  const stripe = options?.stripe ?? new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

  if (session.payment_status !== "paid" || session.status === "expired") {
    const status =
      session.status === "expired"
        ? "expired"
        : session.status === "open"
          ? "pending"
          : "unpaid";
    return {
      ok: true,
      status,
      paid: false,
      campaign: envelope?.record ?? null,
      checkoutSessionId,
      message:
        status === "expired"
          ? studioPaymentV1.customerCopy.paymentFailed
          : studioPaymentV1.customerCopy.paymentPending,
    };
  }

  const meta = studioPaymentV1.metadataKeys;
  const authorization = envelope?.record.preAcceptancePaymentAuthorization ?? {
    decisionId: binding.decisionId,
    outcome: "CLEAR_TO_ACCEPT" as const,
    paymentAuthorized: true as const,
    evaluatedDraftRevision: binding.draftRevision,
    selectedServiceIds: [...binding.selectedServiceIds],
    factFingerprint: binding.factFingerprint,
    decisionSchemaVersion: 1,
    evaluatedAt: binding.createdAt,
    authorizedAt: new Date().toISOString(),
    packageId: "custom-studio-plan",
  };

  const expectedAmountCents = Number(
    session.metadata?.[meta.amountCents] ?? binding.expectedAmountCents,
  );
  const confirmedAmountCents = session.amount_total ?? expectedAmountCents;

  const result = await confirmPaymentFromProcessor({
    campaignId: binding.campaignId,
    checkoutSessionId,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    expectedAmountCents,
    confirmedAmountCents,
    currency: session.currency ?? binding.currency,
    selectedServiceIds: binding.selectedServiceIds,
    decisionId: binding.decisionId,
    factFingerprint: binding.factFingerprint,
    draftRevision: binding.draftRevision,
    authorization,
    stripeEventId: null,
    sandbox: false,
    ...(binding.ma001CompositionSeal
      ? { ma001CompositionSeal: binding.ma001CompositionSeal }
      : {}),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      message: result.message,
    };
  }

  return {
    ok: true,
    status: "confirmed",
    paid: true,
    campaign: result.campaign,
    checkoutSessionId,
    message: studioPaymentV1.customerCopy.paymentConfirmed,
  };
}
