import type { CampaignRecord } from "@/config/studio-board";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";

import { applyPaidTruthToCampaignRecord } from "./apply-paid-record";
import {
  normalizeCurrency,
  skuSetsMatch,
} from "./amount";
import {
  readCheckoutSessionBinding,
  readProcessedPaymentEvent,
  writeProcessedPaymentEvent,
} from "./events-store";
import type { PaymentConfirmationInput, PaymentConfirmationResult } from "./types";

function alreadyConfirmed(campaign: CampaignRecord): boolean {
  return Boolean(
    campaign.paymentReceivedAt &&
      campaign.paymentTruth?.status === "confirmed",
  );
}

/**
 * Authoritative paid write — webhook / reconcile / sandbox only.
 * Fail-closed on amount, currency, project, SKU, decision, or session reuse.
 */
export async function confirmPaymentFromProcessor(
  input: PaymentConfirmationInput,
): Promise<PaymentConfirmationResult> {
  if (
    !input.campaignId ||
    !input.checkoutSessionId ||
    !input.decisionId ||
    !input.authorization?.paymentAuthorized
  ) {
    return {
      ok: false,
      error: "invalid_evidence",
      message: "Payment confirmation is missing required processor evidence.",
    };
  }

  if (input.authorization.outcome !== "CLEAR_TO_ACCEPT") {
    return {
      ok: false,
      error: "not_clear_bound",
      message: studioPaymentV1.customerCopy.clearRequired,
    };
  }

  if (normalizeCurrency(input.currency) !== studioPaymentV1.currency) {
    return {
      ok: false,
      error: "currency_mismatch",
      message: "Payment currency does not match Studio checkout currency.",
    };
  }

  if (input.confirmedAmountCents !== input.expectedAmountCents) {
    return {
      ok: false,
      error: "amount_mismatch",
      message: "Processor-confirmed amount does not match Studio expected amount.",
    };
  }

  const binding = await readCheckoutSessionBinding(input.checkoutSessionId);
  if (binding) {
    if (binding.campaignId !== input.campaignId) {
      return {
        ok: false,
        error: "transaction_reuse",
        message: "This checkout session is bound to a different project.",
      };
    }
    if (binding.expectedAmountCents !== input.expectedAmountCents) {
      return {
        ok: false,
        error: "amount_mismatch",
        message: "Checkout session amount does not match confirmation.",
      };
    }
    if (!skuSetsMatch(binding.selectedServiceIds, input.selectedServiceIds)) {
      return {
        ok: false,
        error: "sku_mismatch",
        message: "Checkout session SKUs do not match confirmation.",
      };
    }
    if (binding.decisionId !== input.decisionId) {
      return {
        ok: false,
        error: "decision_mismatch",
        message: "Checkout session decision does not match confirmation.",
      };
    }
  }

  const eventId =
    input.stripeEventId ??
    `session:${input.checkoutSessionId}:confirmed`;
  const priorEvent = await readProcessedPaymentEvent(eventId);

  const envelope = await readCampaignEnvelope(input.campaignId);
  if (!envelope?.record) {
    return {
      ok: false,
      error: "campaign_not_found",
      message: "No campaign exists for this payment confirmation.",
    };
  }

  const campaign = envelope.record;
  if (campaign.campaignId !== input.campaignId) {
    return {
      ok: false,
      error: "project_mismatch",
      message: "Campaign identity mismatch.",
    };
  }

  if (
    campaign.paymentTruth?.checkoutSessionId &&
    campaign.paymentTruth.checkoutSessionId !== input.checkoutSessionId &&
    alreadyConfirmed(campaign)
  ) {
    return {
      ok: false,
      error: "transaction_reuse",
      message: "Campaign is already paid under a different checkout session.",
    };
  }

  if (alreadyConfirmed(campaign) || priorEvent) {
    await writeProcessedPaymentEvent({
      eventId,
      campaignId: input.campaignId,
      checkoutSessionId: input.checkoutSessionId,
      processedAt: new Date().toISOString(),
      kind: input.sandbox ? "sandbox" : input.stripeEventId ? "stripe_webhook" : "reconcile",
    });
    return { ok: true, campaign, alreadyPaid: true };
  }

  if (
    campaign.paymentTruth?.selectedServiceIds?.length &&
    !skuSetsMatch(campaign.paymentTruth.selectedServiceIds, input.selectedServiceIds)
  ) {
    return {
      ok: false,
      error: "sku_mismatch",
      message: "Payment SKUs do not match the checkout binding on the campaign.",
    };
  }

  const updated = applyPaidTruthToCampaignRecord(campaign, input);
  const saved = await upsertCampaignRecord(updated, envelope.clientUserId);
  await writeProcessedPaymentEvent({
    eventId,
    campaignId: input.campaignId,
    checkoutSessionId: input.checkoutSessionId,
    processedAt: new Date().toISOString(),
    kind: input.sandbox ? "sandbox" : input.stripeEventId ? "stripe_webhook" : "reconcile",
  });

  return { ok: true, campaign: saved.record, alreadyPaid: false };
}
