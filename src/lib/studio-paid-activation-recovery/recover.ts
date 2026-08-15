import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { ensureFlyerMachineReviewBind } from "@/lib/studio-customer-life/machine-review-bind";
import { ensureDispatchExecution } from "@/lib/studio-dispatch";

import { applySealedPostPayStructures } from "./apply-sealed-structures";
import { isPaymentConfirmedForRecovery, needsPaidOperatingRecovery } from "./needs-recovery";
import type { PaidOperatingRecoveryResult } from "./types";

async function persistCampaign(
  campaign: CampaignRecord,
): Promise<CampaignRecord> {
  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(campaign, envelope?.clientUserId);
  return saved.record;
}

async function runRecoveryAttempt(
  campaign: CampaignRecord,
): Promise<{ campaign: CampaignRecord; lastError: string | null }> {
  const structured = applySealedPostPayStructures(campaign);
  let working = structured.campaign;
  let lastError = structured.lastError;

  if (structured.changed) {
    working = await persistCampaign(working);
  }

  const dispatched = await ensureDispatchExecution(working);
  working = dispatched.campaign;
  if (!dispatched.ok) {
    lastError = dispatched.message ?? lastError;
  }

  return { campaign: working, lastError };
}

/**
 * Recover a confirmed-paid campaign through:
 * sealed structure → activation → routing eligibility → dispatch identity.
 * Idempotent. Owner action is never required for routine recovery.
 */
export async function recoverPaidOperatingChain(
  campaign: CampaignRecord,
  options?: { immediateRetries?: number },
): Promise<PaidOperatingRecoveryResult> {
  if (!isPaymentConfirmedForRecovery(campaign)) {
    return {
      ok: false,
      recovered: false,
      needsRecovery: false,
      alreadyClear: false,
      ownerActionRequired: false,
      campaign,
      reason: "payment_not_confirmed",
      attempts: 0,
    };
  }

  if (!needsPaidOperatingRecovery(campaign)) {
    const bound = await ensureFlyerMachineReviewBind(campaign);
    return {
      ok: true,
      recovered: false,
      needsRecovery: false,
      alreadyClear: true,
      ownerActionRequired: false,
      campaign: bound,
      reason: "already_clear",
      attempts: 0,
    };
  }

  const retries =
    options?.immediateRetries ?? studioPaidActivationRecoveryV1.immediateRetries;
  const attempts = 1 + Math.max(0, retries);
  let working = campaign;
  let lastError: string | null = null;

  for (let i = 0; i < attempts; i += 1) {
    const result = await runRecoveryAttempt(working);
    working = result.campaign;
    lastError = result.lastError;

    if (!needsPaidOperatingRecovery(working)) {
      working = await ensureFlyerMachineReviewBind(working);
      return {
        ok: true,
        recovered: true,
        needsRecovery: false,
        alreadyClear: false,
        ownerActionRequired: false,
        campaign: working,
        reason: "recovered",
        lastError: null,
        attempts: i + 1,
      };
    }
  }

  return {
    ok: false,
    recovered: false,
    needsRecovery: true,
    alreadyClear: false,
    ownerActionRequired: false,
    campaign: working,
    reason: "still_pending",
    lastError,
    attempts,
  };
}

/** Campaign GET/return path — durable wake without depending on Stripe replay. */
export async function wakePaidCampaignEnvelope(
  envelope: ServerCampaignEnvelope,
): Promise<ServerCampaignEnvelope> {
  if (!needsPaidOperatingRecovery(envelope.record)) {
    const bound = await ensureFlyerMachineReviewBind(envelope.record);
    if (bound === envelope.record) return envelope;
    const latest = await readCampaignEnvelope(envelope.campaignId);
    return latest ?? { ...envelope, record: bound };
  }
  const recovered = await recoverPaidOperatingChain(envelope.record);
  const latest = await readCampaignEnvelope(envelope.campaignId);
  return latest ?? { ...envelope, record: recovered.campaign };
}
