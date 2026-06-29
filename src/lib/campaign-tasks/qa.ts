import { randomUUID } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import { userCanPerformRole } from "./capabilities";
import { indexTasksById } from "./dependencies";
import { validateChecklistForPhase } from "./qa-checklists";
import { buildReadinessContext } from "./readiness";
import { validateDeliveryPrepComplete, type DeliveryPrepContext } from "./transitions";
import type {
  CampaignTaskItem,
  CampaignTasksRecord,
  ProductionRole,
  QaBlockCategory,
  QaFailCategory,
  QaRecord,
  ServerTasksEnvelope,
  TaskPhase,
} from "./types";

export const SCOPE_CHANGE_REJECT_MESSAGE =
  "Scope-changing feedback requires an exception, not QA revision.";

export function isFormalQaTask(task: CampaignTaskItem): boolean {
  return task.phase === "qa";
}

export function isQaCapableUser(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (isOwnerUser(user)) return true;
  return userCanPerformRole(user, "qa", assignments);
}

export function qaActorRole(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ProductionRole {
  return isOwnerUser(user) ? "owner" : "qa";
}

export function isQaBlockedReason(task: CampaignTaskItem): boolean {
  const reason = task.workflowBlockedReason ?? "";
  return reason.includes("compliance_hold") || reason.includes("owner_escalation");
}

export function deliveryPrepTaskIdForService(serviceId: string): string {
  return `${serviceId}:delivery_prep`;
}

export function formalQaTaskIdForService(serviceId: string): string {
  return `${serviceId}:qa`;
}

/** Inline QA targets the same task; formal QA routes to upstream production dependency. */
export function routeQaFailTarget(
  task: CampaignTaskItem,
  allTasks: readonly CampaignTaskItem[],
): CampaignTaskItem | null {
  if (!isFormalQaTask(task)) {
    return task;
  }

  const tasksById = indexTasksById(allTasks);
  for (const depId of task.dependsOn) {
    const upstream = tasksById.get(depId);
    if (upstream && upstream.phase !== "qa" && upstream.phase !== "delivery_prep") {
      return upstream;
    }
  }

  return null;
}

export function expectedApprovedPlanFingerprint(record: CampaignTasksRecord): string {
  if (record.planChangePendingOwnerApproval && record.frozenPlanSnapshots?.length) {
    return record.frozenPlanSnapshots[record.frozenPlanSnapshots.length - 1].planFingerprint;
  }
  return record.planFingerprint;
}

/** Structural delivery-prep context — no service-specific content checks. */
export function buildDeliveryPrepContext(
  campaign: CampaignRecord,
  record: CampaignTasksRecord,
): DeliveryPrepContext {
  const readiness = buildReadinessContext(campaign);
  const hasUnresolvedBlocker = record.tasks.some(
    (task) =>
      task.workflowState === "blocked" &&
      (task.workflowBlockedReason?.includes("compliance_hold") ||
        task.workflowBlockedReason?.includes("owner_escalation")),
  );

  return {
    hasApprovedPlan: readiness.hasApprovedPlan,
    planFingerprint: record.planFingerprint,
    expectedPlanFingerprint: expectedApprovedPlanFingerprint(record),
    directionApproved: readiness.directionApproved,
    hasUnresolvedBlocker,
  };
}

export function appendQaRecord(
  existing: readonly QaRecord[] | undefined,
  record: QaRecord,
): QaRecord[] {
  return [...(existing ?? []), record];
}

export function buildQaRecord(input: {
  campaignId: string;
  taskId: string;
  user: StudioUser;
  actorRole: ProductionRole;
  action: QaRecord["action"];
  category?: QaFailCategory | QaBlockCategory;
  checks?: readonly string[];
  notes?: string;
  routedTaskId?: string;
  missingFactDescription?: string;
  missingFactReason?: string;
}): QaRecord {
  return {
    id: randomUUID(),
    taskId: input.taskId,
    campaignId: input.campaignId,
    createdAt: new Date().toISOString(),
    actorUserId: input.user.id,
    actorDisplayName: input.user.displayName,
    actorRole: input.actorRole,
    action: input.action,
    category: input.category,
    checks: input.checks,
    notes: input.notes,
    routedTaskId: input.routedTaskId,
    missingFactDescription: input.missingFactDescription,
    missingFactReason: input.missingFactReason,
  };
}

export function validateQaPass(
  task: CampaignTaskItem,
  checks: readonly string[] | undefined,
  allTasks: readonly CampaignTaskItem[],
  deliveryPrepContext?: DeliveryPrepContext,
): { ok: true } | { ok: false; error: string } {
  if (task.workflowState !== "ready_for_qa") {
    return { ok: false, error: "Task is not ready for QA." };
  }

  if (isQaBlockedReason(task)) {
    return { ok: false, error: "QA cannot pass a compliance or escalation block." };
  }

  const checklist = validateChecklistForPhase(task.phase, checks);
  if (!checklist.ok) {
    return checklist;
  }

  if (task.phase === "delivery_prep") {
    if (!deliveryPrepContext) {
      return { ok: false, error: "Delivery prep context required." };
    }
    const deliveryCheck = validateDeliveryPrepComplete(task, allTasks, deliveryPrepContext);
    if (!deliveryCheck.ok) {
      return { ok: false, error: deliveryCheck.reason };
    }
  }

  return { ok: true };
}

export function validateQaFailCategory(
  category: QaFailCategory,
): { ok: true } | { ok: false; error: string } {
  if (category === "scope_change") {
    return { ok: false, error: SCOPE_CHANGE_REJECT_MESSAGE };
  }
  return { ok: true };
}

export function validateQaFail(
  task: CampaignTaskItem,
  category: QaFailCategory,
  allTasks: readonly CampaignTaskItem[],
  missingFactDescription?: string,
  missingFactReason?: string,
): { ok: true; routedTask: CampaignTaskItem } | { ok: false; error: string } {
  const categoryCheck = validateQaFailCategory(category);
  if (!categoryCheck.ok) {
    return categoryCheck;
  }

  if (task.workflowState !== "ready_for_qa") {
    return { ok: false, error: "Task is not ready for QA." };
  }

  const routedTask = routeQaFailTarget(task, allTasks);
  if (!routedTask) {
    return { ok: false, error: "Unable to route QA fail to upstream production task." };
  }

  if (category === "missing_client_fact") {
    if (!missingFactDescription?.trim() || !missingFactReason?.trim()) {
      return {
        ok: false,
        error: "missing_client_fact requires description and reason.",
      };
    }
  }

  return { ok: true, routedTask };
}

export function validateQaBlock(
  task: CampaignTaskItem,
  category: QaBlockCategory,
): { ok: true } | { ok: false; error: string } {
  if (task.workflowState !== "ready_for_qa") {
    return { ok: false, error: "Task is not ready for QA." };
  }

  if (!category) {
    return { ok: false, error: "QA block category is required." };
  }

  return { ok: true };
}

export function workflowBlockedReasonForQaBlock(category: QaBlockCategory): string {
  switch (category) {
    case "compliance_concern":
      return "compliance_hold";
    case "direction_disagreement":
      return "owner_escalation";
    default:
      return "compliance_hold";
  }
}

export function workflowBlockedReasonForMissingClientFact(description: string): string {
  return `missing_client_fact:${description.trim()}`;
}

export type FormalQaFailCascadeResult = {
  tasks: CampaignTaskItem[];
  resetTaskIds: string[];
};

/** Formal QA production_correction fail — reopen upstream, reset formal QA and delivery prep. */
export function applyFormalQaFailCascade(
  allTasks: readonly CampaignTaskItem[],
  qaTask: CampaignTaskItem,
): FormalQaFailCascadeResult {
  const serviceId = qaTask.relatedServiceIds[0];
  if (!serviceId) {
    return { tasks: [...allTasks], resetTaskIds: [] };
  }

  const qaId = formalQaTaskIdForService(serviceId);
  const deliveryPrepId = deliveryPrepTaskIdForService(serviceId);
  const resetTaskIds: string[] = [];

  const tasks = allTasks.map((entry) => {
    if (entry.id === qaId || entry.id === deliveryPrepId) {
      resetTaskIds.push(entry.id);
      return {
        ...entry,
        workflowState: "unstarted" as const,
        workflowBlockedReason: undefined,
        claimedByUserId: undefined,
        claimedByDisplayName: undefined,
        claimedAt: undefined,
      };
    }
    return entry;
  });

  return { tasks, resetTaskIds };
}

export function resolveQaSummary(qaRecords: readonly QaRecord[] | undefined) {
  const records = qaRecords ?? [];
  const byAction = records.reduce<Record<QaRecord["action"], number>>(
    (counts, record) => {
      counts[record.action] = (counts[record.action] ?? 0) + 1;
      return counts;
    },
    { qa_pass: 0, qa_fail: 0, qa_block: 0 },
  );

  return {
    totalRecords: records.length,
    byAction,
    lastRecordAt: records.length > 0 ? records[records.length - 1].createdAt : null,
  };
}

export function qaRecordsForTask(
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): readonly QaRecord[] {
  return (qaRecords ?? []).filter(
    (record) => record.taskId === taskId || record.routedTaskId === taskId,
  );
}

export function stripInternalQaFields(
  envelope: ServerTasksEnvelope,
): Omit<ServerTasksEnvelope, "qaRecords"> {
  const { qaRecords: _qaRecords, ...rest } = envelope;
  return rest;
}

export function isProductionPhase(phase: TaskPhase): boolean {
  return phase !== "qa" && phase !== "delivery_prep";
}
