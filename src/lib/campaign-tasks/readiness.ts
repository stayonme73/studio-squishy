import type { CampaignRecord } from "@/config/studio-board";

import { DIRECTION_GATED_FAMILIES } from "./families";
import { CAMPAIGN_LEVEL_TASKS } from "./templates";
import type { CampaignTaskItem, TaskReadinessContext, TaskStatus } from "./types";

export function buildReadinessContext(campaign: CampaignRecord): TaskReadinessContext {
  return {
    hasApprovedPlan: Boolean(campaign.approvedStudioPlan?.lineItems.length),
    directionApproved: Boolean(campaign.selectedCampaignOption?.trim()),
    projectDetailsSubmitted: Boolean(campaign.projectDetailsSubmittedAt),
  };
}

export function taskRequiresDirection(task: CampaignTaskItem): boolean {
  return DIRECTION_GATED_FAMILIES.has(task.familyId);
}

/** Slice 3a — upstream pipeline steps are never complete, so tasks with deps stay not_ready. */
export function upstreamDependenciesPending(task: CampaignTaskItem): boolean {
  return task.dependsOn.length > 0;
}

export function resolveBaseTaskStatus(
  task: CampaignTaskItem,
  context: TaskReadinessContext,
): TaskStatus {
  if (!context.hasApprovedPlan) return "not_ready";

  if (upstreamDependenciesPending(task)) {
    return "not_ready";
  }

  if (taskRequiresDirection(task) && !context.directionApproved) {
    return "not_ready";
  }

  const needsProjectDetails =
    task.id !== CAMPAIGN_LEVEL_TASKS.producerKickoff.id;
  if (!context.projectDetailsSubmitted && needsProjectDetails) {
    return "not_ready";
  }

  return "ready";
}

export function applyMaterialBlock(
  status: TaskStatus,
  blockedReason: string | undefined,
): { status: TaskStatus; blockedReason?: string } {
  if (status !== "ready") {
    return { status, blockedReason: undefined };
  }
  if (!blockedReason) {
    return { status: "ready" };
  }
  return { status: "blocked", blockedReason };
}
