import type { CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import type { DispatchExecutionRecord } from "@/lib/studio-dispatch/types";

import { collectCustomerIdentityDispatchContext } from "./collect";
import { evaluateCustomerIdentitySafetyGate, isCustomerIdentityBlocked } from "./evaluate";
import type { CustomerIdentityDispatchSession } from "./types";

/**
 * Re-evaluate a persisted identity hold. If the boarding pass now matches,
 * restore dispatch identity without invoking Production observers.
 * A leftover browser pointer must not keep a finished job on "verifying."
 */
export async function recoverResolvedCustomerIdentityHold(
  campaign: CampaignRecord,
  session?: CustomerIdentityDispatchSession,
): Promise<CampaignRecord> {
  if (!isCustomerIdentityBlocked(campaign)) return campaign;

  const context = await collectCustomerIdentityDispatchContext(campaign, session);
  const verdict = evaluateCustomerIdentitySafetyGate(context);
  if (!verdict.ok) return campaign;

  const now = new Date().toISOString();
  const prior = campaign.dispatchExecution;
  const decisions = campaign.routingHandoff?.decisions ?? [];
  const records = decisions.length
    ? decisions.map((decision) =>
        evaluateJobDispatch({
          campaignId: campaign.campaignId,
          routing: decision,
          jobId: decision.jobId,
          skuId: decision.skuId,
          evaluatedAt: now,
        }),
      )
    : (prior?.records ?? []).map((record) => ({
        ...record,
        status: studioDispatchV1.outcomes.waitingForPrerequisite,
        executionIdentityReady: false,
        blocker: null,
      }));
  const anyReady = records.some((record) => record.executionIdentityReady);
  const next: DispatchExecutionRecord = {
    schemaVersion: studioDispatchV1.schemaVersion,
    status: anyReady
      ? studioDispatchV1.envelopeStatuses.evaluated
      : studioDispatchV1.envelopeStatuses.deferred,
    evaluatedAt: prior?.evaluatedAt ?? now,
    lastAttemptAt: now,
    activationCheckoutSessionId:
      campaign.paymentTruth?.checkoutSessionId ??
      prior?.activationCheckoutSessionId ??
      "",
    records,
    ownerActionRequired: false,
    lastError: null,
    designRendererObserver: prior?.designRendererObserver,
    launchMenuProductionObserver: prior?.launchMenuProductionObserver,
  };

  if (campaign.campaignId === MAYA_PROTECTED_CAMPAIGN_ID) {
    return { ...campaign, dispatchExecution: next, updatedAt: now };
  }

  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(
    { ...campaign, dispatchExecution: next, updatedAt: now },
    envelope?.clientUserId,
  );
  return saved.record;
}
