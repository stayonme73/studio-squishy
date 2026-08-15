/**
 * After payment confirmation: bind signed-in payer when present; otherwise mint
 * a claim receipt so a verified customer can recover on another device.
 * Does not mutate payment / SKU / production truth on the campaign record.
 */

import { linkClientCampaign } from "@/lib/auth/users";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import type { CheckoutSessionBinding } from "@/lib/studio-payment/events-store";

import { issueProjectClaimReceipt } from "./claim-receipts";

export type PostPaymentOwnershipResult = {
  campaign: CampaignRecord;
  clientUserId: string | null;
  claimRawToken: string | null;
  boundAtPayment: boolean;
};

export async function applyPostPaymentOwnership(input: {
  campaign: CampaignRecord;
  checkoutSessionId: string;
  binding: CheckoutSessionBinding | null;
  /** Existing envelope owner before this confirm write. */
  priorClientUserId?: string | null;
}): Promise<PostPaymentOwnershipResult> {
  const prior =
    input.priorClientUserId ??
    (await readCampaignEnvelope(input.campaign.campaignId))?.clientUserId ??
    null;

  const payerId = input.binding?.payerClientUserId?.trim() || null;

  // Signed-in payer at checkout → bind immediately when still unowned.
  if (payerId && !prior) {
    const saved = await upsertCampaignRecord(input.campaign, payerId);
    await linkClientCampaign(payerId, input.campaign.campaignId);
    return {
      campaign: saved.record,
      clientUserId: saved.clientUserId ?? payerId,
      claimRawToken: null,
      boundAtPayment: true,
    };
  }

  // Already owned — no receipt mint (resume via account).
  if (prior) {
    return {
      campaign: input.campaign,
      clientUserId: prior,
      claimRawToken: null,
      boundAtPayment: false,
    };
  }

  // Guest / unowned paid project — mint recovery receipt.
  const issued = await issueProjectClaimReceipt({
    campaignId: input.campaign.campaignId,
    checkoutSessionId: input.checkoutSessionId,
    customerEmail: input.binding?.customerEmail ?? null,
  });

  return {
    campaign: input.campaign,
    clientUserId: null,
    claimRawToken: issued.rawToken,
    boundAtPayment: false,
  };
}
