import { isPlausibleEmail } from "@/lib/auth/email-normalize";
import { findUserById } from "@/lib/auth/users";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";

import { deliverAuthorizedLifecycleNotices } from "./deliver";

export type LifecycleCampaignDeliveryResult = {
  campaignId: string;
  attempted: number;
  sent: number;
  failed: number;
  ownerActionRequired: false;
};

export async function resolveLifecycleRecipientEmail(input: {
  campaignId: string;
  clientUserId?: string | null;
}): Promise<{ email: string | null; userId?: string }> {
  const clientUserId = input.clientUserId?.trim();
  if (!clientUserId || clientUserId.startsWith("unclaimed-client:")) {
    return { email: null };
  }
  const user = await findUserById(clientUserId);
  if (!user) return { email: null };
  const email = user.email?.trim() ?? "";
  if (!email || !isPlausibleEmail(email)) return { email: null, userId: user.id };
  return { email, userId: user.id };
}

export async function deliverLifecycleNoticesForCampaign(
  campaignId: string,
  options?: { nowMs?: number },
): Promise<LifecycleCampaignDeliveryResult> {
  const campaign = await readCampaignEnvelope(campaignId);
  const envelope = await readTasksEnvelope(campaignId);
  if (!campaign || !envelope) {
    return {
      campaignId,
      attempted: 0,
      sent: 0,
      failed: 0,
      ownerActionRequired: false,
    };
  }

  const recipient = await resolveLifecycleRecipientEmail({
    campaignId,
    clientUserId: campaign.clientUserId,
  });
  const delivered = await deliverAuthorizedLifecycleNotices({
    envelope,
    toEmail: recipient.email,
    userId: recipient.userId,
    nowMs: options?.nowMs,
  });
  if (delivered.attempted > 0) {
    await writeTasksEnvelope(delivered.envelope);
  }
  return {
    campaignId,
    attempted: delivered.attempted,
    sent: delivered.sent,
    failed: delivered.failed,
    ownerActionRequired: false,
  };
}
