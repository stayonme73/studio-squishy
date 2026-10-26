import type { CampaignRecord } from "@/config/studio-board";

/**
 * Cents already returned or still reserved for a Courtesy Adjustment.
 * A later package refund must leave this amount, so the two together cannot
 * exceed what the customer paid.
 */
export function courtesyReservedCents(
  campaign: Pick<CampaignRecord, "studioExtras">,
): number {
  const courtesy = campaign.studioExtras?.courtesy;
  if (!courtesy || courtesy.status === "not_eligible") return 0;
  if (
    courtesy.paymentExecution === "completed" ||
    courtesy.paymentExecution === "accepted" ||
    courtesy.paymentExecution === "uncertain"
  ) {
    return courtesy.refundAmountCents ?? courtesy.totalAdjustmentCents;
  }
  if (courtesy.dueCents > 0) return courtesy.dueCents;
  if (courtesy.status === "issued") return courtesy.totalAdjustmentCents;
  return 0;
}

/**
 * An approved full refund uses the amount Stripe collected, minus any
 * Courtesy Adjustment already returned or still outstanding.
 * The list price and the thank-you have no separate refund value.
 */
export function maximumApprovedFullRefundCents(
  campaign: Pick<CampaignRecord, "paymentTruth" | "condensedOffer" | "studioExtras">,
): number | null {
  const paid = campaign.paymentTruth?.confirmedAmountCents;
  if (typeof paid !== "number" || !Number.isFinite(paid) || paid < 0) return null;
  const list = campaign.condensedOffer?.priceCents;
  if (typeof list === "number" && paid > list) return null;
  const remaining = paid - courtesyReservedCents(campaign);
  if (!Number.isInteger(remaining) || remaining <= 0) return null;
  return remaining;
}
