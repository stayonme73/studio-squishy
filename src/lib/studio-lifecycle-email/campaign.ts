import { isPlausibleEmail } from "@/lib/auth/email-normalize";
import { findUserById } from "@/lib/auth/users";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  resolveCampaignCommunicationClientId,
  syncJobCommunicationRecords,
} from "@/lib/job-control/communication";
import { getOrInitializeMaterials } from "@/lib/materials/store";

import { disposableTestCampaignBlocksCustomerEmails } from "@/lib/studio-payment/disposable-test-isolation-guards";

import { deliverAuthorizedLifecycleNotices } from "./deliver";
import { watchdogSweepMaySendNotice } from "./watchdog-sweep-eligibility";

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
  const email = user?.email?.trim() ?? "";
  if (!user || !email || !isPlausibleEmail(email)) {
    return { email: null, userId: user?.id };
  }
  return { email, userId: user.id };
}

export async function deliverLifecycleNoticesForCampaign(
  campaignId: string,
  options?: { nowMs?: number; watchdogBoundary?: boolean },
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

  if (disposableTestCampaignBlocksCustomerEmails(campaign.record)) {
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
    noticeMaySend: options?.watchdogBoundary ? watchdogSweepMaySendNotice : undefined,
  });
  if (delivered.attempted > 0) {
    await writeTasksEnvelope(delivered.envelope);
  }
  if (delivered.failed > 0 && process.env.NODE_ENV !== "test") {
    const { scheduleLifecycleRetry } = await import("./lifecycle-retry");
    scheduleLifecycleRetry(campaignId);
  }
  return {
    campaignId,
    attempted: delivered.attempted,
    sent: delivered.sent,
    failed: delivered.failed,
    ownerActionRequired: false,
  };
}

/**
 * Queue durable lifecycle notices from the saved project, then send the ones that are due.
 * Payment confirmation calls this so the customer email does not wait for someone to open the order.
 */
export async function deliverQueuedCustomerEmails(
  campaignId: string,
): Promise<LifecycleCampaignDeliveryResult> {
  const envelope = await readCampaignEnvelope(campaignId);
  const tasks = await readTasksEnvelope(campaignId);
  if (!envelope?.record || !tasks?.jobRecords?.length) {
    return {
      campaignId,
      attempted: 0,
      sent: 0,
      failed: 0,
      ownerActionRequired: false,
    };
  }

  const materials = await getOrInitializeMaterials(campaignId, envelope.record);
  const synced = syncJobCommunicationRecords({
    envelope: tasks,
    campaign: envelope.record,
    clientId: resolveCampaignCommunicationClientId(envelope.clientUserId, campaignId),
    jobs: tasks.jobRecords,
    materials: materials.items,
  });
  const recordsChanged =
    JSON.stringify(tasks.jobCommunicationRecords ?? []) !==
      JSON.stringify(synced.envelope.jobCommunicationRecords ?? []) ||
    JSON.stringify(tasks.jobActivityEvents ?? []) !==
      JSON.stringify(synced.envelope.jobActivityEvents ?? []) ||
    JSON.stringify(tasks.jobRecords ?? []) !== JSON.stringify(synced.jobs);
  if (recordsChanged) {
    const now = new Date().toISOString();
    await writeTasksEnvelope({
      ...synced.envelope,
      jobRecords: synced.jobs,
      updatedAt: now,
    });
  }
  return deliverLifecycleNoticesForCampaign(campaignId);
}
