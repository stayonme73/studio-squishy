import { indexTasksById } from "./dependencies";
import type {
  CampaignTaskItem,
  ProductionRole,
  QaDisposition,
  TaskReadinessContext,
  TaskWorkflowState,
  WorkflowTransitionRequest,
} from "./types";

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

export type DeliveryPrepContext = {
  hasApprovedPlan: boolean;
  planFingerprint: string;
  expectedPlanFingerprint: string;
  directionApproved: boolean;
  hasUnresolvedBlocker: boolean;
};

export function isTerminalWorkflowState(state: TaskWorkflowState): boolean {
  return state === "complete" || state === "cancelled";
}

export function isActiveWorkflowState(state: TaskWorkflowState): boolean {
  return (
    state === "in_progress" ||
    state === "ready_for_qa" ||
    state === "needs_revision" ||
    state === "blocked"
  );
}

function isQaActor(role: ProductionRole): boolean {
  return role === "qa" || role === "owner";
}

function isOwnerOrPlanChange(role: ProductionRole): boolean {
  return role === "owner" || role === "producer_dispatcher";
}

function upstreamQaComplete(
  task: CampaignTaskItem,
  tasksById: Map<string, CampaignTaskItem>,
): boolean {
  const serviceId = task.relatedServiceIds[0];
  if (!serviceId) {
    return false;
  }

  const qaTaskId = `${serviceId}:qa`;
  const qaTask = tasksById.get(qaTaskId);
  return qaTask?.workflowState === "complete";
}

function productionTaskComplete(
  task: CampaignTaskItem,
  tasksById: Map<string, CampaignTaskItem>,
): boolean {
  for (const depId of task.dependsOn) {
    const upstream = tasksById.get(depId);
    if (!upstream || upstream.workflowState !== "complete") {
      return false;
    }
  }
  return true;
}

/** Minimal structural delivery-prep validators — no service-specific content checks. */
export function validateDeliveryPrepComplete(
  task: CampaignTaskItem,
  allTasks: readonly CampaignTaskItem[],
  context: DeliveryPrepContext,
): TransitionResult {
  if (task.phase !== "delivery_prep") {
    return { ok: false, reason: "Task is not delivery prep." };
  }

  const tasksById = indexTasksById(allTasks);
  const reasons: string[] = [];

  if (!productionTaskComplete(task, tasksById)) {
    reasons.push("Required predecessor tasks are not complete.");
  }

  if (!upstreamQaComplete(task, tasksById)) {
    reasons.push("Required QA has not passed.");
  }

  if (!context.hasApprovedPlan) {
    reasons.push("Frozen approved scope does not exist.");
  }

  if (context.planFingerprint !== context.expectedPlanFingerprint) {
    reasons.push("Plan fingerprint does not match frozen approved scope.");
  }

  if (!context.directionApproved) {
    reasons.push("Campaign direction is not approved.");
  }

  if (context.hasUnresolvedBlocker) {
    reasons.push("Unresolved blocker exists.");
  }

  if (reasons.length > 0) {
    return { ok: false, reason: reasons.join(" ") };
  }

  return { ok: true };
}

function rejectsQaScopeExpansion(
  request: WorkflowTransitionRequest,
  task: CampaignTaskItem,
): boolean {
  if (!request.qaDisposition) {
    return false;
  }

  const reason = task.workflowBlockedReason ?? "";
  if (reason.includes("scope_expansion") || reason.includes("client_direction_change")) {
    return true;
  }

  return false;
}

function hasComplianceHold(task: CampaignTaskItem): boolean {
  return (task.workflowBlockedReason ?? "").includes("compliance_hold");
}

function hasOwnerEscalation(task: CampaignTaskItem): boolean {
  return (task.workflowBlockedReason ?? "").includes("owner_escalation");
}

export function canTransitionWorkflow(
  request: WorkflowTransitionRequest,
  task: CampaignTaskItem,
  options: {
    effectiveStatusReady?: boolean;
    allTasks?: readonly CampaignTaskItem[];
    deliveryPrepContext?: DeliveryPrepContext;
    readinessContext?: TaskReadinessContext;
  } = {},
): TransitionResult {
  const { from, to, actorRole, qaDisposition } = request;

  if (from !== normalizeState(task.workflowState)) {
    return { ok: false, reason: "Transition from state does not match task." };
  }

  if (isTerminalWorkflowState(from) && !request.authorizedQaFailReopen) {
    return { ok: false, reason: `Terminal state ${from} cannot transition.` };
  }

  if (from === "complete" && to === "needs_revision") {
    if (!request.authorizedQaFailReopen || !isQaActor(actorRole)) {
      return { ok: false, reason: "Completed work may only reopen via authorized QA fail." };
    }
    if (qaDisposition !== "return_failed_check") {
      return { ok: false, reason: "QA disposition must be return_failed_check." };
    }
    return { ok: true };
  }

  if (isTerminalWorkflowState(from)) {
    return { ok: false, reason: `Terminal state ${from} cannot transition.` };
  }

  if (rejectsQaScopeExpansion(request, task)) {
    return { ok: false, reason: "QA may not expand scope or change client direction." };
  }

  if (hasOwnerEscalation(task) && isQaActor(actorRole)) {
    return { ok: false, reason: "QA may not override Owner escalation." };
  }

  if (hasComplianceHold(task) && isQaActor(actorRole)) {
    return { ok: false, reason: "QA may not override compliance hold." };
  }

  switch (`${from}->${to}`) {
    case "unstarted->in_progress":
      if (!options.effectiveStatusReady) {
        return { ok: false, reason: "Task is not ready to claim." };
      }
      return { ok: true };

    case "in_progress->ready_for_qa":
      return { ok: true };

    case "ready_for_qa->complete":
      if (!isQaActor(actorRole)) {
        return { ok: false, reason: "Only QA may approve work." };
      }
      if (qaDisposition !== "approve_next_stage") {
        return { ok: false, reason: "QA disposition must be approve_next_stage." };
      }
      if (task.phase === "delivery_prep") {
        const ctx = options.deliveryPrepContext;
        if (!ctx || !options.allTasks) {
          return { ok: false, reason: "Delivery prep context required." };
        }
        return validateDeliveryPrepComplete(task, options.allTasks, ctx);
      }
      return { ok: true };

    case "ready_for_qa->needs_revision":
      if (!isQaActor(actorRole)) {
        return { ok: false, reason: "Only QA may return work." };
      }
      if (qaDisposition !== "return_failed_check") {
        return { ok: false, reason: "QA disposition must be return_failed_check." };
      }
      return { ok: true };

    case "ready_for_qa->blocked":
      if (!isQaActor(actorRole)) {
        return { ok: false, reason: "Only QA may mark work blocked." };
      }
      if (qaDisposition !== "mark_blocked") {
        return { ok: false, reason: "QA disposition must be mark_blocked." };
      }
      return { ok: true };

    case "needs_revision->in_progress":
      return { ok: true };

    case "in_progress->unstarted":
      return { ok: true };

    case "blocked->in_progress":
      if (actorRole !== "producer_dispatcher" && actorRole !== "owner") {
        return { ok: false, reason: "Only producer or owner may clear a block." };
      }
      return { ok: true };

    default:
      if (to === "cancelled" && isOwnerOrPlanChange(actorRole)) {
        return { ok: true };
      }
      return { ok: false, reason: `Transition ${from} → ${to} is not allowed.` };
  }
}

function normalizeState(state: TaskWorkflowState | undefined): TaskWorkflowState {
  return state ?? "unstarted";
}

export function deliveryPrepEffectiveNotReady(
  task: CampaignTaskItem,
  allTasks: readonly CampaignTaskItem[],
): boolean {
  if (task.phase !== "delivery_prep") {
    return false;
  }
  const tasksById = indexTasksById(allTasks);
  return !upstreamQaComplete(task, tasksById) || !productionTaskComplete(task, tasksById);
}
