"use client";

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { readCurrentCampaign } from "@/lib/studio-board-campaign";

import {
  clearStoredProjectClaimReceipt,
  readStoredProjectClaimReceipt,
} from "./client-receipt";

export type AfterAuthClaimResult = "claimed" | "none" | "denied" | "error";

/**
 * After Create Account or Sign In, bind the paid campaign this device just
 * completed. Uses the stored claim receipt when present, otherwise same-browser
 * possession. Does not invent ownership. Does not claim Maya.
 */
export async function claimPaidProjectAfterAuth(): Promise<AfterAuthClaimResult> {
  if (typeof window === "undefined") return "none";

  const stored = readStoredProjectClaimReceipt();
  const local = readCurrentCampaign();
  const campaignId =
    stored?.campaignId && stored.campaignId !== MAYA_PROTECTED_CAMPAIGN_ID
      ? stored.campaignId
      : local?.campaignId && local.campaignId !== MAYA_PROTECTED_CAMPAIGN_ID
        ? local.campaignId
        : null;
  if (!campaignId) return "none";

  const paid = Boolean(
    local?.paymentReceivedAt ||
      local?.paymentTruth?.status === "confirmed" ||
      stored,
  );
  if (!paid) return "none";

  try {
    const response = await fetch("/api/campaigns/claim", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        claimToken:
          stored?.campaignId === campaignId ? stored.claimToken : undefined,
        allowLocalPossession: true,
      }),
    });
    if (response.status === 401 || response.status === 403) {
      return "denied";
    }
    if (!response.ok) return "error";
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean };
    if (!body.ok) return "error";
    clearStoredProjectClaimReceipt();
    return "claimed";
  } catch {
    return "error";
  }
}
