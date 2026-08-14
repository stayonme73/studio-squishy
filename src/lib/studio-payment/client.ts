"use client";

import { studioPaymentV1 } from "@/config/studio-payment-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { PreAcceptanceProjectFacts } from "@/lib/studio-pre-acceptance/types";

export type StartCheckoutClientResult =
  | {
      ok: true;
      mode: "stripe";
      url: string;
      checkoutSessionId: string;
      expectedAmountCents: number;
    }
  | {
      ok: true;
      mode: "sandbox";
      checkoutSessionId: string;
      expectedAmountCents: number;
    }
  | { ok: false; message: string; error?: string };

export async function startHostedCheckout(args: {
  campaignId: string;
  facts: PreAcceptanceProjectFacts;
  customerEmail?: string;
  /** Local fixture only — never use for Stripe smoke proof. */
  preferSandbox?: boolean;
  /**
   * ma-001 Promotion Pack — locked composition from working draft.
   * Required when facts include ma-001; server re-validates and seals.
   */
  ma001PackComposition?: unknown;
  /**
   * rm-j002 Social Profile Setup Kit — locked platform kit from working draft.
   * Required when facts include rm-j002; server re-validates and seals.
   */
  rmj002KitLock?: unknown;
}): Promise<StartCheckoutClientResult> {
  const returnOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const response = await fetch(studioPaymentV1.routes.createCheckoutSession, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      campaignId: args.campaignId,
      facts: args.facts,
      returnOrigin,
      customerEmail: args.customerEmail,
      preferSandbox: args.preferSandbox === true,
      ...(args.ma001PackComposition != null
        ? { ma001PackComposition: args.ma001PackComposition }
        : {}),
      ...(args.rmj002KitLock != null
        ? { rmj002KitLock: args.rmj002KitLock }
        : {}),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || body.ok === false) {
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : undefined,
      message:
        typeof body.message === "string"
          ? body.message
          : studioPaymentV1.customerCopy.processorNotConfigured,
    };
  }
  if (body.mode === "stripe" && typeof body.url === "string") {
    return {
      ok: true,
      mode: "stripe",
      url: body.url,
      checkoutSessionId: String(body.checkoutSessionId),
      expectedAmountCents: Number(body.expectedAmountCents),
    };
  }
  if (body.mode === "sandbox" && typeof body.checkoutSessionId === "string") {
    return {
      ok: true,
      mode: "sandbox",
      checkoutSessionId: body.checkoutSessionId,
      expectedAmountCents: Number(body.expectedAmountCents),
    };
  }
  return {
    ok: false,
    message: studioPaymentV1.customerCopy.processorNotConfigured,
  };
}

export async function confirmSandboxCheckoutClient(
  checkoutSessionId: string,
): Promise<{ ok: true; campaign: CampaignRecord } | { ok: false; message: string }> {
  const response = await fetch(studioPaymentV1.routes.sandboxConfirm, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ checkoutSessionId }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    campaign?: CampaignRecord;
    message?: string;
  };
  if (!response.ok || !body.ok || !body.campaign) {
    return {
      ok: false,
      message: body.message ?? studioPaymentV1.customerCopy.paymentFailed,
    };
  }
  return { ok: true, campaign: body.campaign };
}

export async function reconcileCheckoutClient(
  checkoutSessionId: string,
): Promise<{
  ok: boolean;
  paid: boolean;
  campaign: CampaignRecord | null;
  message: string;
}> {
  const response = await fetch(
    `${studioPaymentV1.routes.reconcile}?session_id=${encodeURIComponent(checkoutSessionId)}`,
    { method: "GET", credentials: "include" },
  );
  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    paid?: boolean;
    campaign?: CampaignRecord | null;
    message?: string;
  };
  return {
    ok: Boolean(body.ok),
    paid: Boolean(body.paid),
    campaign: body.campaign ?? null,
    message:
      body.message ??
      (body.paid
        ? studioPaymentV1.customerCopy.paymentConfirmed
        : studioPaymentV1.customerCopy.paymentPending),
  };
}
