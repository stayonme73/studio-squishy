import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import {
  KITCHEN_V1_PRODUCTION_PHASES,
  KITCHEN_V1_SERVICE_ID,
  type KitchenV1ProductionPhase,
  type ProductionVersionReason,
  type ServerProductionEnvelope,
} from "./types";

export const MAX_PRODUCTION_VERSION_BODY_LENGTH = 100_000;

const VERSION_REASONS = new Set<ProductionVersionReason>([
  "initial",
  "internal_revision",
  "qa_revision",
  "client_revision",
]);

export function isKitchenV1ProductionPhase(
  phase: CampaignTaskItem["phase"],
): phase is KitchenV1ProductionPhase {
  return (KITCHEN_V1_PRODUCTION_PHASES as readonly string[]).includes(phase);
}

export function isKitchenV1ProductionTask(task: CampaignTaskItem): boolean {
  return (
    task.relatedServiceIds.includes(KITCHEN_V1_SERVICE_ID) &&
    isKitchenV1ProductionPhase(task.phase)
  );
}

/** New Kitchen V1 handoffs / QA for sm-001 production phases require a valid workVersionId. */
export function requiresKitchenWorkVersionId(task: CampaignTaskItem): boolean {
  return isKitchenV1ProductionTask(task);
}

export function validateVersionBody(
  body: string | undefined,
): { ok: true; body: string } | { ok: false; error: string } {
  const trimmed = body?.trim();
  if (!trimmed) {
    return { ok: false, error: "Work body is required." };
  }
  if (trimmed.length > MAX_PRODUCTION_VERSION_BODY_LENGTH) {
    return {
      ok: false,
      error: `Work body must be at most ${MAX_PRODUCTION_VERSION_BODY_LENGTH} characters.`,
    };
  }
  return { ok: true, body: trimmed };
}

export function validateVersionReason(
  reason: string | undefined,
): { ok: true; reason: ProductionVersionReason } | { ok: false; error: string } {
  if (!reason || !VERSION_REASONS.has(reason as ProductionVersionReason)) {
    return { ok: false, error: "Invalid version reason." };
  }
  return { ok: true, reason: reason as ProductionVersionReason };
}

export function findWorkUnitForTask(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
): import("./types").ProductionWorkUnit | undefined {
  if (!task.relatedServiceIds.includes(KITCHEN_V1_SERVICE_ID)) return undefined;
  return envelope.workUnits.find((unit) => unit.serviceId === KITCHEN_V1_SERVICE_ID);
}

export function findVersionById(
  envelope: ServerProductionEnvelope,
  workVersionId: string,
): import("./types").ProductionVersion | undefined {
  return envelope.versions.find((version) => version.id === workVersionId);
}

export function currentVersionForTask(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
): import("./types").ProductionVersion | null {
  const unit = findWorkUnitForTask(envelope, task);
  if (!unit || !isKitchenV1ProductionPhase(task.phase)) return null;
  const lineage = unit.stageLineage.find((entry) => entry.stage === task.phase);
  if (!lineage?.currentVersionId) return null;
  return findVersionById(envelope, lineage.currentVersionId) ?? null;
}

export function validateWorkVersionIdForTask(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
  workVersionId: string | undefined,
): { ok: true; version: import("./types").ProductionVersion } | { ok: false; error: string } {
  if (!requiresKitchenWorkVersionId(task)) {
    return { ok: false, error: "Task does not use Kitchen work versions." };
  }
  if (!workVersionId?.trim()) {
    return { ok: false, error: "workVersionId is required for Kitchen production handoffs and QA." };
  }

  const unit = findWorkUnitForTask(envelope, task);
  if (!unit) {
    return { ok: false, error: "No production work unit found for this task." };
  }
  if (unit.status === "blocked_plan_change" || unit.status === "superseded") {
    return { ok: false, error: "Production work is blocked due to a plan change." };
  }
  if (unit.currentTaskId !== task.id) {
    return { ok: false, error: "Work unit is not at this production stage." };
  }

  const version = findVersionById(envelope, workVersionId.trim());
  if (!version) {
    return { ok: false, error: "workVersionId not found." };
  }
  if (version.workUnitId !== unit.id) {
    return { ok: false, error: "workVersionId does not belong to this work unit." };
  }
  if (version.taskId !== task.id) {
    return { ok: false, error: "workVersionId does not match this task stage." };
  }
  if (version.qaPin?.action === "qa_pass") {
    return { ok: false, error: "This work version was already QA-approved." };
  }

  const lineage = unit.stageLineage.find((entry) => entry.stage === task.phase);
  if (lineage?.currentVersionId !== version.id) {
    return { ok: false, error: "workVersionId is not the current version for this stage." };
  }

  return { ok: true, version };
}

/**
 * Kitchen V1 qa_block — workVersionId is optional (pre-version compliance/direction blocks).
 * When provided, validates existence and task ownership without requiring the current version.
 */
export function validateOptionalQaBlockWorkVersionId(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
  workVersionId: string | undefined,
): { ok: true; workVersionId?: string } | { ok: false; error: string } {
  if (!requiresKitchenWorkVersionId(task)) {
    return { ok: true, workVersionId: workVersionId?.trim() || undefined };
  }

  const trimmed = workVersionId?.trim();
  if (!trimmed) {
    return { ok: true };
  }

  const unit = findWorkUnitForTask(envelope, task);
  if (!unit) {
    return { ok: false, error: "No production work unit found for this task." };
  }

  const version = findVersionById(envelope, trimmed);
  if (!version) {
    return { ok: false, error: "workVersionId not found." };
  }
  if (version.workUnitId !== unit.id) {
    return { ok: false, error: "workVersionId does not belong to this work unit." };
  }
  if (version.taskId !== task.id) {
    return { ok: false, error: "workVersionId does not match this task stage." };
  }

  return { ok: true, workVersionId: trimmed };
}

export function validateWorkUnitCanMutate(
  unit: import("./types").ProductionWorkUnit,
): { ok: true } | { ok: false; error: string } {
  if (unit.status === "blocked_plan_change") {
    return { ok: false, error: "Work unit is blocked due to a plan change." };
  }
  if (unit.status === "superseded") {
    return { ok: false, error: "Work unit has been superseded." };
  }
  if (unit.status === "complete") {
    return { ok: false, error: "Work unit is complete." };
  }
  return { ok: true };
}
