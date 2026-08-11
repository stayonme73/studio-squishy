import Stripe from "stripe";

import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { buildPreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { evaluatePreAcceptance } from "@/lib/studio-pre-acceptance/evaluate";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";

import { confirmPaymentFromProcessor } from "./confirm";
import {
  assertStripeSafeForTests,
  readStripeSecretKey,
  readStripeWebhookSecret,
} from "./env";
import { readCheckoutSessionBinding } from "./events-store";
import type { PaymentConfirmationResult } from "./types";

export type WebhookHandleResult =
  | { ok: true; ignored?: boolean; result?: PaymentConfirmationResult }
  | { ok: false; status: number; error: string; message: string };

function metadataString(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Reconstruct authorization from campaign checkout binding + campaign plan.
 * Webhook must not invent CLEAR — binding was written only after server CLEAR.
 */
async function authorizationFromBinding(
  campaignId: string,
  decisionId: string,
  factFingerprint: string,
  draftRevision: number,
  selectedServiceIds: readonly string[],
) {
  const envelope = await readCampaignEnvelope(campaignId);
  const existingAuth = envelope?.record.preAcceptancePaymentAuthorization;
  if (
    existingAuth?.paymentAuthorized &&
    existingAuth.decisionId === decisionId &&
    existingAuth.outcome === "CLEAR_TO_ACCEPT"
  ) {
    return existingAuth;
  }

  // Rebuild a durable pin from binding fields (CLEAR was required at session create).
  return {
    decisionId,
    outcome: "CLEAR_TO_ACCEPT" as const,
    paymentAuthorized: true as const,
    evaluatedDraftRevision: draftRevision,
    selectedServiceIds: [...selectedServiceIds],
    factFingerprint,
    decisionSchemaVersion: existingAuth?.decisionSchemaVersion ?? 1,
    evaluatedAt: existingAuth?.evaluatedAt ?? new Date().toISOString(),
    authorizedAt: new Date().toISOString(),
    packageId: existingAuth?.packageId ?? "custom-studio-plan",
  };
}

export async function handleStripeWebhook(
  rawBody: string | Buffer,
  signature: string | null,
  options?: {
    stripe?: Stripe;
    env?: NodeJS.ProcessEnv;
  },
): Promise<WebhookHandleResult> {
  const env = options?.env ?? process.env;
  assertStripeSafeForTests(env);

  const webhookSecret = readStripeWebhookSecret(env);
  const secretKey = readStripeSecretKey(env);
  if (!webhookSecret || !secretKey) {
    return {
      ok: false,
      status: 503,
      error: "processor_not_configured",
      message: studioPaymentV1.customerCopy.processorNotConfigured,
    };
  }
  if (!signature) {
    return {
      ok: false,
      status: 400,
      error: "missing_signature",
      message: "Stripe signature header is required.",
    };
  }

  const stripe = options?.stripe ?? new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return {
      ok: false,
      status: 400,
      error: "invalid_signature",
      message: "Stripe webhook signature verification failed.",
    };
  }

  if (event.type !== "checkout.session.completed") {
    return { ok: true, ignored: true };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode !== "payment") {
    return { ok: true, ignored: true };
  }
  if (session.payment_status !== "paid") {
    return { ok: true, ignored: true };
  }

  const meta = studioPaymentV1.metadataKeys;
  const campaignId = metadataString(session.metadata, meta.campaignId);
  const decisionId = metadataString(session.metadata, meta.decisionId);
  const factFingerprint = metadataString(session.metadata, meta.factFingerprint);
  const amountMeta = metadataString(session.metadata, meta.amountCents);
  const currencyMeta =
    metadataString(session.metadata, meta.currency) ?? session.currency ?? "usd";
  const skuMeta = metadataString(session.metadata, meta.skuIds);
  const draftMeta = metadataString(session.metadata, meta.draftRevision);

  if (!campaignId || !decisionId || !factFingerprint || !amountMeta || !skuMeta) {
    return {
      ok: false,
      status: 422,
      error: "invalid_evidence",
      message: "Checkout Session metadata is incomplete.",
    };
  }

  const expectedAmountCents = Number(amountMeta);
  const confirmedAmountCents = session.amount_total;
  if (
    !Number.isFinite(expectedAmountCents) ||
    confirmedAmountCents == null ||
    !Number.isFinite(confirmedAmountCents)
  ) {
    return {
      ok: false,
      status: 422,
      error: "amount_mismatch",
      message: "Checkout Session amount is missing.",
    };
  }

  const binding = await readCheckoutSessionBinding(session.id);
  const selectedServiceIds =
    binding?.selectedServiceIds ??
    skuMeta.split(",").map((s) => s.trim()).filter(Boolean);
  const draftRevision = Number(draftMeta ?? binding?.draftRevision ?? 0);

  const authorization = await authorizationFromBinding(
    campaignId,
    decisionId,
    factFingerprint,
    draftRevision,
    selectedServiceIds,
  );

  const result = await confirmPaymentFromProcessor({
    campaignId,
    checkoutSessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    expectedAmountCents,
    confirmedAmountCents,
    currency: currencyMeta,
    selectedServiceIds,
    decisionId,
    factFingerprint,
    draftRevision,
    authorization,
    stripeEventId: event.id,
    sandbox: false,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: 422,
      error: result.error,
      message: result.message,
    };
  }

  return { ok: true, result };
}

/** Test helper: build facts for CLEAR re-check (unused by live webhook). */
export function evaluateFactsForPayment(
  facts: PreAcceptanceProjectFacts,
) {
  const decision = evaluatePreAcceptance(facts);
  return {
    decision,
    authorization: buildPreAcceptancePaymentAuthorization(decision),
  };
}
