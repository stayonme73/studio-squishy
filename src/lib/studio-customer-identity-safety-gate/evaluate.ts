import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";

import type {
  CustomerIdentityMismatchKind,
  CustomerIdentitySafetyContext,
  CustomerIdentitySafetyFail,
  CustomerIdentitySafetyVerdict,
} from "./types";

function normalizeId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fail(
  kind: CustomerIdentityMismatchKind,
  expectedCampaignId: string,
  foundCampaignId: string | null,
  details: string,
): CustomerIdentitySafetyFail {
  return {
    ok: false,
    blocker: studioCustomerIdentitySafetyGateV1.blockerCode,
    mismatchKind: kind,
    recoveryPath: studioCustomerIdentitySafetyGateV1.recoveryPath,
    ownerActionRequired: false,
    expectedCampaignId,
    foundCampaignId,
    details,
  };
}

function sameId(a: string, b: string | null | undefined): boolean {
  const other = normalizeId(b);
  if (!other) return false;
  return a === other;
}

function skuSet(ids: readonly string[] | null | undefined): Set<string> {
  return new Set((ids ?? []).map((id) => String(id)).filter(Boolean));
}

/**
 * Fail-closed identity invariant. Does not guess which customer is correct.
 * Does not prefer an older, more complete paid campaign.
 */
export function evaluateCustomerIdentitySafetyGate(
  context: CustomerIdentitySafetyContext,
): CustomerIdentitySafetyVerdict {
  const active = normalizeId(context.activeCampaignId);
  if (!active || active !== context.campaign.campaignId) {
    return fail(
      "customer_identity_mismatch",
      context.campaign.campaignId,
      active,
      "Active campaign ID does not match the campaign record being dispatched.",
    );
  }

  const frozenId =
    normalizeId(context.frozenProtectedCampaignId) ??
    studioCustomerIdentitySafetyGateV1.protectedFrozenCampaignId;

  const sessionCurrent = normalizeId(context.sessionCurrentCampaignId);
  if (sessionCurrent && sessionCurrent !== active) {
    return fail(
      "stale_campaign_pointer",
      active,
      sessionCurrent,
      "Session or browser current campaign does not match the campaign being dispatched.",
    );
  }

  const sessionUser = normalizeId(context.sessionClientUserId);
  const campaignUser = normalizeId(context.clientUserId);
  if (sessionUser && campaignUser && sessionUser !== campaignUser) {
    return fail(
      "customer_identity_mismatch",
      active,
      campaignUser,
      "Session customer identity does not match the campaign client identity.",
    );
  }

  const paymentCampaign = normalizeId(context.paymentBindingCampaignId);
  if (paymentCampaign && paymentCampaign !== active) {
    return fail(
      "payment_campaign_mismatch",
      active,
      paymentCampaign,
      "Payment record is associated with a different campaign.",
    );
  }

  const paymentPayer = normalizeId(context.paymentPayerClientUserId);
  if (sessionUser && paymentPayer && sessionUser !== paymentPayer) {
    return fail(
      "customer_identity_mismatch",
      active,
      paymentPayer,
      "Payment payer identity does not match the session customer.",
    );
  }
  if (campaignUser && paymentPayer && campaignUser !== paymentPayer) {
    return fail(
      "customer_identity_mismatch",
      active,
      paymentPayer,
      "Payment payer identity does not match the campaign client identity.",
    );
  }

  const intakeCampaign = normalizeId(context.intakeCampaignId);
  if (intakeCampaign && intakeCampaign !== active) {
    return fail(
      "intake_campaign_mismatch",
      active,
      intakeCampaign,
      "Project Intake is associated with a different campaign.",
    );
  }

  const materialsCampaign = normalizeId(context.materialsCampaignId);
  if (materialsCampaign && materialsCampaign !== active) {
    return fail(
      "materials_campaign_mismatch",
      active,
      materialsCampaign,
      "Materials or rights ledger is associated with a different campaign.",
    );
  }

  for (const certificationCampaign of context.materialsCertificationCampaignIds ?? []) {
    const id = normalizeId(certificationCampaign);
    if (id && id !== active) {
      return fail(
        "materials_campaign_mismatch",
        active,
        id,
        "A materials/rights certification belongs to a different campaign.",
      );
    }
  }

  for (const packetCampaign of context.jobPacketCampaignIds ?? []) {
    const id = normalizeId(packetCampaign);
    if (id && id !== active) {
      return fail(
        "job_packet_campaign_mismatch",
        active,
        id,
        "A job packet references a different campaign than the one being dispatched.",
      );
    }
  }

  const paidSkus = skuSet(context.paymentSelectedServiceIds);
  const planSkus = skuSet(context.campaign.approvedStudioPlan?.selectedServiceIds);
  if (paidSkus.size > 0 && planSkus.size > 0) {
    for (const sku of planSkus) {
      if (!paidSkus.has(sku)) {
        return fail(
          "sku_payment_mismatch",
          active,
          active,
          "Purchased SKU on the campaign is not on the payment record.",
        );
      }
    }
  }

  if (active !== frozenId) {
    const associated = [
      sessionCurrent,
      paymentCampaign,
      intakeCampaign,
      materialsCampaign,
      ...(context.materialsCertificationCampaignIds ?? []).map(normalizeId),
      ...(context.jobPacketCampaignIds ?? []).map(normalizeId),
    ];
    if (associated.some((id) => id === frozenId)) {
      return fail(
        "frozen_customer_in_active_context",
        active,
        frozenId,
        "A frozen or archived customer record appeared inside a different active customer context.",
      );
    }
  }

  return { ok: true, blocker: null };
}

export function isCustomerIdentityBlocked(
  campaign: { dispatchExecution?: { customerIdentitySafety?: { status?: string } } } | null,
): boolean {
  return campaign?.dispatchExecution?.customerIdentitySafety?.status === "blocked";
}
