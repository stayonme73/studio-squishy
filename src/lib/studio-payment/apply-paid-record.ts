import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";
import {
  CUSTOM_STUDIO_PLAN_LABEL,
  CUSTOM_STUDIO_PLAN_PACKAGE_ID,
} from "@/lib/approved-plan-display";
import type { PreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";

import type { PaymentConfirmationInput } from "./types";

function intakeComplete(campaign: CampaignRecord): boolean {
  return Boolean(
    campaign.routeMapIntakeSubmittedAt ||
      campaign.projectDetailsSubmittedAt ||
      campaign.visionSubmittedAt,
  );
}

function withStatus(
  campaign: CampaignRecord,
  status: CampaignStatus,
): CampaignRecord {
  return { ...campaign, campaignStatus: status };
}

/**
 * Pure: apply processor-confirmed payment onto a Campaign Record.
 * Does not touch localStorage or the filesystem.
 */
export function applyPaidTruthToCampaignRecord(
  campaign: CampaignRecord,
  input: PaymentConfirmationInput,
): CampaignRecord {
  const now = input.confirmedAt ?? new Date().toISOString();
  const authorization: PreAcceptancePaymentAuthorization = input.authorization;

  let updated: CampaignRecord = {
    ...campaign,
    paymentReceivedAt: campaign.paymentReceivedAt ?? now,
    updatedAt: now,
    preAcceptancePaymentAuthorization:
      campaign.preAcceptancePaymentAuthorization ?? authorization,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: input.expectedAmountCents,
      confirmedAmountCents: input.confirmedAmountCents,
      checkoutSessionId: input.checkoutSessionId,
      paymentIntentId: input.paymentIntentId ?? null,
      stripeEventId: input.stripeEventId ?? null,
      selectedServiceIds: [...input.selectedServiceIds],
      decisionId: input.decisionId,
      factFingerprint: input.factFingerprint,
      draftRevision: input.draftRevision,
      initiatedAt: campaign.paymentTruth?.initiatedAt,
      confirmedAt: campaign.paymentTruth?.confirmedAt ?? now,
      sandbox: input.sandbox === true,
    },
  };

  if (campaign.approvedStudioPlan) {
    updated = {
      ...updated,
      packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
      packageLabel: CUSTOM_STUDIO_PLAN_LABEL,
    };
  }

  if (intakeComplete(updated)) {
    updated = withStatus(updated, "BUILDING_CONCEPTS");
  } else {
    updated = withStatus(updated, "PAYMENT_RECEIVED");
  }

  const notes = updated.studioNotes ?? [];
  const alreadyNoted = notes.some((n) =>
    /payment (received|confirmed)/i.test(n.message),
  );
  if (!alreadyNoted) {
    updated = {
      ...updated,
      studioNotes: [
        ...notes,
        {
          date: "Today",
          message: input.sandbox
            ? "Payment confirmed (sandbox — not live money)."
            : "Payment confirmed by Stripe.",
        },
      ],
    };
  }

  return updated;
}

export function applyCheckoutInitiatedToCampaignRecord(
  campaign: CampaignRecord,
  args: {
    checkoutSessionId: string;
    expectedAmountCents: number;
    selectedServiceIds: readonly string[];
    decisionId: string;
    factFingerprint: string;
    draftRevision: number;
    sandbox?: boolean;
    initiatedAt?: string;
  },
): CampaignRecord {
  const now = args.initiatedAt ?? new Date().toISOString();
  return {
    ...campaign,
    updatedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "initiated",
      currency: "usd",
      expectedAmountCents: args.expectedAmountCents,
      checkoutSessionId: args.checkoutSessionId,
      selectedServiceIds: [...args.selectedServiceIds],
      decisionId: args.decisionId,
      factFingerprint: args.factFingerprint,
      draftRevision: args.draftRevision,
      initiatedAt: now,
      sandbox: args.sandbox === true,
    },
  };
}
