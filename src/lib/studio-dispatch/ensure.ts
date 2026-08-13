import type { CampaignRecord } from "@/config/studio-board";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { ensureRoutingHandoff } from "@/lib/studio-routing-handoff";

import { runDesignRendererDispatchObserver } from "./design-renderer-observer";
import { evaluateJobDispatch } from "./evaluate";
import type {
  DispatchExecutionRecord,
  DispatchExecutionResult,
  JobDispatchRecord,
} from "./types";

function recordsEqual(
  a: readonly JobDispatchRecord[],
  b: readonly JobDispatchRecord[],
): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((r) => [r.dispatchId, r]));
  return a.every((record) => {
    const other = byId.get(record.dispatchId);
    if (!other) return false;
    return (
      other.status === record.status &&
      other.routingFactFingerprint === record.routingFactFingerprint &&
      other.executionIdentityReady === record.executionIdentityReady &&
      other.blocker === record.blocker &&
      JSON.stringify(other.requirements) === JSON.stringify(record.requirements)
    );
  });
}

async function writePendingRetry(
  campaign: CampaignRecord,
  message: string,
): Promise<CampaignRecord> {
  const now = new Date().toISOString();
  const prior = campaign.dispatchExecution;
  const pending: DispatchExecutionRecord = {
    schemaVersion: studioDispatchV1.schemaVersion,
    status: studioDispatchV1.envelopeStatuses.pendingRetry,
    evaluatedAt: prior?.evaluatedAt ?? now,
    lastAttemptAt: now,
    activationCheckoutSessionId:
      campaign.paymentTruth?.checkoutSessionId ??
      prior?.activationCheckoutSessionId ??
      "",
    records: prior?.records ?? [],
    ownerActionRequired: false,
    lastError: message,
  };
  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(
    { ...campaign, dispatchExecution: pending, updatedAt: now },
    envelope?.clientUserId,
  );
  return saved.record;
}

/**
 * After durable dispatch identity exists, observe design-renderer-ready records
 * (v2-rtu-flyer and v2-rtu-business-card). Hook failures are recorded — they do
 * not fail dispatch identity itself.
 */
async function attachDesignRendererObserver(input: {
  campaign: CampaignRecord;
  dispatch: DispatchExecutionRecord;
  alreadyEvaluated: boolean;
}): Promise<Extract<DispatchExecutionResult, { ok: true }>> {
  const observer = await runDesignRendererDispatchObserver({
    campaign: input.campaign,
    dispatch: input.dispatch,
  });

  const dispatchWithObserver: DispatchExecutionRecord = {
    ...input.dispatch,
    designRendererObserver: observer,
  };

  const envelope = await readCampaignEnvelope(input.campaign.campaignId);
  const saved = await upsertCampaignRecord(
    {
      ...input.campaign,
      dispatchExecution: dispatchWithObserver,
      updatedAt: new Date().toISOString(),
    },
    envelope?.clientUserId,
  );

  return {
    ok: true,
    campaign: saved.record,
    dispatch: dispatchWithObserver,
    alreadyEvaluated: input.alreadyEvaluated,
    designRendererObserver: observer,
  };
}

/**
 * Server-driven dispatch execution identity.
 * Refreshes routing first. Identity evaluation does not invoke tools.
 * After durable identity, STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1 may
 * auto-invoke studio_design_renderer for v2-rtu-flyer, v2-rtu-business-card,
 * v2-rtu-menu, v2-rtu-service-sheet, v2-rtu-promotion-graphics, and
 * v2-rtu-social-posts.
 */
export async function ensureDispatchExecution(
  campaign: CampaignRecord,
): Promise<DispatchExecutionResult> {
  const routed = await ensureRoutingHandoff(campaign);
  const working = routed.campaign;

  if (
    !working.paymentReceivedAt ||
    working.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      campaign: working,
      dispatch: working.dispatchExecution ?? null,
      error: "payment_not_confirmed",
      message: "Dispatch requires processor-confirmed payment.",
    };
  }

  if (!working.routingHandoff) {
    return {
      ok: false,
      campaign: working,
      dispatch: working.dispatchExecution ?? null,
      error: "routing_incomplete",
      message: "Dispatch requires durable routing handoff.",
    };
  }

  const now = new Date().toISOString();
  const checkoutSessionId =
    working.paymentTruth?.checkoutSessionId ??
    working.routingHandoff.activationCheckoutSessionId;

  try {
    const records = working.routingHandoff.decisions.map((decision) =>
      evaluateJobDispatch({
        campaignId: working.campaignId,
        routing: decision,
        jobId: decision.jobId,
        skuId: decision.skuId,
        evaluatedAt: now,
      }),
    );

    const anyReady = records.some((r) => r.executionIdentityReady);
    const envelope: DispatchExecutionRecord = {
      schemaVersion: studioDispatchV1.schemaVersion,
      status: anyReady
        ? studioDispatchV1.envelopeStatuses.evaluated
        : studioDispatchV1.envelopeStatuses.deferred,
      evaluatedAt:
        working.dispatchExecution?.status === "evaluated" ||
        working.dispatchExecution?.status === "deferred"
          ? working.dispatchExecution.evaluatedAt
          : now,
      lastAttemptAt: now,
      activationCheckoutSessionId: checkoutSessionId,
      records,
      ownerActionRequired: false,
      lastError: null,
    };

    const prior = working.dispatchExecution;
    if (
      prior &&
      prior.status === envelope.status &&
      prior.activationCheckoutSessionId === envelope.activationCheckoutSessionId &&
      recordsEqual(prior.records, envelope.records)
    ) {
      return attachDesignRendererObserver({
        campaign: working,
        dispatch: prior,
        alreadyEvaluated: true,
      });
    }

    const campaignEnvelope = await readCampaignEnvelope(working.campaignId);
    const saved = await upsertCampaignRecord(
      {
        ...working,
        dispatchExecution: envelope,
        updatedAt: now,
      },
      campaignEnvelope?.clientUserId,
    );

    return attachDesignRendererObserver({
      campaign: saved.record,
      dispatch: envelope,
      alreadyEvaluated: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Dispatch execution failed.";
    try {
      const failed = await writePendingRetry(working, message);
      return {
        ok: false,
        campaign: failed,
        dispatch: failed.dispatchExecution ?? null,
        error: "dispatch_failed",
        message,
      };
    } catch {
      return {
        ok: false,
        campaign: working,
        dispatch: working.dispatchExecution ?? null,
        error: "dispatch_failed",
        message,
      };
    }
  }
}
