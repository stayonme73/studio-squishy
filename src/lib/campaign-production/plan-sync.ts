import type { CampaignRecord } from "@/config/studio-board";
import { computePlanFingerprint } from "@/lib/campaign-tasks/generate";

import { deliverableKeysForKitchenPlanLine, resolveKitchenV1ServiceIds } from "./deliverable-keys";
import {
  KITCHEN_V1_PRODUCTION_PHASES,
  KITCHEN_V1_SERVICE_ID,
  type CampaignProductionRecord,
  type ProductionWorkUnit,
  type ProductionWorkUnitStatus,
  type ServerProductionEnvelope,
  type StageLineageEntry,
} from "./types";

function taskIdForStage(serviceId: typeof KITCHEN_V1_SERVICE_ID, stage: StageLineageEntry["stage"]): string {
  return `${serviceId}:${stage}`;
}

function buildStageLineage(serviceId: typeof KITCHEN_V1_SERVICE_ID): StageLineageEntry[] {
  return KITCHEN_V1_PRODUCTION_PHASES.map((stage) => ({
    stage,
    taskId: taskIdForStage(serviceId, stage),
    currentVersionId: null,
  }));
}

function createWorkUnit(
  serviceId: typeof KITCHEN_V1_SERVICE_ID,
  deliverableKeys: readonly string[],
  planFingerprint: string,
  now: string,
): ProductionWorkUnit {
  const firstStage = KITCHEN_V1_PRODUCTION_PHASES[0];
  return {
    id: `${serviceId}:production`,
    serviceId,
    deliverableKeys,
    planFingerprint,
    status: "active",
    currentStage: firstStage,
    currentTaskId: taskIdForStage(serviceId, firstStage),
    stageLineage: buildStageLineage(serviceId),
    createdAt: now,
    updatedAt: now,
  };
}

function markUnitForPlanChange(
  unit: ProductionWorkUnit,
  status: Extract<ProductionWorkUnitStatus, "blocked_plan_change" | "superseded">,
  now: string,
): ProductionWorkUnit {
  return {
    ...unit,
    status,
    updatedAt: now,
  };
}

export function emptyProductionRecord(campaignId: string, planFingerprint: string): CampaignProductionRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    version: 1,
    planFingerprint,
    workUnits: [],
    versions: [],
    updatedAt: now,
  };
}

/** Sync work units with frozen plan — preserve all work; block or supersede on mismatch. */
export function syncProductionWithPlan(
  record: CampaignProductionRecord,
  campaign: CampaignRecord,
): CampaignProductionRecord {
  const plan = campaign.approvedStudioPlan;
  if (!plan) {
    return record;
  }

  const planFingerprint = computePlanFingerprint(plan);
  const now = new Date().toISOString();
  const kitchenServiceIds = resolveKitchenV1ServiceIds(plan);
  const kitchenServiceIdSet = new Set(kitchenServiceIds);

  const mergedUnits: ProductionWorkUnit[] = [];

  for (const existing of record.workUnits) {
    if (existing.serviceId !== KITCHEN_V1_SERVICE_ID) {
      mergedUnits.push(existing);
      continue;
    }

    const stillInPlan = kitchenServiceIdSet.has(existing.serviceId);
    const fingerprintMatch = existing.planFingerprint === planFingerprint;

    if (!stillInPlan) {
      if (existing.status === "active" || existing.status === "blocked_plan_change") {
        mergedUnits.push(markUnitForPlanChange(existing, "superseded", now));
      } else {
        mergedUnits.push(existing);
      }
      continue;
    }

    if (!fingerprintMatch) {
      if (existing.status === "active") {
        mergedUnits.push(markUnitForPlanChange(existing, "blocked_plan_change", now));
      } else {
        mergedUnits.push(existing);
      }
      continue;
    }

    mergedUnits.push(existing);
  }

  const existingActiveByService = new Map(
    mergedUnits
      .filter((unit) => unit.serviceId === KITCHEN_V1_SERVICE_ID && unit.status === "active")
      .map((unit) => [unit.serviceId, unit] as const),
  );

  for (const serviceId of kitchenServiceIds) {
    if (serviceId !== KITCHEN_V1_SERVICE_ID) continue;
    if (existingActiveByService.has(serviceId)) continue;

    const hasBlockedOrSuperseded = mergedUnits.some(
      (unit) =>
        unit.serviceId === serviceId &&
        (unit.status === "blocked_plan_change" || unit.status === "superseded"),
    );
    if (hasBlockedOrSuperseded) {
      const deliverableKeys = deliverableKeysForKitchenPlanLine(plan, serviceId);
      mergedUnits.push(createWorkUnit(serviceId, deliverableKeys, planFingerprint, now));
      continue;
    }

    const anyUnit = mergedUnits.some((unit) => unit.serviceId === serviceId);
    if (!anyUnit) {
      const deliverableKeys = deliverableKeysForKitchenPlanLine(plan, serviceId);
      mergedUnits.push(createWorkUnit(serviceId, deliverableKeys, planFingerprint, now));
    }
  }

  return {
    ...record,
    planFingerprint,
    workUnits: mergedUnits,
    updatedAt: now,
  };
}

export function toProductionEnvelope(record: CampaignProductionRecord): ServerProductionEnvelope {
  return {
    ...record,
    syncedAt: new Date().toISOString(),
  };
}
