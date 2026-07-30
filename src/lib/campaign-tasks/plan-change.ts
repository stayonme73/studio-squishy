import { resolveResponsibleRole } from "./roles";
import { DEFAULT_WORKFLOW_STATE, applyEffectiveStatus } from "./workflow";
import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { resolveBlockedReason } from "./blocking";
import { buildReadinessContext, resolveReadinessLayer } from "./readiness";
import type {
  CampaignTaskItem,
  CampaignTasksRecord,
  FrozenPlanSnapshot,
  ServerTasksEnvelope,
  TaskWorkflowState,
} from "./types";

/** Schema v12 — C8c correction-use ledger + owner extra-use grants. */
export const CAMPAIGN_TASKS_SCHEMA_VERSION = 12;

export type MergePlanChangeOptions = {
  ownerApproved?: boolean;
};

function taskIdsInRecord(record: CampaignTasksRecord): Set<string> {
  return new Set(record.tasks.map((task) => task.id));
}

function relatedServiceIdsInRecord(record: CampaignTasksRecord): Set<string> {
  const ids = new Set<string>();
  for (const task of record.tasks) {
    for (const serviceId of task.relatedServiceIds) {
      ids.add(serviceId);
    }
  }
  return ids;
}

function isNonTerminal(state: TaskWorkflowState | undefined): boolean {
  const normalized = state ?? DEFAULT_WORKFLOW_STATE;
  return normalized !== "complete" && normalized !== "cancelled";
}

function cancelTaskForPlanChange(task: CampaignTaskItem): CampaignTaskItem {
  return {
    ...task,
    workflowState: "cancelled",
    workflowBlockedReason: "plan_change",
  };
}

function initFreshTask(task: CampaignTaskItem): CampaignTaskItem {
  return {
    ...task,
    workflowState: DEFAULT_WORKFLOW_STATE,
    responsibleRole: resolveResponsibleRole(task),
  };
}

/** Merge plan-change delta — preserve completed work, cancel removed scope, add new tasks. */
export function mergePlanChangeTasks(
  existing: CampaignTasksRecord,
  freshGenerated: CampaignTasksRecord,
  options: MergePlanChangeOptions = {},
): CampaignTasksRecord {
  const ownerApproved = options.ownerApproved ?? false;
  const previousVersion = existing.planVersion ?? 1;
  const frozenAt = existing.updatedAt;
  const previousSnapshot: FrozenPlanSnapshot = {
    version: previousVersion,
    planFingerprint: existing.planFingerprint,
    frozenAt,
  };

  const freshIds = taskIdsInRecord(freshGenerated);
  const freshServiceIds = relatedServiceIdsInRecord(freshGenerated);
  const mergedById = new Map<string, CampaignTaskItem>();

  for (const task of existing.tasks) {
    const state = task.workflowState ?? DEFAULT_WORKFLOW_STATE;

    if (state === "complete") {
      mergedById.set(task.id, { ...task });
      continue;
    }

    const servicesRemoved = task.relatedServiceIds.every(
      (serviceId) => !freshServiceIds.has(serviceId),
    );
    const idRemoved = !freshIds.has(task.id);

    if (servicesRemoved || idRemoved) {
      if (isNonTerminal(state)) {
        mergedById.set(task.id, cancelTaskForPlanChange(task));
      } else {
        mergedById.set(task.id, { ...task });
      }
      continue;
    }

    mergedById.set(task.id, { ...task });
  }

  for (const freshTask of freshGenerated.tasks) {
    if (!mergedById.has(freshTask.id)) {
      mergedById.set(freshTask.id, initFreshTask(freshTask));
    }
  }

  const snapshots = [...(existing.frozenPlanSnapshots ?? []), previousSnapshot];

  return {
    ...existing,
    tasks: [...mergedById.values()],
    handoffs: existing.handoffs ?? [],
    qaRecords: existing.qaRecords ?? [],
    exceptionRecords: existing.exceptionRecords ?? [],
    exceptionEvents: existing.exceptionEvents ?? [],
    jobRecords: existing.jobRecords ?? [],
    jobActivityEvents: existing.jobActivityEvents ?? [],
    jobReviewFeedback: existing.jobReviewFeedback ?? [],
    jobCommunicationRecords: existing.jobCommunicationRecords ?? [],
    jobCorrectionUses: existing.jobCorrectionUses ?? [],
    jobCorrectionExtraGrants: existing.jobCorrectionExtraGrants ?? [],
    planFingerprint: freshGenerated.planFingerprint,
    planVersion: previousVersion + 1,
    frozenPlanSnapshots: snapshots,
    planChangePendingOwnerApproval: !ownerApproved,
    updatedAt: new Date().toISOString(),
    version: CAMPAIGN_TASKS_SCHEMA_VERSION,
  };
}

export function applyStatusesWithWorkflow(
  tasks: CampaignTaskItem[],
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[],
): CampaignTaskItem[] {
  const context = buildReadinessContext(campaign);

  return tasks.map((task) => {
    const materialReason = resolveBlockedReason(task, materials);
    const readiness = resolveReadinessLayer(task, context, tasks, materialReason);
    const withWorkflow = {
      ...task,
      workflowState: task.workflowState ?? DEFAULT_WORKFLOW_STATE,
      responsibleRole: task.responsibleRole ?? resolveResponsibleRole(task),
    };
    return applyEffectiveStatus(withWorkflow, context, tasks, readiness);
  });
}

export function normalizeLegacyTask(task: CampaignTaskItem): CampaignTaskItem {
  return {
    ...task,
    workflowState: task.workflowState ?? DEFAULT_WORKFLOW_STATE,
    responsibleRole: task.responsibleRole ?? resolveResponsibleRole(task),
  };
}

export function normalizeLegacyRecord(record: ServerTasksEnvelope): ServerTasksEnvelope {
  return {
    ...record,
    version: record.version ?? CAMPAIGN_TASKS_SCHEMA_VERSION,
    planVersion: record.planVersion ?? 1,
    frozenPlanSnapshots: record.frozenPlanSnapshots ?? [],
    handoffs: record.handoffs ?? [],
    qaRecords: record.qaRecords ?? [],
    exceptionRecords: record.exceptionRecords ?? [],
    exceptionEvents: record.exceptionEvents ?? [],
    jobRecords: record.jobRecords ?? [],
    jobActivityEvents: record.jobActivityEvents ?? [],
    jobReviewFeedback: record.jobReviewFeedback ?? [],
    jobCommunicationRecords: record.jobCommunicationRecords ?? [],
    jobCorrectionUses: record.jobCorrectionUses ?? [],
    jobCorrectionExtraGrants: record.jobCorrectionExtraGrants ?? [],
    tasks: record.tasks.map(normalizeLegacyTask),
  };
}

/** True when the only diff is adding default workflow fields to legacy tasks. */
export function isLegacyWorkflowDefaultOnlyChange(
  before: CampaignTasksRecord,
  after: CampaignTasksRecord,
): boolean {
  if (before.planFingerprint !== after.planFingerprint) {
    return false;
  }
  if (before.tasks.length !== after.tasks.length) {
    return false;
  }

  for (let index = 0; index < before.tasks.length; index += 1) {
    const prev = before.tasks[index];
    const next = after.tasks[index];
    const prevCore = { ...prev, workflowState: undefined, responsibleRole: undefined };
    const nextCore = { ...next, workflowState: undefined, responsibleRole: undefined };
    if (JSON.stringify(prevCore) !== JSON.stringify(nextCore)) {
      return false;
    }
    const hadWorkflow = prev.workflowState !== undefined;
    const hadRole = prev.responsibleRole !== undefined;
    if (hadWorkflow && prev.workflowState !== next.workflowState) {
      return false;
    }
    if (hadRole && prev.responsibleRole !== next.responsibleRole) {
      return false;
    }
  }

  return true;
}
