/**
 * Guest / pre-account Project Intake submit.
 * Proof is the paid checkout session, not a signed-in user.
 * Does not claim ownership. After Intake is stamped, Machine re-evaluates
 * activation. Design Production runs only once the campaign is owned.
 */

import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID } from "@/config/studio-social-promo-current-door-contract-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { recoverPaidOperatingChain } from "@/lib/studio-paid-activation-recovery";
import { ensurePostPayActivation } from "@/lib/studio-post-pay-activation";
import { ensureRoutingHandoff } from "@/lib/studio-routing-handoff";
import { readCheckoutSessionBinding } from "@/lib/studio-payment/events-store";
import { disposableTestOperatingChainBlocked } from "@/lib/studio-payment/disposable-test-isolation-guards";

export type PaidIntakeSubmitInput = {
  checkoutSessionId: string;
  answers: RouteMapIntakeAnswers;
  submittedAt?: string;
};

export type PaidIntakeSubmitResult =
  | { ok: true; campaign: CampaignRecord; alreadySubmitted: boolean }
  | { ok: false; error: string; message: string };

export async function submitPaidIntakeByCheckoutSession(
  input: PaidIntakeSubmitInput,
): Promise<PaidIntakeSubmitResult> {
  const checkoutSessionId = input.checkoutSessionId.trim();
  if (!checkoutSessionId) {
    return {
      ok: false,
      error: "invalid_request",
      message: "checkoutSessionId is required.",
    };
  }

  const binding = await readCheckoutSessionBinding(checkoutSessionId);
  if (!binding) {
    return {
      ok: false,
      error: "invalid_evidence",
      message: "Unknown checkout session.",
    };
  }

  const envelope = await readCampaignEnvelope(binding.campaignId);
  if (!envelope) {
    return { ok: false, error: "not_found", message: "Project not found." };
  }

  const paid = Boolean(
    envelope.record.paymentReceivedAt ||
      envelope.record.paymentTruth?.status === "confirmed",
  );
  if (!paid) {
    return {
      ok: false,
      error: "payment_not_confirmed",
      message: "Project Intake can be submitted only after payment is confirmed.",
    };
  }

  if (envelope.record.paymentTruth?.checkoutSessionId !== checkoutSessionId) {
    return {
      ok: false,
      error: "invalid_evidence",
      message: "Checkout session does not match this project.",
    };
  }

  if (envelope.record.routeMapIntakeSubmittedAt) {
    const advanced = await advancePaidOperatingAfterSubmittedIntake(
      envelope.record,
      envelope.clientUserId ?? null,
    );
    return {
      ok: true,
      campaign: advanced,
      alreadySubmitted: true,
    };
  }

  const submittedAt = input.submittedAt ?? new Date().toISOString();
  const answers = {
    ...(envelope.record.routeMapIntakeDraft?.answers ?? {}),
    ...input.answers,
  };
  const updated: CampaignRecord = {
    ...envelope.record,
    routeMapIntake: { answers, submittedAt },
    routeMapIntakeDraft: undefined,
    routeMapIntakeSubmittedAt: submittedAt,
    routeMapContext: envelope.record.routeMapContext
      ? { ...envelope.record.routeMapContext, currentStep: "intake" }
      : envelope.record.routeMapContext,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription:
      studioBoard.statusContent.BUILDING_CONCEPTS.campaignDescription,
    estimatedCompletion:
      studioBoard.statusContent.BUILDING_CONCEPTS.estimatedCompletion,
    studioNotes: [
      ...(envelope.record.studioNotes ?? []),
      { date: "Today", message: "Project Intake received." },
    ],
    updatedAt: submittedAt,
  };

  const saved = await upsertCampaignRecord(updated, envelope.clientUserId);
  const advanced = await advancePaidOperatingAfterSubmittedIntake(
    saved.record,
    saved.clientUserId ?? envelope.clientUserId ?? null,
  );
  return { ok: true, campaign: advanced, alreadySubmitted: false };
}

async function advancePaidOperatingAfterSubmittedIntake(
  campaign: CampaignRecord,
  clientUserId: string | null,
): Promise<CampaignRecord> {
  if (disposableTestOperatingChainBlocked(campaign)) {
    return campaign;
  }

  let working = campaign;
  if (clientUserId) {
    const recovered = await recoverPaidOperatingChain(working, {
      identitySession: {
        sessionCurrentCampaignId: working.campaignId,
        sessionClientUserId: clientUserId,
        intakeCampaignId: working.campaignId,
      },
    });
    working = recovered.campaign;
  }

  // Always reconcile purchased jobs after submitted intake — even when recovery
  // reports already_clear and the task plan fingerprint is unchanged.
  const activated = await ensurePostPayActivation(working);
  if (!activated.ok) {
    return activated.campaign;
  }
  working = activated.campaign;

  const routed = await ensureRoutingHandoff(working);
  working = routed.campaign;

  const identitySession = clientUserId
    ? {
        sessionCurrentCampaignId: working.campaignId,
        sessionClientUserId: clientUserId,
        intakeCampaignId: working.campaignId,
      }
    : undefined;

  if (working.condensedOffer?.packageId === SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID) {
    const dispatched = await ensureDispatchExecution(working, identitySession);
    return dispatched.campaign;
  }
  return working;
}
