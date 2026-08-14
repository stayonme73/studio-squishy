import type { CampaignRecord } from "@/config/studio-board";
import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { ensureDispatchExecution } from "@/lib/studio-dispatch";

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
import { amountIncludesCyclePrice } from "./paid-cycle-amount";
import {
  findPaidCyclePurchase,
  findPaidCyclePurchaseBySession,
  upsertPaidCyclePurchase,
} from "./paid-cycle-ledger";
import type { PaidCyclePurchaseRecord } from "./paid-cycle-types";
import type { PaymentConfirmationInput, PaymentConfirmationResult } from "./types";

/**
 * Payment stays authoritative even when activation/routing/dispatch fails —
 * pending_retry is detectable and retriable on the next observation.
 *
 * Chain: ensureDispatchExecution → ensureRoutingHandoff → ensurePostPayActivation.
 */
async function activateAfterPayment(
  campaign: CampaignRecord,
): Promise<CampaignRecord> {
  const dispatched = await ensureDispatchExecution(campaign);
  return dispatched.campaign;
}

function alreadyConfirmed(campaign: CampaignRecord): boolean {
  return Boolean(
    campaign.paymentReceivedAt &&
      campaign.paymentTruth?.status === "confirmed",
  );
}

function confirmPaidCycleLedger(
  campaign: CampaignRecord,
  input: PaymentConfirmationInput,
  binding: NonNullable<Awaited<ReturnType<typeof readCheckoutSessionBinding>>>,
):
  | { ok: true; campaign: CampaignRecord; alreadyPaid: boolean }
  | { ok: false; error: PaymentConfirmationResult extends { ok: false } ? PaymentConfirmationResult["error"] : never; message: string } {
  const paidCyclePurchaseId = binding.paidCyclePurchaseId;
  if (!paidCyclePurchaseId) {
    return {
      ok: false,
      error: "paid_cycle_invalid",
      message: "Paid-cycle confirmation requires paidCyclePurchaseId on the checkout binding.",
    };
  }

  if (binding.purchaseKind !== "paid_cycle") {
    return {
      ok: false,
      error: "paid_cycle_invalid",
      message: "Checkout binding is not a paid-cycle purchase.",
    };
  }

  if (
    binding.cycleSkuId !== studioPaidCyclePaymentV1.skuId ||
    !input.selectedServiceIds.map(String).includes(studioPaidCyclePaymentV1.skuId)
  ) {
    return {
      ok: false,
      error: "sku_mismatch",
      message: "Paid-cycle confirmation requires sm-001-monthly.",
    };
  }

  const cyclePriceCents = binding.cyclePriceCents ?? 0;
  if (
    !amountIncludesCyclePrice(input.expectedAmountCents, cyclePriceCents) ||
    !amountIncludesCyclePrice(input.confirmedAmountCents, cyclePriceCents)
  ) {
    return {
      ok: false,
      error: "amount_mismatch",
      message: "Confirmed amount does not include the monthly cycle price.",
    };
  }

  const existing = findPaidCyclePurchase(campaign, paidCyclePurchaseId);
  if (!existing) {
    return {
      ok: false,
      error: "paid_cycle_invalid",
      message: "No initiated paid-cycle purchase exists for this purchase id.",
    };
  }

  if (existing.checkoutSessionId !== input.checkoutSessionId) {
    return {
      ok: false,
      error: "purchase_mismatch",
      message: "paidCyclePurchaseId is bound to a different checkout session.",
    };
  }

  if (existing.campaignId !== input.campaignId) {
    return {
      ok: false,
      error: "project_mismatch",
      message: "Paid-cycle purchase campaign mismatch.",
    };
  }

  if (existing.status === "confirmed") {
    return { ok: true, campaign, alreadyPaid: true };
  }

  const bySession = findPaidCyclePurchaseBySession(campaign, input.checkoutSessionId);
  if (
    bySession &&
    bySession.paidCyclePurchaseId !== paidCyclePurchaseId &&
    bySession.status === "confirmed"
  ) {
    return {
      ok: false,
      error: "transaction_reuse",
      message: "This checkout session already confirmed a different paid-cycle purchase.",
    };
  }

  // Reuse of a prior confirmed purchase id as a “new” cycle buy — fail closed.
  const duplicateConfirmedId = (campaign.paidCyclePurchases ?? []).some(
    (row) =>
      row.paidCyclePurchaseId === paidCyclePurchaseId &&
      row.status === "confirmed" &&
      row.checkoutSessionId !== input.checkoutSessionId,
  );
  if (duplicateConfirmedId) {
    return {
      ok: false,
      error: "purchase_mismatch",
      message: "This paidCyclePurchaseId was already confirmed for another session.",
    };
  }

  const now = input.confirmedAt ?? new Date().toISOString();
  const confirmed: PaidCyclePurchaseRecord = {
    ...existing,
    status: "confirmed",
    expectedAmountCents: input.expectedAmountCents,
    confirmedAt: now,
    paymentIntentId: input.paymentIntentId ?? existing.paymentIntentId ?? null,
    stripeEventId: input.stripeEventId ?? existing.stripeEventId ?? null,
    sandbox: input.sandbox === true,
  };

  return {
    ok: true,
    campaign: upsertPaidCyclePurchase(campaign, confirmed),
    alreadyPaid: false,
  };
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

  const isPaidCycle = binding?.purchaseKind === "paid_cycle";

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

  // Studio-plan: one campaign paymentTruth session. Paid-cycle N+1 uses a new session.
  if (
    !isPaidCycle &&
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

  if (isPaidCycle) {
    if (!binding?.paidCyclePurchaseId) {
      return {
        ok: false,
        error: "paid_cycle_invalid",
        message: "Paid-cycle checkout binding is missing paidCyclePurchaseId.",
      };
    }

    const ledger = confirmPaidCycleLedger(campaign, input, binding);
    if (!ledger.ok) {
      return ledger;
    }

    let working = ledger.campaign;
    const cycleAlready = ledger.alreadyPaid;

    // First-time campaign payment may still write sealed paymentTruth.
    // N+1 must NOT overwrite campaign paymentTruth / invent lifetime monthly authority.
    if (!alreadyConfirmed(working)) {
      working = applyPaidTruthToCampaignRecord(working, input);
    }

    await writeProcessedPaymentEvent({
      eventId,
      campaignId: input.campaignId,
      checkoutSessionId: input.checkoutSessionId,
      processedAt: new Date().toISOString(),
      kind: input.sandbox ? "sandbox" : input.stripeEventId ? "stripe_webhook" : "reconcile",
    });

    const saved = await upsertCampaignRecord(working, envelope.clientUserId);
    const activated = await activateAfterPayment(saved.record);
    return {
      ok: true,
      campaign: activated,
      alreadyPaid: cycleAlready || Boolean(priorEvent && cycleAlready),
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
    // Recovery: paid but asleep / pending_retry wakes on duplicate observe.
    const activated = alreadyConfirmed(campaign)
      ? await activateAfterPayment(campaign)
      : campaign;
    return { ok: true, campaign: activated, alreadyPaid: true };
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

  const activated = await activateAfterPayment(saved.record);
  return { ok: true, campaign: activated, alreadyPaid: false };
}
