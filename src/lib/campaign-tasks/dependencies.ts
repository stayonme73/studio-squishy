import type { CampaignTaskItem } from "./types";

export const UPSTREAM_CANCELLED_BLOCK_REASON =
  "Upstream task cancelled — plan/change resolution required";

export function indexTasksById(
  tasks: readonly CampaignTaskItem[],
): Map<string, CampaignTaskItem> {
  return new Map(tasks.map((task) => [task.id, task]));
}

export function hasCancelledUpstream(
  task: CampaignTaskItem,
  tasksById: Map<string, CampaignTaskItem>,
): boolean {
  for (const depId of task.dependsOn) {
    const upstream = tasksById.get(depId);
    if (upstream?.workflowState === "cancelled") {
      return true;
    }
  }
  return false;
}

export function areUpstreamDependenciesSatisfied(
  task: CampaignTaskItem,
  tasksById: Map<string, CampaignTaskItem>,
): boolean {
  if (task.dependsOn.length === 0) {
    return true;
  }

  for (const depId of task.dependsOn) {
    const upstream = tasksById.get(depId);
    if (!upstream) {
      return false;
    }
    if (upstream.workflowState === "cancelled") {
      return false;
    }
    if (upstream.workflowState !== "complete") {
      return false;
    }
  }

  return true;
}

export function upstreamDependenciesPending(
  task: CampaignTaskItem,
  allTasks: readonly CampaignTaskItem[],
): boolean {
  const tasksById = indexTasksById(allTasks);
  return !areUpstreamDependenciesSatisfied(task, tasksById);
}
