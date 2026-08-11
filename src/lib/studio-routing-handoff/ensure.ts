import type { CampaignRecord } from "@/config/studio-board";
import { studioPostPayActivationV1 } from "@/config/studio-post-pay-activation-v1";
import { studioRoutingHandoffV1 } from "@/config/studio-routing-handoff-v1";
import {
  readTasksEnvelope,
  writeTasksEnvelope,
} from "@/lib/campaign-tasks/store";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { ensurePostPayActivation } from "@/lib/studio-post-pay-activation";

import { evaluateJobRoutingDecision } from "./evaluate";
import type {
  JobRoutingDecision,
  RoutingHandoffRecord,
  RoutingHandoffResult,
} from "./types";

function decisionsEqual(
  a: readonly JobRoutingDecision[],
  b: readonly JobRoutingDecision[],
): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((d) => [d.decisionId, d]));
  return a.every((decision) => {
    const other = byId.get(decision.decisionId);
    if (!other) return false;
    return (
      other.status === decision.status &&
      other.factFingerprint === decision.factFingerprint &&
      other.readyForDispatch === decision.readyForDispatch &&
      other.blocker === decision.blocker
    );
  });
}

async function writePendingRetry(
  campaign: CampaignRecord,
  message: string,
): Promise<CampaignRecord> {
  const now = new Date().toISOString();
  const prior = campaign.routingHandoff;
  const pending: RoutingHandoffRecord = {
    schemaVersion: studioRoutingHandoffV1.schemaVersion,
    status: studioRoutingHandoffV1.handoffStatuses.pendingRetry,
    evaluatedAt: prior?.evaluatedAt ?? now,
    lastAttemptAt: now,
    activationCheckoutSessionId:
      campaign.paymentTruth?.checkoutSessionId ??
      prior?.activationCheckoutSessionId ??
      "",
    decisions: prior?.decisions ?? [],
    ownerActionRequired: false,
    lastError: message,
  };
  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(
    { ...campaign, routingHandoff: pending, updatedAt: now },
    envelope?.clientUserId,
  );
  return saved.record;
}

/**
 * Server-driven routing handoff. Refreshes activation first so phase truth is current.
 * Idempotent; invalidates stale READY_FOR_DISPATCH when facts change.
 * Does not dispatch producers or invoke tools.
 */
export async function ensureRoutingHandoff(
  campaign: CampaignRecord,
): Promise<RoutingHandoffResult> {
  const activationResult = await ensurePostPayActivation(campaign);
  const working = activationResult.campaign;

  if (
    !working.paymentReceivedAt ||
    working.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      campaign: working,
      handoff: working.routingHandoff ?? null,
      error: "payment_not_confirmed",
      message: "Routing handoff requires processor-confirmed payment.",
    };
  }

  if (
    !working.postPayActivation ||
    working.postPayActivation.status !== "activated"
  ) {
    return {
      ok: false,
      campaign: working,
      handoff: working.routingHandoff ?? null,
      error: "activation_incomplete",
      message: "Routing handoff requires durable post-pay activation.",
    };
  }

  const now = new Date().toISOString();
  const checkoutSessionId =
    working.paymentTruth?.checkoutSessionId ??
    working.postPayActivation.checkoutSessionId;

  try {
    const materialsEnvelope = await getOrInitializeMaterials(
      working.campaignId,
      working,
    );
    const tasksEnvelope = await readTasksEnvelope(working.campaignId);
    const jobRecords = syncJobRecordsFromCampaign(
      working,
      tasksEnvelope?.tasks ?? [],
      materialsEnvelope.items,
      tasksEnvelope?.exceptionRecords ?? [],
      tasksEnvelope?.jobRecords,
      now,
    );

    if (tasksEnvelope) {
      await writeTasksEnvelope({
        ...tasksEnvelope,
        jobRecords,
        updatedAt: now,
        syncedAt: now,
      });
    }

    const decisions = jobRecords.map((job) =>
      evaluateJobRoutingDecision({
        campaign: working,
        job,
        materials: materialsEnvelope.items,
        evaluatedAt: now,
      }),
    );

    const activationReady =
      working.postPayActivation.phase ===
      studioPostPayActivationV1.phases.readyForRouting;

    const handoff: RoutingHandoffRecord = {
      schemaVersion: studioRoutingHandoffV1.schemaVersion,
      status: activationReady
        ? studioRoutingHandoffV1.handoffStatuses.evaluated
        : studioRoutingHandoffV1.handoffStatuses.deferred,
      evaluatedAt:
        working.routingHandoff?.status === "evaluated" ||
        working.routingHandoff?.status === "deferred"
          ? working.routingHandoff.evaluatedAt
          : now,
      lastAttemptAt: now,
      activationCheckoutSessionId: checkoutSessionId,
      decisions,
      ownerActionRequired: false,
      lastError: null,
    };

    const prior = working.routingHandoff;
    if (
      prior &&
      prior.status === handoff.status &&
      prior.activationCheckoutSessionId === handoff.activationCheckoutSessionId &&
      decisionsEqual(prior.decisions, handoff.decisions)
    ) {
      return {
        ok: true,
        campaign: working,
        handoff: prior,
        alreadyEvaluated: true,
      };
    }

    const envelope = await readCampaignEnvelope(working.campaignId);
    const saved = await upsertCampaignRecord(
      {
        ...working,
        routingHandoff: handoff,
        updatedAt: now,
      },
      envelope?.clientUserId,
    );

    return {
      ok: true,
      campaign: saved.record,
      handoff,
      alreadyEvaluated: false,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Routing handoff failed.";
    try {
      const failed = await writePendingRetry(working, message);
      return {
        ok: false,
        campaign: failed,
        handoff: failed.routingHandoff ?? null,
        error: "routing_failed",
        message,
      };
    } catch {
      return {
        ok: false,
        campaign: working,
        handoff: working.routingHandoff ?? null,
        error: "routing_failed",
        message,
      };
    }
  }
}
