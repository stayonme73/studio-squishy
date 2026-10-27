import Stripe from "stripe";

import { studioPaymentV1 } from "@/config/studio-payment-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";

import {
  markProjectClaimReceiptDeliveredToBrowser,
  releaseUnclaimedBrowserClaimToken,
} from "@/lib/studio-project-claim/claim-receipts";
import { sealDisposableKitStripeTestProof } from "./disposable-kit-test-isolation";
import {
  assertStripeSafeForTests,
  isStripeConfigured,
  readStripeSecretKey,
} from "./env";
import { readCheckoutSessionBinding } from "./events-store";
import type { ReconcileCheckoutResult } from "./types";

/** Defer dispatch/design-renderer graph until post-payment wake is actually needed. */
async function wakePaidOperatingChain(record: CampaignRecord) {
  const { recoverPaidOperatingChain } = await import(
    "@/lib/studio-paid-activation-recovery"
  );
  return recoverPaidOperatingChain(record);
}

/**
 * Guest pay: the checkout session id is the payment identity Stripe already
 * gave this browser. Return the existing one-time claim token once.
 * A campaign id is not enough to reach this function.
 */
async function claimTokenForPayingBrowser(input: {
  campaignId: string;
  checkoutSessionId: string;
  clientUserId?: string | null;
  paid: boolean;
  customerEmail?: string | null;
  freshRawToken?: string | null;
}): Promise<string | null> {
  if (!input.paid || input.clientUserId) return null;
  const fresh = input.freshRawToken?.trim() || "";
  if (fresh) {
    await markProjectClaimReceiptDeliveredToBrowser(fresh);
    return fresh;
  }
  return releaseUnclaimedBrowserClaimToken({
    campaignId: input.campaignId,
    checkoutSessionId: input.checkoutSessionId,
    customerEmail: input.customerEmail,
  });
}

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
      const woken = envelope?.record
        ? await wakePaidOperatingChain(envelope.record)
        : null;
      const campaign = woken?.campaign ?? envelope?.record ?? null;
      const claimRawToken = await claimTokenForPayingBrowser({
        campaignId: binding.campaignId,
        checkoutSessionId,
        clientUserId: envelope?.clientUserId,
        paid: true,
        customerEmail: binding.customerEmail,
      });
      return {
        ok: true,
        status: "confirmed",
        paid: true,
        campaign,
        checkoutSessionId,
        message: studioPaymentV1.customerCopy.paymentConfirmed,
        claimRawToken,
      };
    }
  } else if (envelope?.record.paymentReceivedAt) {
    const woken = await wakePaidOperatingChain(envelope.record);
    const claimRawToken = await claimTokenForPayingBrowser({
      campaignId: binding.campaignId,
      checkoutSessionId,
      clientUserId: envelope.clientUserId,
      paid: true,
      customerEmail: binding.customerEmail,
    });
    return {
      ok: true,
      status: "confirmed",
      paid: true,
      campaign: woken.campaign,
      checkoutSessionId,
      message: studioPaymentV1.customerCopy.paymentConfirmed,
      claimRawToken,
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

  if (session.livemode === false && envelope?.record) {
    const sealed = sealDisposableKitStripeTestProof({
      campaign: envelope.record,
      checkoutSessionId,
      source: "stripe_retrieve",
      livemode: false,
      paymentStatus: "paid",
    });
    if (sealed) {
      await upsertCampaignRecord(sealed, envelope.clientUserId);
    }
  }

  const { confirmPaymentFromProcessor } = await import("./confirm");
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
    ...(binding.rmj002KitSeal ? { rmj002KitSeal: binding.rmj002KitSeal } : {}),
    ...(binding.rmj008KitSeal ? { rmj008KitSeal: binding.rmj008KitSeal } : {}),
    ...(binding.bf001PackageSeal
      ? { bf001PackageSeal: binding.bf001PackageSeal }
      : {}),
    ...(binding.rmj007UpdateSeal
      ? { rmj007UpdateSeal: binding.rmj007UpdateSeal }
      : {}),
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      message: result.message,
    };
  }

  const afterConfirm = await readCampaignEnvelope(binding.campaignId);
  const claimRawToken = await claimTokenForPayingBrowser({
    campaignId: binding.campaignId,
    checkoutSessionId,
    clientUserId: afterConfirm?.clientUserId ?? envelope?.clientUserId,
    paid: true,
    customerEmail: binding.customerEmail,
    freshRawToken: result.claimRawToken,
  });
  return {
    ok: true,
    status: "confirmed",
    paid: true,
    campaign: result.campaign,
    checkoutSessionId,
    message: studioPaymentV1.customerCopy.paymentConfirmed,
    claimRawToken,
  };
}
