import { randomUUID } from "node:crypto";

import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";

import {
  KITCHEN_V1_PRODUCTION_PHASES,
  type KitchenV1ProductionPhase,
  type ProductionVersion,
  type ProductionVersionReason,
  type ProductionWorkUnit,
  type ServerProductionEnvelope,
} from "./types";
import {
  currentVersionForTask,
  findWorkUnitForTask,
  isKitchenV1ProductionPhase,
  validateVersionBody,
  validateVersionReason,
  validateWorkUnitCanMutate,
  validateWorkVersionIdForTask,
} from "./validation";

export type ProductionActionResult =
  | { ok: true; envelope: ServerProductionEnvelope; version?: ProductionVersion; workUnit?: ProductionWorkUnit }
  | { ok: false; error: string; status: number };

function nextStage(stage: KitchenV1ProductionPhase): KitchenV1ProductionPhase | null {
  const index = KITCHEN_V1_PRODUCTION_PHASES.indexOf(stage);
  if (index < 0 || index >= KITCHEN_V1_PRODUCTION_PHASES.length - 1) return null;
  return KITCHEN_V1_PRODUCTION_PHASES[index + 1];
}

function updateWorkUnit(
  envelope: ServerProductionEnvelope,
  workUnitId: string,
  updater: (unit: ProductionWorkUnit) => ProductionWorkUnit,
): ServerProductionEnvelope {
  const now = new Date().toISOString();
  return {
    ...envelope,
    workUnits: envelope.workUnits.map((unit) =>
      unit.id === workUnitId ? updater(unit) : unit,
    ),
    updatedAt: now,
    syncedAt: now,
  };
}

function appendVersion(
  envelope: ServerProductionEnvelope,
  version: ProductionVersion,
  workUnitId: string,
  stage: KitchenV1ProductionPhase,
): ServerProductionEnvelope {
  const withVersion: ServerProductionEnvelope = {
    ...envelope,
    versions: [...envelope.versions, version],
    updatedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };

  return updateWorkUnit(withVersion, workUnitId, (unit) => ({
    ...unit,
    stageLineage: unit.stageLineage.map((entry) =>
      entry.stage === stage ? { ...entry, currentVersionId: version.id } : entry,
    ),
    updatedAt: new Date().toISOString(),
  }));
}

export function applyCreateVersion(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
  body: {
    body: string;
    reason?: ProductionVersionReason;
  },
  user: StudioUser,
): ProductionActionResult {
  if (!isKitchenV1ProductionPhase(task.phase)) {
    return { ok: false, error: "Task phase does not support Kitchen work versions.", status: 400 };
  }

  const unit = findWorkUnitForTask(envelope, task);
  if (!unit) {
    return { ok: false, error: "No production work unit found.", status: 404 };
  }

  const mutable = validateWorkUnitCanMutate(unit);
  if (!mutable.ok) {
    return { ok: false, error: mutable.error, status: 400 };
  }
  if (unit.currentTaskId !== task.id) {
    return { ok: false, error: "Work unit is not at this production stage.", status: 400 };
  }

  const bodyValidation = validateVersionBody(body.body);
  if (!bodyValidation.ok) {
    return { ok: false, error: bodyValidation.error, status: 400 };
  }

  const current = currentVersionForTask(envelope, task);
  const defaultReason: ProductionVersionReason = current ? "internal_revision" : "initial";
  const reasonValidation = validateVersionReason(body.reason ?? defaultReason);
  if (!reasonValidation.ok) {
    return { ok: false, error: reasonValidation.error, status: 400 };
  }

  const now = new Date().toISOString();
  const version: ProductionVersion = {
    id: randomUUID(),
    workUnitId: unit.id,
    taskId: task.id,
    stage: task.phase,
    reason: reasonValidation.reason,
    contentKind: "plain_text",
    body: bodyValidation.body,
    createdAt: now,
    createdByUserId: user.id,
    createdByDisplayName: user.displayName,
  };

  const saved = appendVersion(envelope, version, unit.id, task.phase);
  const workUnit = saved.workUnits.find((entry) => entry.id === unit.id);

  return { ok: true, envelope: saved, version, workUnit };
}

export function applyPinQaToVersion(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
  workVersionId: string,
  qaRecordId: string,
  action: "qa_pass" | "qa_fail",
): ProductionActionResult {
  const validation = validateWorkVersionIdForTask(envelope, task, workVersionId);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const { version } = validation;
  if (version.qaPin) {
    return { ok: false, error: "This work version already has a QA pin.", status: 400 };
  }

  const now = new Date().toISOString();
  const pinned: ProductionVersion = {
    ...version,
    qaPin: {
      workVersionId: version.id,
      qaRecordId,
      action,
      pinnedAt: now,
    },
  };

  const versions = envelope.versions.map((entry) => (entry.id === version.id ? pinned : entry));
  let saved: ServerProductionEnvelope = {
    ...envelope,
    versions,
    updatedAt: now,
    syncedAt: now,
  };

  if (action === "qa_pass") {
    saved = applyAdvanceAfterQaPass(saved, task);
  }

  const workUnit = saved.workUnits.find((entry) => entry.id === version.workUnitId);
  return { ok: true, envelope: saved, version: pinned, workUnit };
}

export function applyAdvanceAfterQaPass(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
): ServerProductionEnvelope {
  if (!isKitchenV1ProductionPhase(task.phase)) {
    return envelope;
  }

  const unit = findWorkUnitForTask(envelope, task);
  if (!unit) return envelope;

  const mutable = validateWorkUnitCanMutate(unit);
  if (!mutable.ok) return envelope;
  if (unit.currentTaskId !== task.id) return envelope;

  const next = nextStage(task.phase);
  if (!next) {
    const now = new Date().toISOString();
    return updateWorkUnit(envelope, unit.id, (current) => ({
      ...current,
      status: "complete",
      updatedAt: now,
    }));
  }

  const now = new Date().toISOString();
  return updateWorkUnit(envelope, unit.id, (current) => ({
    ...current,
    currentStage: next,
    currentTaskId: `${current.serviceId}:${next}`,
    updatedAt: now,
  }));
}
