import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import type { CampaignRecord } from "@/config/studio-board";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { ensureFlyerMachineReviewBind, latestFlyerQaIsUnresolvedFail } from "@/lib/studio-customer-life/machine-review-bind";
import { ensureSocialPromoCompositeReviewBind } from "@/lib/studio-customer-life/machine-social-promo-review-bind";
import {
  campaignIncludesFlyerSku,
  isFlyerProductionIntakeReady,
  needsFlyerProductionObserverRetry,
} from "@/lib/project-intake-flyer-production";
import { ensureDispatchExecution } from "@/lib/studio-dispatch";
import { disposableTestOperatingChainBlocked } from "@/lib/studio-payment/disposable-test-isolation-guards";
import {
  isCustomerIdentityBlocked,
  type CustomerIdentityDispatchSession,
} from "@/lib/studio-customer-identity-safety-gate";
import { recoverResolvedCustomerIdentityHold } from "@/lib/studio-customer-identity-safety-gate/recover-hold";
import { applySealedPostPayStructures } from "./apply-sealed-structures";
import { isPaymentConfirmedForRecovery, needsPaidOperatingRecovery } from "./needs-recovery";
import type { PaidOperatingRecoveryResult } from "./types";

function shouldWakeFlyerRenderer(campaign: CampaignRecord): boolean {
  if (
    campaign.productionFreeze?.status === "FROZEN" &&
    campaign.productionFreeze.doNotRemint &&
    campaign.productionFreeze.skuIds.includes("v2-rtu-flyer")
  ) {
    return false;
  }
  return (
    needsFlyerProductionObserverRetry(campaign) ||
    (campaignIncludesFlyerSku(campaign) && isFlyerProductionIntakeReady(campaign))
  );
}

async function persistCampaign(
  campaign: CampaignRecord,
): Promise<CampaignRecord> {
  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(campaign, envelope?.clientUserId);
  return saved.record;
}

async function runRecoveryAttempt(
  campaign: CampaignRecord,
  identitySession?: CustomerIdentityDispatchSession,
): Promise<{ campaign: CampaignRecord; lastError: string | null }> {
  const structured = applySealedPostPayStructures(campaign);
  let working = structured.campaign;
  let lastError = structured.lastError;

  if (structured.changed) {
    working = await persistCampaign(working);
  }

  const dispatched = await ensureDispatchExecution(working, identitySession);
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
  options?: {
    immediateRetries?: number;
    identitySession?: CustomerIdentityDispatchSession;
  },
): Promise<PaidOperatingRecoveryResult> {
  if (disposableTestOperatingChainBlocked(campaign)) {
    return {
      ok: true,
      recovered: false,
      needsRecovery: false,
      alreadyClear: true,
      ownerActionRequired: false,
      campaign,
      reason: "already_clear",
      attempts: 0,
    };
  }
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
    if (shouldWakeFlyerRenderer(campaign)) {
      const dispatched = await ensureDispatchExecution(
        campaign,
        options?.identitySession,
      );
      return {
        ok: dispatched.ok,
        recovered: true,
        needsRecovery: false,
        alreadyClear: false,
        ownerActionRequired: false,
        campaign: dispatched.campaign,
        reason: "recovered",
        lastError: dispatched.ok ? null : dispatched.message,
        attempts: 1,
      };
    }
    const tasks = await readTasksEnvelope(campaign.campaignId);
    if (latestFlyerQaIsUnresolvedFail(tasks)) {
      return {
        ok: true,
        recovered: false,
        needsRecovery: false,
        alreadyClear: true,
        ownerActionRequired: false,
        campaign,
        reason: "already_clear",
        attempts: 0,
      };
    }
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
    const result = await runRecoveryAttempt(working, options?.identitySession);
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
  identitySession?: CustomerIdentityDispatchSession,
): Promise<ServerCampaignEnvelope> {
  if (disposableTestOperatingChainBlocked(envelope.record)) return envelope;
  let current = envelope;
  if (isCustomerIdentityBlocked(current.record)) {
    const resolved = await recoverResolvedCustomerIdentityHold(
      current.record,
      identitySession,
    );
    const latestHold = await readCampaignEnvelope(current.campaignId);
    current = latestHold ?? { ...current, record: resolved };
    if (
      !isCustomerIdentityBlocked(current.record) &&
      !needsPaidOperatingRecovery(current.record)
    ) {
      const bound = await ensureFlyerMachineReviewBind(current.record);
      if (bound === current.record) return current;
      const afterBind = await readCampaignEnvelope(current.campaignId);
      return afterBind ?? { ...current, record: bound };
    }
  }

  if (!needsPaidOperatingRecovery(current.record)) {
    if (shouldWakeFlyerRenderer(current.record)) {
      await ensureDispatchExecution(current.record, identitySession);
      const latest = await readCampaignEnvelope(current.campaignId);
      return latest ?? current;
    }
    const tasks = await readTasksEnvelope(current.campaignId);
    if (latestFlyerQaIsUnresolvedFail(tasks)) {
      return current;
    }
    const boundFlyer = await ensureFlyerMachineReviewBind(current.record);
    const bound = await ensureSocialPromoCompositeReviewBind(boundFlyer);
    if (bound === current.record) return current;
    const latest = await readCampaignEnvelope(current.campaignId);
    return latest ?? { ...current, record: bound };
  }
  const recovered = await recoverPaidOperatingChain(current.record, {
    identitySession,
  });
  const latest = await readCampaignEnvelope(current.campaignId);
  return latest ?? { ...current, record: recovered.campaign };
}
