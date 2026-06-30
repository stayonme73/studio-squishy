import type { ServiceId } from "@/catalog/types";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import { applyPinQaToVersion } from "@/lib/campaign-production/actions";
import { requiresKitchenWorkVersionId, validateOptionalQaBlockWorkVersionId, validateWorkVersionIdForTask } from "@/lib/campaign-production/validation";
import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import type { CampaignMaterialItem, MaterialCategory, MaterialContentKind, MaterialRequirementLevel, ServerMaterialsEnvelope } from "@/lib/materials/types";

import {
  canClaimTask,
  canReassignTask,
  canReleaseClaim,
  canSubmitHandoff,
  isRoleCapableForTaskFamily,
  isUserCapableForTaskFamily,
  taskRequiredRole,
  userCanPerformRole,
  userIsProducer,
  userProductionRoles,
} from "./capabilities";
import { buildReadinessContext } from "./readiness";
import {
  appendHandoff,
  buildHandoffRecord,
  validateHandoffPayload,
  validateKitchenHandoffWorkVersion,
  validateReassignmentReason,
} from "./handoffs";
import { applyStatusesWithWorkflow } from "./plan-change";
import {
  appendQaRecord,
  applyFormalQaFailCascade,
  buildDeliveryPrepContext,
  buildQaRecord,
  isFormalQaTask,
  isQaCapableUser,
  qaActorRole,
  validateQaBlock,
  validateQaFail,
  validateQaPass,
  workflowBlockedReasonForMissingClientFact,
  workflowBlockedReasonForQaBlock,
} from "./qa";
import {
  applyApproveClientRequest,
  applyAssignException,
  applyDeclinePromotion,
  applyRaiseException,
  applyResolveException,
} from "./exceptions-actions";
import {
  bridgeExceptionsAfterQaBlock,
  bridgeExceptionsAfterQaFail,
} from "./exceptions-bridge";
import { canTransitionWorkflow } from "./transitions";
import type { CampaignExceptionKind, CampaignExceptionClientRequestDraft } from "./exceptions-types";
import { resolveEffectiveTaskStatus } from "./workflow";
import type {
  CampaignExceptionRecord,
  CampaignTaskItem,
  HandoffPayload,
  ProductionRole,
  QaBlockCategory,
  QaFailCategory,
  QaRecord,
  ReassignmentFlags,
  ServerTasksEnvelope,
  TaskWorkflowState,
} from "./types";

export type TaskActionResult =
  | {
      ok: true;
      envelope: ServerTasksEnvelope;
      task?: CampaignTaskItem;
      exception?: CampaignExceptionRecord;
      materialsEnvelope?: ServerMaterialsEnvelope;
      productionEnvelope?: ServerProductionEnvelope;
    }
  | {
      ok: false;
      error: string;
      status: number;
      conflict?: TaskConflictSnapshot;
    };

export type TaskConflictSnapshot = {
  taskId: string;
  workflowState: TaskWorkflowState;
  claimVersion: string | null;
  task: CampaignTaskItem;
};

export type TasksPatchBody =
  | {
      action: "claim";
      taskId: string;
      from: "unstarted" | "needs_revision";
      claimVersion: string | null;
    }
  | {
      action: "submit_for_handoff";
      taskId: string;
      from: "in_progress";
      claimVersion: string | null;
      handoff: HandoffPayload & { workVersionId?: string };
    }
  | {
      action: "release_claim";
      taskId: string;
      from: "in_progress";
      claimVersion: string | null;
      handoff: HandoffPayload & { workVersionId?: string };
    }
  | {
      action: "reassign";
      taskId: string;
      from: TaskWorkflowState;
      claimVersion: string | null;
      toUserId: string;
      toRole: ProductionRole;
      handoff: HandoffPayload & { workVersionId?: string };
      reason?: string;
      reassignmentFlags?: ReassignmentFlags;
    }
  | {
      action: "qa_pass";
      taskId: string;
      from: "ready_for_qa";
      claimVersion: string | null;
      checks: string[];
      notes?: string;
      workVersionId?: string;
    }
  | {
      action: "qa_fail";
      taskId: string;
      from: "ready_for_qa";
      claimVersion: string | null;
      category: QaFailCategory;
      notes?: string;
      missingFactDescription?: string;
      missingFactReason?: string;
      workVersionId?: string;
    }
  | {
      action: "qa_block";
      taskId: string;
      from: "ready_for_qa";
      claimVersion: string | null;
      category: QaBlockCategory;
      notes?: string;
      workVersionId?: string;
    }
  | {
      action: "raise_exception";
      kind: CampaignExceptionKind;
      title: string;
      description?: string;
      taskId?: string;
      clientRequestDraft?: CampaignExceptionClientRequestDraft;
    }
  | {
      action: "assign_exception";
      exceptionId: string;
      assignToUserId?: string;
      notes?: string;
    }
  | {
      action: "resolve_exception";
      exceptionId: string;
      resolutionNotes?: string;
    }
  | {
      action: "approve_client_request";
      exceptionId: string;
      category: MaterialCategory;
      contentKind?: MaterialContentKind;
      clientFacingLabel: string;
      clientFacingPrompt: string;
      whyNeeded: string;
      requirementLevel: MaterialRequirementLevel;
      relatedServiceIds?: readonly ServiceId[];
      existingMaterialItemIds?: readonly string[];
    }
  | {
      action: "decline_promotion";
      exceptionId: string;
      notes?: string;
    };

export type TaskActionContext = {
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
  materialsEnvelope?: ServerMaterialsEnvelope;
  production?: ServerProductionEnvelope;
  assignments: CampaignAssignmentsFile;
  targetUser?: StudioUser;
};

function claimVersionForTask(task: CampaignTaskItem): string | null {
  return task.claimedAt ?? null;
}

function conflictSnapshot(task: CampaignTaskItem): TaskConflictSnapshot {
  return {
    taskId: task.id,
    workflowState: task.workflowState ?? "unstarted",
    claimVersion: claimVersionForTask(task),
    task,
  };
}

function actorRoleForUser(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  task: CampaignTaskItem,
): ProductionRole {
  if (userIsProducer(user, assignments)) return "producer_dispatcher";
  return taskRequiredRole(task);
}

function assertConcurrency(
  task: CampaignTaskItem,
  from: TaskWorkflowState,
  claimVersion: string | null | undefined,
): TaskActionResult | null {
  const currentState = task.workflowState ?? "unstarted";
  if (currentState !== from) {
    return {
      ok: false,
      error: "Task state has changed.",
      status: 409,
      conflict: conflictSnapshot(task),
    };
  }

  const expectedClaim = claimVersion ?? null;
  const currentClaim = claimVersionForTask(task);
  if (expectedClaim !== currentClaim) {
    return {
      ok: false,
      error: "Task claim has changed.",
      status: 409,
      conflict: conflictSnapshot(task),
    };
  }

  return null;
}

function updateTaskInEnvelope(
  envelope: ServerTasksEnvelope,
  taskId: string,
  updater: (task: CampaignTaskItem) => CampaignTaskItem,
  context: TaskActionContext,
): { envelope: ServerTasksEnvelope; task: CampaignTaskItem } | { error: string; status: number } {
  const index = envelope.tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    return { error: "Task not found.", status: 404 };
  }

  const nextTasks = [...envelope.tasks];
  nextTasks[index] = updater(nextTasks[index]);
  const withStatuses = applyStatusesWithWorkflow(nextTasks, context.campaign, context.materials);
  const task = withStatuses[index];
  const now = new Date().toISOString();

  return {
    envelope: {
      ...envelope,
      tasks: withStatuses,
      updatedAt: now,
      syncedAt: now,
    },
    task,
  };
}

function clearClaim(task: CampaignTaskItem): CampaignTaskItem {
  return {
    ...task,
    claimedByUserId: undefined,
    claimedByDisplayName: undefined,
    claimedAt: undefined,
  };
}

function setClaim(task: CampaignTaskItem, user: StudioUser): CampaignTaskItem {
  return {
    ...task,
    claimedByUserId: user.id,
    claimedByDisplayName: user.displayName,
    claimedAt: new Date().toISOString(),
  };
}

function transitionTask(
  envelope: ServerTasksEnvelope,
  taskId: string,
  to: TaskWorkflowState,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  context: TaskActionContext,
  options: {
    effectiveStatusReady?: boolean;
    authorizedQaFailReopen?: boolean;
    qaDisposition?: import("./types").QaDisposition;
    actorRoleOverride?: ProductionRole;
  } = {},
): TaskActionResult {
  const task = envelope.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    return { ok: false, error: "Task not found.", status: 404 };
  }

  const from = task.workflowState ?? "unstarted";
  const transitionCheck = canTransitionWorkflow(
    {
      taskId,
      from,
      to,
      actorRole: options.actorRoleOverride ?? actorRoleForUser(user, assignments, task),
      qaDisposition: options.qaDisposition,
      authorizedQaFailReopen: options.authorizedQaFailReopen,
    },
    task,
    {
      effectiveStatusReady: options.effectiveStatusReady,
      allTasks: envelope.tasks,
      deliveryPrepContext:
        task.phase === "delivery_prep"
          ? buildDeliveryPrepContext(context.campaign, envelope)
          : undefined,
    },
  );

  if (!transitionCheck.ok) {
    return { ok: false, error: transitionCheck.reason, status: 400 };
  }

  const updated = updateTaskInEnvelope(
    envelope,
    taskId,
    (current) => ({ ...current, workflowState: to }),
    context,
  );

  if ("error" in updated) {
    return { ok: false, error: updated.error, status: updated.status };
  }

  return { ok: true, envelope: updated.envelope, task: updated.task };
}

function appendTaskHandoff(
  envelope: ServerTasksEnvelope,
  record: ReturnType<typeof buildHandoffRecord>,
  taskId: string,
  context: TaskActionContext,
  taskUpdater: (task: CampaignTaskItem) => CampaignTaskItem,
): TaskActionResult {
  let handoffs: ReturnType<typeof appendHandoff>;
  try {
    handoffs = appendHandoff(envelope.handoffs, record);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Handoff append failed.",
      status: 400,
    };
  }

  const withHandoffs: ServerTasksEnvelope = { ...envelope, handoffs };
  const updated = updateTaskInEnvelope(withHandoffs, taskId, taskUpdater, context);
  if ("error" in updated) {
    return { ok: false, error: updated.error, status: updated.status };
  }

  const taskWithHandoff = {
    ...updated.task,
    lastHandoffId: record.id,
  };
  const tasks = updated.envelope.tasks.map((entry) =>
    entry.id === taskId ? taskWithHandoff : entry,
  );

  return {
    ok: true,
    envelope: { ...updated.envelope, tasks },
    task: taskWithHandoff,
  };
}

function validateKitchenQaWorkVersion(
  task: CampaignTaskItem,
  workVersionId: string | undefined,
  production: ServerProductionEnvelope | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!requiresKitchenWorkVersionId(task)) {
    return { ok: true };
  }
  if (!production) {
    return { ok: false, error: "Production store not loaded." };
  }
  const result = validateWorkVersionIdForTask(production, task, workVersionId);
  if (!result.ok) {
    return result;
  }
  return { ok: true };
}

function pinProductionQa(
  production: ServerProductionEnvelope | undefined,
  task: CampaignTaskItem,
  workVersionId: string | undefined,
  qaRecordId: string,
  action: "qa_pass" | "qa_fail",
): ServerProductionEnvelope | undefined {
  if (!production || !requiresKitchenWorkVersionId(task) || !workVersionId) {
    return production;
  }
  const pinned = applyPinQaToVersion(production, task, workVersionId, qaRecordId, action);
  return pinned.ok ? pinned.envelope : production;
}

export function applyClaim(
  envelope: ServerTasksEnvelope,
  body: Extract<TasksPatchBody, { action: "claim" }>,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  const task = envelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) return { ok: false, error: "Task not found.", status: 404 };

  const concurrency = assertConcurrency(task, body.from, body.claimVersion);
  if (concurrency) return concurrency;

  if (!canClaimTask(user, task, context.assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  if (task.claimedByUserId && task.claimedByUserId !== user.id) {
    return { ok: false, error: "Task is already claimed by another user.", status: 400 };
  }

  const readiness = buildReadinessContext(context.campaign);
  const effective = resolveEffectiveTaskStatus(task, readiness, envelope.tasks);
  const transitioned = transitionTask(
    envelope,
    body.taskId,
    "in_progress",
    user,
    context.assignments,
    context,
    { effectiveStatusReady: effective.status === "ready" || body.from === "needs_revision" },
  );
  if (!transitioned.ok) return transitioned;

  const claimed = updateTaskInEnvelope(
    transitioned.envelope,
    body.taskId,
    (current) => setClaim(current, user),
    context,
  );
  if ("error" in claimed) {
    return { ok: false, error: claimed.error, status: claimed.status };
  }

  return { ok: true, envelope: claimed.envelope, task: claimed.task };
}

export function applySubmitForHandoff(
  envelope: ServerTasksEnvelope,
  body: Extract<TasksPatchBody, { action: "submit_for_handoff" }>,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  const task = envelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) return { ok: false, error: "Task not found.", status: 404 };

  const concurrency = assertConcurrency(task, body.from, body.claimVersion);
  if (concurrency) return concurrency;

  if (!canSubmitHandoff(user, task, context.assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const handoffValidation = validateHandoffPayload(body.handoff);
  if (!handoffValidation.ok) {
    return { ok: false, error: handoffValidation.error, status: 400 };
  }

  const kitchenError = validateKitchenHandoffWorkVersion(
    task,
    handoffValidation.payload,
    context.production,
  );
  if (kitchenError) {
    return { ok: false, error: kitchenError, status: 400 };
  }

  const transitioned = transitionTask(
    envelope,
    body.taskId,
    "ready_for_qa",
    user,
    context.assignments,
    context,
  );
  if (!transitioned.ok) return transitioned;

  const record = buildHandoffRecord({
    campaignId: envelope.campaignId,
    taskId: body.taskId,
    fromUserId: user.id,
    fromDisplayName: user.displayName,
    fromRole: actorRoleForUser(user, context.assignments, task),
    toRole: "qa",
    fromState: body.from,
    toState: "ready_for_qa",
    action: "submit_for_handoff",
    payload: handoffValidation.payload,
  });

  return appendTaskHandoff(transitioned.envelope, record, body.taskId, context, clearClaim);
}

export function applyReleaseClaim(
  envelope: ServerTasksEnvelope,
  body: Extract<TasksPatchBody, { action: "release_claim" }>,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  const task = envelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) return { ok: false, error: "Task not found.", status: 404 };

  const concurrency = assertConcurrency(task, body.from, body.claimVersion);
  if (concurrency) return concurrency;

  if (!canReleaseClaim(user, task, context.assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const handoffValidation = validateHandoffPayload(body.handoff);
  if (!handoffValidation.ok) {
    return { ok: false, error: handoffValidation.error, status: 400 };
  }

  const kitchenError = validateKitchenHandoffWorkVersion(
    task,
    handoffValidation.payload,
    context.production,
  );
  if (kitchenError) {
    return { ok: false, error: kitchenError, status: 400 };
  }

  const transitioned = transitionTask(
    envelope,
    body.taskId,
    "unstarted",
    user,
    context.assignments,
    context,
  );
  if (!transitioned.ok) return transitioned;

  const record = buildHandoffRecord({
    campaignId: envelope.campaignId,
    taskId: body.taskId,
    fromUserId: user.id,
    fromDisplayName: user.displayName,
    fromRole: actorRoleForUser(user, context.assignments, task),
    toRole: "producer_dispatcher",
    fromState: body.from,
    toState: "unstarted",
    action: "release_claim",
    payload: handoffValidation.payload,
  });

  return appendTaskHandoff(transitioned.envelope, record, body.taskId, context, clearClaim);
}

export function applyReassign(
  envelope: ServerTasksEnvelope,
  body: Extract<TasksPatchBody, { action: "reassign" }>,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  const task = envelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) return { ok: false, error: "Task not found.", status: 404 };

  const concurrency = assertConcurrency(task, body.from, body.claimVersion);
  if (concurrency) return concurrency;

  if (!canReassignTask(user, context.assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  if (!isRoleCapableForTaskFamily(task.familyId, body.toRole)) {
    return {
      ok: false,
      error: "Target role is not capable for this task family.",
      status: 400,
    };
  }

  if (!context.targetUser) {
    return { ok: false, error: "Target user not found.", status: 404 };
  }

  if (!isUserCapableForTaskFamily(context.targetUser, task, body.toRole, context.assignments)) {
    return {
      ok: false,
      error: "Target user does not have the required capability for this task family.",
      status: 400,
    };
  }

  const reasonError = validateReassignmentReason(body.reassignmentFlags, body.reason);
  if (reasonError) {
    return { ok: false, error: reasonError, status: 400 };
  }

  const handoffValidation = validateHandoffPayload(body.handoff);
  if (!handoffValidation.ok) {
    return { ok: false, error: handoffValidation.error, status: 400 };
  }

  const kitchenError = validateKitchenHandoffWorkVersion(
    task,
    handoffValidation.payload,
    context.production,
  );
  if (kitchenError) {
    return { ok: false, error: kitchenError, status: 400 };
  }

  const fromState = task.workflowState ?? "unstarted";
  const toState: TaskWorkflowState = "in_progress";

  if (fromState !== "in_progress" && fromState !== "unstarted" && fromState !== "needs_revision") {
    return { ok: false, error: "Task cannot be reassigned from its current state.", status: 400 };
  }

  let workingEnvelope = envelope;
  if (fromState !== "in_progress") {
    const readiness = buildReadinessContext(context.campaign);
    const effective = resolveEffectiveTaskStatus(task, readiness, envelope.tasks);
    const transitioned = transitionTask(
      envelope,
      body.taskId,
      "in_progress",
      user,
      context.assignments,
      context,
      { effectiveStatusReady: effective.status === "ready" || fromState === "needs_revision" },
    );
    if (!transitioned.ok) return transitioned;
    workingEnvelope = transitioned.envelope;
  }

  const record = buildHandoffRecord({
    campaignId: envelope.campaignId,
    taskId: body.taskId,
    fromUserId: user.id,
    fromDisplayName: user.displayName,
    fromRole: "producer_dispatcher",
    toRole: body.toRole,
    fromState,
    toState,
    action: "reassign",
    payload: handoffValidation.payload,
    reassignmentReason: body.reason,
    reassignmentFlags: body.reassignmentFlags,
  });

  return appendTaskHandoff(
    workingEnvelope,
    record,
    body.taskId,
    context,
    (current) => ({
      ...setClaim(current, context.targetUser!),
      assignedRole: body.toRole,
      workflowState: "in_progress",
    }),
  );
}

function appendEnvelopeQaRecord(
  envelope: ServerTasksEnvelope,
  record: QaRecord,
): ServerTasksEnvelope {
  return {
    ...envelope,
    qaRecords: appendQaRecord(envelope.qaRecords, record),
    version: 5,
  };
}

function applyQaStateUpdates(
  envelope: ServerTasksEnvelope,
  updates: Map<string, (task: CampaignTaskItem) => CampaignTaskItem>,
  context: TaskActionContext,
): { envelope: ServerTasksEnvelope } | { error: string; status: number } {
  const nextTasks = envelope.tasks.map((task) => {
    const updater = updates.get(task.id);
    return updater ? updater(task) : task;
  });
  const withStatuses = applyStatusesWithWorkflow(nextTasks, context.campaign, context.materials);
  const now = new Date().toISOString();
  return {
    envelope: {
      ...envelope,
      tasks: withStatuses,
      updatedAt: now,
      syncedAt: now,
      version: 5,
    },
  };
}

function assertQaAuthorized(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): TaskActionResult | null {
  if (!isQaCapableUser(user, assignments)) {
    return { ok: false, error: "Forbidden", status: 403 };
  }
  return null;
}

export function applyQaPass(
  envelope: ServerTasksEnvelope,
  body: Extract<TasksPatchBody, { action: "qa_pass" }>,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  const forbidden = assertQaAuthorized(user, context.assignments);
  if (forbidden) return forbidden;

  const task = envelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) return { ok: false, error: "Task not found.", status: 404 };

  const concurrency = assertConcurrency(task, body.from, body.claimVersion);
  if (concurrency) return concurrency;

  const deliveryPrepContext =
    task.phase === "delivery_prep"
      ? buildDeliveryPrepContext(context.campaign, envelope)
      : undefined;

  const validation = validateQaPass(task, body.checks, envelope.tasks, deliveryPrepContext);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const kitchenQa = validateKitchenQaWorkVersion(task, body.workVersionId, context.production);
  if (!kitchenQa.ok) {
    return { ok: false, error: kitchenQa.error, status: 400 };
  }

  const actorRole = qaActorRole(user, context.assignments);
  const transitioned = transitionTask(
    envelope,
    body.taskId,
    "complete",
    user,
    context.assignments,
    context,
    {
      qaDisposition: "approve_next_stage",
      actorRoleOverride: actorRole,
    },
  );
  if (!transitioned.ok) return transitioned;

  const record = buildQaRecord({
    campaignId: envelope.campaignId,
    taskId: body.taskId,
    user,
    actorRole,
    action: "qa_pass",
    checks: body.checks,
    notes: body.notes,
    workVersionId: body.workVersionId,
  });

  const withRecord = appendEnvelopeQaRecord(transitioned.envelope, record);
  const productionEnvelope = pinProductionQa(
    context.production,
    task,
    body.workVersionId,
    record.id,
    "qa_pass",
  );
  const updatedTask = withRecord.tasks.find((entry) => entry.id === body.taskId);
  if (!updatedTask) {
    return { ok: false, error: "Task not found after QA pass.", status: 500 };
  }

  return { ok: true, envelope: withRecord, task: updatedTask, productionEnvelope };
}

export function applyQaFail(
  envelope: ServerTasksEnvelope,
  body: Extract<TasksPatchBody, { action: "qa_fail" }>,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  const forbidden = assertQaAuthorized(user, context.assignments);
  if (forbidden) return forbidden;

  const task = envelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) return { ok: false, error: "Task not found.", status: 404 };

  const concurrency = assertConcurrency(task, body.from, body.claimVersion);
  if (concurrency) return concurrency;

  const validation = validateQaFail(
    task,
    body.category,
    envelope.tasks,
    body.missingFactDescription,
    body.missingFactReason,
  );
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const { routedTask } = validation;
  const kitchenQa = validateKitchenQaWorkVersion(routedTask, body.workVersionId, context.production);
  if (!kitchenQa.ok) {
    return { ok: false, error: kitchenQa.error, status: 400 };
  }

  const actorRole = qaActorRole(user, context.assignments);
  const updates = new Map<string, (task: CampaignTaskItem) => CampaignTaskItem>();

  if (body.category === "production_correction") {
    const reopenFromComplete = routedTask.workflowState === "complete";
    if (reopenFromComplete) {
      const reopenCheck = canTransitionWorkflow(
        {
          taskId: routedTask.id,
          from: "complete",
          to: "needs_revision",
          actorRole,
          qaDisposition: "return_failed_check",
          authorizedQaFailReopen: true,
        },
        routedTask,
      );
      if (!reopenCheck.ok) {
        return { ok: false, error: reopenCheck.reason, status: 400 };
      }
    }

    updates.set(routedTask.id, (current) => ({
      ...current,
      workflowState: "needs_revision",
      workflowBlockedReason: undefined,
      claimedByUserId: undefined,
      claimedByDisplayName: undefined,
      claimedAt: undefined,
    }));
  } else if (body.category === "missing_client_fact") {
    const blockedReason = workflowBlockedReasonForMissingClientFact(body.missingFactDescription!);
    updates.set(routedTask.id, (current) => ({
      ...current,
      workflowState: "blocked",
      workflowBlockedReason: blockedReason,
    }));
  }

  let workingEnvelope = envelope;

  if (body.category === "production_correction" && isFormalQaTask(task)) {
    const cascade = applyFormalQaFailCascade(workingEnvelope.tasks, task);
    workingEnvelope = { ...workingEnvelope, tasks: cascade.tasks };
  }

  const applied = applyQaStateUpdates(workingEnvelope, updates, context);
  if ("error" in applied) {
    return { ok: false, error: applied.error, status: applied.status };
  }

  const record = buildQaRecord({
    campaignId: envelope.campaignId,
    taskId: body.taskId,
    user,
    actorRole,
    action: "qa_fail",
    category: body.category,
    notes: body.notes,
    routedTaskId: routedTask.id,
    missingFactDescription: body.missingFactDescription,
    missingFactReason: body.missingFactReason,
    workVersionId: body.workVersionId,
  });

  const withRecord = appendEnvelopeQaRecord(applied.envelope, record);
  const productionEnvelope = pinProductionQa(
    context.production,
    routedTask,
    body.workVersionId,
    record.id,
    "qa_fail",
  );
  const bridged = bridgeExceptionsAfterQaFail(
    withRecord,
    record,
    body.category,
    routedTask.id,
    context.campaign,
    user,
    context.assignments,
  );
  const updatedTask = bridged.tasks.find((entry) => entry.id === body.taskId);
  if (!updatedTask) {
    return { ok: false, error: "Task not found after QA fail.", status: 500 };
  }

  return { ok: true, envelope: bridged, task: updatedTask, productionEnvelope };
}

export function applyQaBlock(
  envelope: ServerTasksEnvelope,
  body: Extract<TasksPatchBody, { action: "qa_block" }>,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  const forbidden = assertQaAuthorized(user, context.assignments);
  if (forbidden) return forbidden;

  const task = envelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) return { ok: false, error: "Task not found.", status: 404 };

  const concurrency = assertConcurrency(task, body.from, body.claimVersion);
  if (concurrency) return concurrency;

  const validation = validateQaBlock(task, body.category);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  let resolvedWorkVersionId = body.workVersionId?.trim() || undefined;
  if (requiresKitchenWorkVersionId(task) && resolvedWorkVersionId) {
    if (!context.production) {
      return { ok: false, error: "Production store not loaded.", status: 400 };
    }
    const kitchenQa = validateOptionalQaBlockWorkVersionId(
      context.production,
      task,
      body.workVersionId,
    );
    if (!kitchenQa.ok) {
      return { ok: false, error: kitchenQa.error, status: 400 };
    }
    resolvedWorkVersionId = kitchenQa.workVersionId;
  }

  const actorRole = qaActorRole(user, context.assignments);
  const blockedReason = workflowBlockedReasonForQaBlock(body.category);
  const transitioned = transitionTask(
    envelope,
    body.taskId,
    "blocked",
    user,
    context.assignments,
    context,
    { qaDisposition: "mark_blocked", actorRoleOverride: actorRole },
  );
  if (!transitioned.ok) return transitioned;

  const updates = new Map<string, (task: CampaignTaskItem) => CampaignTaskItem>();
  updates.set(body.taskId, (current) => ({
    ...current,
    workflowState: "blocked",
    workflowBlockedReason: blockedReason,
  }));

  const applied = applyQaStateUpdates(transitioned.envelope, updates, context);
  if ("error" in applied) {
    return { ok: false, error: applied.error, status: applied.status };
  }

  const record = buildQaRecord({
    campaignId: envelope.campaignId,
    taskId: body.taskId,
    user,
    actorRole,
    action: "qa_block",
    category: body.category,
    notes: body.notes,
    routedTaskId: body.taskId,
    workVersionId: resolvedWorkVersionId,
  });

  const withRecord = appendEnvelopeQaRecord(applied.envelope, record);
  const bridged = bridgeExceptionsAfterQaBlock(
    withRecord,
    record,
    body.category,
    user,
    context.assignments,
  );
  const updatedTask = bridged.tasks.find((entry) => entry.id === body.taskId);
  if (!updatedTask) {
    return { ok: false, error: "Task not found after QA block.", status: 500 };
  }

  return { ok: true, envelope: bridged, task: updatedTask };
}

export function applyTaskPatch(
  envelope: ServerTasksEnvelope,
  body: TasksPatchBody,
  user: StudioUser,
  context: TaskActionContext,
): TaskActionResult {
  switch (body.action) {
    case "claim":
      return applyClaim(envelope, body, user, context);
    case "submit_for_handoff":
      return applySubmitForHandoff(envelope, body, user, context);
    case "release_claim":
      return applyReleaseClaim(envelope, body, user, context);
    case "reassign":
      return applyReassign(envelope, body, user, context);
    case "qa_pass":
      return applyQaPass(envelope, body, user, context);
    case "qa_fail":
      return applyQaFail(envelope, body, user, context);
    case "qa_block":
      return applyQaBlock(envelope, body, user, context);
    case "raise_exception": {
      const result = applyRaiseException(envelope, body, user, context.assignments);
      if (!result.ok) return result;
      return { ok: true, envelope: result.envelope, exception: result.exception };
    }
    case "assign_exception": {
      const result = applyAssignException(
        envelope,
        body,
        user,
        context.assignments,
        context.targetUser,
      );
      if (!result.ok) return result;
      return { ok: true, envelope: result.envelope, exception: result.exception };
    }
    case "resolve_exception": {
      const result = applyResolveException(
        envelope,
        body,
        user,
        context.assignments,
        context.materials,
      );
      if (!result.ok) return result;
      return { ok: true, envelope: result.envelope, exception: result.exception };
    }
    case "approve_client_request": {
      if (!context.materialsEnvelope) {
        return { ok: false, error: "Materials envelope is required.", status: 500 };
      }
      const result = applyApproveClientRequest(
        envelope,
        body,
        user,
        context.assignments,
        context.materialsEnvelope,
      );
      if (!result.ok) return result;
      return {
        ok: true,
        envelope: result.envelope,
        exception: result.exception,
        materialsEnvelope: result.materialsEnvelope,
      };
    }
    case "decline_promotion": {
      const result = applyDeclinePromotion(envelope, body, user, context.assignments);
      if (!result.ok) return result;
      return { ok: true, envelope: result.envelope, exception: result.exception };
    }
    default:
      return { ok: false, error: "Unknown action", status: 400 };
  }
}

export function resolveOperatorPayload(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
) {
  return {
    userId: user.id,
    capabilities: [...userProductionRoles(user, assignments)],
    canReassign: canReassignTask(user, assignments),
  };
}

export function isTasksTeamAudience(user: StudioUser): boolean {
  return user.roles.includes("owner") || user.roles.includes("staff");
}

export function claimVersionLabel(task: CampaignTaskItem): string | null {
  return claimVersionForTask(task);
}

export function userHasOperateCapability(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (userIsProducer(user, assignments)) return true;
  return userProductionRoles(user, assignments).length > 0;
}

// re-export for access tests
export { userCanPerformRole };
