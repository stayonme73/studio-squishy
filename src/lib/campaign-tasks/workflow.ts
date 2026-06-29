import {
  hasCancelledUpstream,
  indexTasksById,
  UPSTREAM_CANCELLED_BLOCK_REASON,
  upstreamDependenciesPending,
} from "./dependencies";
import { resolveReadinessLayer, type ReadinessResolution } from "./readiness";
import type {
  CampaignTaskItem,
  TaskEffectiveStatus,
  TaskReadinessContext,
  TaskWorkflowState,
} from "./types";

export const DEFAULT_WORKFLOW_STATE: TaskWorkflowState = "unstarted";

export function normalizeWorkflowState(
  workflowState: TaskWorkflowState | undefined,
): TaskWorkflowState {
  return workflowState ?? DEFAULT_WORKFLOW_STATE;
}

export function isTerminalWorkflowState(state: TaskWorkflowState): boolean {
  return state === "complete" || state === "cancelled";
}

export function mapWorkflowToEffectiveStatus(
  workflowState: TaskWorkflowState,
): TaskEffectiveStatus {
  switch (workflowState) {
    case "in_progress":
      return "in_progress";
    case "ready_for_qa":
      return "ready_for_qa";
    case "needs_revision":
      return "needs_revision";
    case "blocked":
      return "blocked";
    case "complete":
      return "complete";
    case "cancelled":
      return "cancelled";
    default:
      return "not_ready";
  }
}

export type EffectiveStatusResolution = {
  status: TaskEffectiveStatus;
  blockedReason?: string;
  workflowBlockedReason?: string;
};

function resolveFromReadiness(
  readiness: ReadinessResolution,
): EffectiveStatusResolution {
  if (readiness.readiness === "gates_pending") {
    return { status: "not_ready" };
  }
  if (readiness.readiness === "material_blocked") {
    return {
      status: "blocked",
      blockedReason: readiness.blockedReason,
    };
  }
  return { status: "ready" };
}

/** Merge persisted workflow with computed readiness — never infer in_progress/ready_for_qa/complete. */
export function resolveEffectiveTaskStatus(
  task: CampaignTaskItem,
  context: TaskReadinessContext,
  allTasks: readonly CampaignTaskItem[],
  readiness?: ReadinessResolution,
): EffectiveStatusResolution {
  const workflowState = normalizeWorkflowState(task.workflowState);
  const tasksById = indexTasksById(allTasks);
  const resolvedReadiness =
    readiness ?? resolveReadinessLayer(task, context, allTasks);

  if (workflowState === "complete") {
    return { status: "complete" };
  }
  if (workflowState === "cancelled") {
    return { status: "cancelled" };
  }

  if (hasCancelledUpstream(task, tasksById)) {
    return {
      status: "blocked",
      blockedReason: UPSTREAM_CANCELLED_BLOCK_REASON,
    };
  }

  if (upstreamDependenciesPending(task, allTasks)) {
    return { status: "not_ready" };
  }

  if (resolvedReadiness.readiness === "gates_pending") {
    return { status: "not_ready" };
  }

  if (resolvedReadiness.readiness === "material_blocked") {
    return {
      status: "blocked",
      blockedReason: resolvedReadiness.blockedReason,
    };
  }

  if (workflowState === "blocked") {
    return {
      status: "blocked",
      workflowBlockedReason: task.workflowBlockedReason,
      blockedReason: task.workflowBlockedReason ?? task.blockedReason,
    };
  }

  if (workflowState === "unstarted") {
    return { status: "ready" };
  }

  return {
    status: mapWorkflowToEffectiveStatus(workflowState),
    workflowBlockedReason: task.workflowBlockedReason,
  };
}

/** Apply effective status to a task item — preserves workflowState. */
export function applyEffectiveStatus(
  task: CampaignTaskItem,
  context: TaskReadinessContext,
  allTasks: readonly CampaignTaskItem[],
  readiness?: ReadinessResolution,
): CampaignTaskItem {
  const { status, blockedReason, workflowBlockedReason } = resolveEffectiveTaskStatus(
    task,
    context,
    allTasks,
    readiness,
  );

  return {
    ...task,
    status,
    blockedReason: blockedReason ?? undefined,
    workflowBlockedReason: workflowBlockedReason ?? task.workflowBlockedReason,
  };
}
