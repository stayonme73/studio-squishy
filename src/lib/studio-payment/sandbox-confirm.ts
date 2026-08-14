import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { isPaymentSandboxAvailable } from "@/lib/payment-sandbox";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";

import { confirmPaymentFromProcessor } from "./confirm";
import { isStripeConfigured } from "./env";
import { readCheckoutSessionBinding } from "./events-store";
import type { PaymentConfirmationResult } from "./types";

/**
 * Dev/preview only — establishes paid truth through the same confirmation path
 * as Stripe, with synthetic session identity. Never available when live Stripe
 * keys are configured (prevents accidental dual brains).
 */
export async function confirmSandboxCheckoutSession(
  checkoutSessionId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<PaymentConfirmationResult> {
  if (!isPaymentSandboxAvailable()) {
    return {
      ok: false,
      error: "invalid_evidence",
      message: "Sandbox payment confirmation is not available in this environment.",
    };
  }

  if (isStripeConfigured(env)) {
    return {
      ok: false,
      error: "invalid_evidence",
      message:
        "Sandbox confirmation is disabled while Stripe keys are configured. Use Stripe test mode.",
    };
  }

  if (!checkoutSessionId.startsWith("cs_sandbox_")) {
    return {
      ok: false,
      error: "invalid_evidence",
      message: "Not a sandbox checkout session.",
    };
  }

  const binding = await readCheckoutSessionBinding(checkoutSessionId);
  if (!binding?.sandbox) {
    return {
      ok: false,
      error: "invalid_evidence",
      message: "Unknown sandbox checkout session.",
    };
  }

  const envelope = await readCampaignEnvelope(binding.campaignId);
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

  return confirmPaymentFromProcessor({
    campaignId: binding.campaignId,
    checkoutSessionId,
    paymentIntentId: `pi_sandbox_${checkoutSessionId}`,
    expectedAmountCents: binding.expectedAmountCents,
    confirmedAmountCents: binding.expectedAmountCents,
    currency: binding.currency,
    selectedServiceIds: binding.selectedServiceIds,
    decisionId: binding.decisionId,
    factFingerprint: binding.factFingerprint,
    draftRevision: binding.draftRevision,
    authorization,
    stripeEventId: `evt_sandbox_${checkoutSessionId}`,
    sandbox: true,
    ...(binding.ma001CompositionSeal
      ? { ma001CompositionSeal: binding.ma001CompositionSeal }
      : {}),
    ...(binding.rmj002KitSeal ? { rmj002KitSeal: binding.rmj002KitSeal } : {}),
  });
}

export function sandboxBlockedMessage(): string {
  return studioPaymentV1.customerCopy.legacyPaidBlocked;
}
