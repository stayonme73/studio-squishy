import { upstreamDependenciesPending } from "./dependencies";
import { DIRECTION_GATED_FAMILIES } from "./families";
import { CAMPAIGN_LEVEL_TASKS } from "./templates";
import type { CampaignTaskItem, TaskReadiness, TaskReadinessContext } from "./types";

export type ReadinessResolution = {
  readiness: TaskReadiness;
  blockedReason?: string;
};

export function buildReadinessContext(campaign: {
  approvedStudioPlan?: { lineItems: readonly unknown[] } | null;
  selectedCampaignOption?: string | null;
  projectDetailsSubmittedAt?: string | null;
}): TaskReadinessContext {
  return {
    hasApprovedPlan: Boolean(campaign.approvedStudioPlan?.lineItems.length),
    directionApproved: Boolean(campaign.selectedCampaignOption?.trim()),
    projectDetailsSubmitted: Boolean(campaign.projectDetailsSubmittedAt),
  };
}

export function taskRequiresDirection(task: CampaignTaskItem): boolean {
  return DIRECTION_GATED_FAMILIES.has(task.familyId);
}

export function resolveBaseReadiness(
  task: CampaignTaskItem,
  context: TaskReadinessContext,
  allTasks: readonly CampaignTaskItem[],
): TaskReadiness {
  if (!context.hasApprovedPlan) {
    return "gates_pending";
  }

  if (upstreamDependenciesPending(task, allTasks)) {
    return "gates_pending";
  }

  if (taskRequiresDirection(task) && !context.directionApproved) {
    return "gates_pending";
  }

  const needsProjectDetails = task.id !== CAMPAIGN_LEVEL_TASKS.producerKickoff.id;
  if (!context.projectDetailsSubmitted && needsProjectDetails) {
    return "gates_pending";
  }

  return "eligible";
}

export function resolveReadinessLayer(
  task: CampaignTaskItem,
  context: TaskReadinessContext,
  allTasks: readonly CampaignTaskItem[],
  materialBlockedReason?: string,
): ReadinessResolution {
  const base = resolveBaseReadiness(task, context, allTasks);
  if (base === "gates_pending") {
    return { readiness: "gates_pending" };
  }
  if (materialBlockedReason) {
    return { readiness: "material_blocked", blockedReason: materialBlockedReason };
  }
  return { readiness: "eligible" };
}

/** @deprecated Use resolveBaseReadiness — kept for tests migrating from 3a. */
export type LegacyTaskStatus = "not_ready" | "ready" | "blocked";

export function resolveBaseTaskStatus(
  task: CampaignTaskItem,
  context: TaskReadinessContext,
  allTasks: readonly CampaignTaskItem[] = [],
): LegacyTaskStatus {
  const readiness = resolveBaseReadiness(task, context, allTasks);
  return readiness === "eligible" ? "ready" : "not_ready";
}

export function applyMaterialBlock(
  status: LegacyTaskStatus,
  blockedReason: string | undefined,
): { status: LegacyTaskStatus; blockedReason?: string } {
  if (status !== "ready") {
    return { status, blockedReason: undefined };
  }
  if (!blockedReason) {
    return { status: "ready" };
  }
  return { status: "blocked", blockedReason };
}
