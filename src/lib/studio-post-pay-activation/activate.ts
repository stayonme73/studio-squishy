import type { CampaignRecord } from "@/config/studio-board";
import { studioPostPayActivationV1 } from "@/config/studio-post-pay-activation-v1";
import {
  getOrGenerateTasks,
  writeTasksEnvelope,
} from "@/lib/campaign-tasks/store";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { buildServiceScopeSnapshot } from "@/lib/plan-pricing";
import type { ServiceId } from "@/catalog/types";
import { ensureSm001MonthlyProductionCyclesFromPaidAuthority } from "@/lib/studio-monthly-production-cycle";

import {
  isPaymentConfirmedForActivation,
  resolvePostPayActivationPhase,
} from "./resolve-phase";
import type {
  PostPayActivationRecord,
  PostPayActivationResult,
} from "./types";

/**
 * If checkout left an approved plan with empty production lines, rebuild lines
 * from payment-confirmed SKUs only — never invent SKUs beyond payment truth.
 */
function ensureProductionLineItems(campaign: CampaignRecord): CampaignRecord {
  const plan = campaign.approvedStudioPlan;
  if (!plan) return campaign;
  if (filterProductionPlanLineItems(plan).length > 0) return campaign;

  const skuIds = (campaign.paymentTruth?.selectedServiceIds ??
    plan.selectedServiceIds) as readonly ServiceId[];
  if (!skuIds.length) return campaign;

  return {
    ...campaign,
    approvedStudioPlan: {
      ...plan,
      selectedServiceIds: [...skuIds],
      includedServiceIds: plan.includedServiceIds.length
        ? plan.includedServiceIds
        : [...skuIds],
      lineItems: buildServiceScopeSnapshot(skuIds),
    },
  };
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function activationMatchesJobs(
  existing: PostPayActivationRecord | undefined,
  jobIds: readonly string[],
  checkoutSessionId: string,
): boolean {
  if (!existing || existing.status !== "activated") return false;
  if (existing.checkoutSessionId !== checkoutSessionId) return false;
  return arraysEqual(existing.jobIds, jobIds);
}

async function writePendingRetry(
  campaign: CampaignRecord,
  message: string,
): Promise<CampaignRecord> {
  const now = new Date().toISOString();
  const checkoutSessionId = campaign.paymentTruth?.checkoutSessionId ?? "";
  const prior = campaign.postPayActivation;
  const pending: PostPayActivationRecord = {
    schemaVersion: studioPostPayActivationV1.schemaVersion,
    status: studioPostPayActivationV1.activationStatuses.pendingRetry,
    phase: prior?.phase ?? studioPostPayActivationV1.phases.awaitingIntake,
    activatedAt: prior?.activatedAt ?? now,
    lastAttemptAt: now,
    checkoutSessionId,
    paymentIntentId: campaign.paymentTruth?.paymentIntentId ?? null,
    stripeEventId: campaign.paymentTruth?.stripeEventId ?? null,
    jobIds: prior?.jobIds ?? [],
    taskCount: prior?.taskCount ?? 0,
    intakeComplete: prior?.intakeComplete ?? false,
    blockingRequiredMaterialsCount: prior?.blockingRequiredMaterialsCount ?? 0,
    ownerActionRequired: false,
    lastError: message,
  };

  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(
    {
      ...campaign,
      postPayActivation: pending,
      updatedAt: now,
    },
    envelope?.clientUserId,
  );
  return saved.record;
}

/**
 * Eagerly materialize durable post-pay operating state from payment authority.
 * Idempotent under duplicate webhook / reconcile / retry.
 * Does not start production or dispatch producers.
 */
export async function ensurePostPayActivation(
  campaign: CampaignRecord,
): Promise<PostPayActivationResult> {
  if (!isPaymentConfirmedForActivation(campaign)) {
    return {
      ok: false,
      campaign,
      activation: campaign.postPayActivation ?? null,
      error: "payment_not_confirmed",
      message: "Post-pay activation requires processor-confirmed payment truth.",
    };
  }

  const checkoutSessionId = campaign.paymentTruth!.checkoutSessionId!;
  const now = new Date().toISOString();
  let working = ensureProductionLineItems(campaign);

  // Paid-cycle → production cycle create (idempotent). Skips purchases lacking
  // explicit period truth. Does not invoke renderer / remap / dispatch.
  const cycleEnsure = ensureSm001MonthlyProductionCyclesFromPaidAuthority(working);
  working = cycleEnsure.campaign;

  try {
    const materialsEnvelope = await getOrInitializeMaterials(
      working.campaignId,
      working,
    );
    const tasksEnvelope = await getOrGenerateTasks(working.campaignId, working);
    const jobRecords = syncJobRecordsFromCampaign(
      working,
      tasksEnvelope.tasks,
      materialsEnvelope.items,
      tasksEnvelope.exceptionRecords ?? [],
      tasksEnvelope.jobRecords,
      now,
    );

    const persistedTasks = await writeTasksEnvelope({
      ...tasksEnvelope,
      jobRecords,
      updatedAt: now,
      syncedAt: now,
    });

    const jobIds = jobRecords.map((job) => job.jobId);
    const phaseFacts = resolvePostPayActivationPhase(
      working,
      materialsEnvelope.items,
    );

    const prior = working.postPayActivation;
    const alreadyActivated = activationMatchesJobs(
      prior,
      jobIds,
      checkoutSessionId,
    );

    const activation: PostPayActivationRecord = {
      schemaVersion: studioPostPayActivationV1.schemaVersion,
      status: studioPostPayActivationV1.activationStatuses.activated,
      phase: phaseFacts.phase,
      activatedAt: prior?.status === "activated" ? prior.activatedAt : now,
      lastAttemptAt: now,
      checkoutSessionId,
      paymentIntentId: working.paymentTruth?.paymentIntentId ?? null,
      stripeEventId: working.paymentTruth?.stripeEventId ?? null,
      jobIds,
      taskCount: persistedTasks.tasks.length,
      intakeComplete: phaseFacts.intakeComplete,
      blockingRequiredMaterialsCount: phaseFacts.blockingRequiredMaterialsCount,
      ownerActionRequired: false,
      lastError: null,
    };

    // Skip campaign rewrite when fully identical (idempotent hot path).
    // Still persist when a new monthly production cycle was created (e.g. N+1).
    if (
      alreadyActivated &&
      !cycleEnsure.changed &&
      prior &&
      prior.phase === activation.phase &&
      prior.blockingRequiredMaterialsCount ===
        activation.blockingRequiredMaterialsCount &&
      prior.intakeComplete === activation.intakeComplete &&
      prior.taskCount === activation.taskCount &&
      working.approvedStudioPlan === campaign.approvedStudioPlan &&
      working.sm001MonthlyProductionCycles === campaign.sm001MonthlyProductionCycles
    ) {
      return {
        ok: true,
        campaign: working,
        activation: prior,
        alreadyActivated: true,
      };
    }

    const envelope = await readCampaignEnvelope(working.campaignId);
    const saved = await upsertCampaignRecord(
      {
        ...working,
        postPayActivation: activation,
        updatedAt: now,
      },
      envelope?.clientUserId,
    );

    return {
      ok: true,
      campaign: saved.record,
      activation,
      alreadyActivated: alreadyActivated && !cycleEnsure.changed,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Post-pay activation failed.";
    try {
      const failed = await writePendingRetry(working, message);
      return {
        ok: false,
        campaign: failed,
        activation: failed.postPayActivation ?? null,
        error: "activation_failed",
        message,
      };
    } catch {
      return {
        ok: false,
        campaign,
        activation: campaign.postPayActivation ?? null,
        error: "activation_failed",
        message,
      };
    }
  }
}
