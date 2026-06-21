import type { StudioGuidePackageId } from "@/config/studio-guide";
import type { CampaignRecord } from "@/config/studio-board";
import { markPaymentReceived } from "@/lib/studio-board-campaign";

/** Vercel Preview / owner dry-runs — set on Preview env only, not Production. */
export function isPaymentSandboxPreviewFlagEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENT_SANDBOX === "1";
}

/**
 * True when the Test Payment sandbox may render.
 * Local dev always; public preview when NEXT_PUBLIC_PAYMENT_SANDBOX=1.
 */
export function isPaymentSandboxAvailable(): boolean {
  return process.env.NODE_ENV === "development" || isPaymentSandboxPreviewFlagEnabled();
}

/**
 * Same persistence path as Complete Payment — PAYMENT_RECEIVED + package on campaign.
 * No Stripe or card fields required.
 */
export function simulateSandboxPayment(
  packageId: StudioGuidePackageId,
): CampaignRecord | null {
  return markPaymentReceived(packageId);
}
