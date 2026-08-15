import type { CampaignRecord, CampaignStatus } from "@/config/studio-board";
import {
  CUSTOM_STUDIO_PLAN_LABEL,
  CUSTOM_STUDIO_PLAN_PACKAGE_ID,
} from "@/lib/approved-plan-display";
import type { PreAcceptancePaymentAuthorization } from "@/lib/studio-pre-acceptance/authorization-binding";
import { ensureMa001PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/ma-001-postpay-composition-dispatch-structure";
import { ensureRmJ002PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/rm-j002-postpay-kit-dispatch-structure";
import { ensureRmJ008PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/rm-j008-postpay-kit-dispatch-structure";
import { ensureBf001PostPayDispatchStructureOnCampaign } from "@/lib/studio-design-renderer/bf-001-postpay-kit-dispatch-structure";

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
      ...(input.ma001CompositionSeal
        ? { ma001CompositionSeal: input.ma001CompositionSeal }
        : {}),
      ...(input.rmj002KitSeal ? { rmj002KitSeal: input.rmj002KitSeal } : {}),
      ...(input.rmj008KitSeal ? { rmj008KitSeal: input.rmj008KitSeal } : {}),
      ...(input.bf001PackageSeal
        ? { bf001PackageSeal: input.bf001PackageSeal }
        : {}),
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

  // Durable ma-001 pack structure from sealed payment composition (no remap / no renderer).
  if (updated.paymentTruth?.ma001CompositionSeal) {
    const ensured = ensureMa001PostPayDispatchStructureOnCampaign(updated);
    if (ensured.ok) {
      updated = ensured.campaign;
    }
  }

  // Durable rm-j002 kit structure from sealed payment kit (no remap / no composer).
  if (updated.paymentTruth?.rmj002KitSeal) {
    const ensured = ensureRmJ002PostPayDispatchStructureOnCampaign(updated);
    if (ensured.ok) {
      updated = ensured.campaign;
    }
  }

  // Durable rm-j008 Update Kit structure from sealed payment kit (no remap / no composer).
  if (updated.paymentTruth?.rmj008KitSeal) {
    const ensured = ensureRmJ008PostPayDispatchStructureOnCampaign(updated);
    if (ensured.ok) {
      updated = ensured.campaign;
    }
  }

  // Durable bf-001 refresh package structure from sealed payment package (no remap / no composer).
  if (updated.paymentTruth?.bf001PackageSeal) {
    const ensured = ensureBf001PostPayDispatchStructureOnCampaign(updated);
    if (ensured.ok) {
      updated = ensured.campaign;
    }
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
