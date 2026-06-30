import {
  isBrowsableCampaignId,
  isOwnerUser,
  isStaffUser,
} from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";
import { taskRequiredRole, userCanPerformRole } from "@/lib/campaign-tasks/capabilities";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import {
  findWorkUnitForTask,
  isKitchenV1ProductionTask,
  validateWorkUnitCanMutate,
} from "./validation";
import type { ServerProductionEnvelope } from "./types";

/** Owner and assigned staff may read production work — clients excluded (Kitchen V1 internal). */
export function canReadProductionWork(
  user: StudioUser | null,
  campaignId: string,
  _envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  if (!user) return false;
  if (!isBrowsableCampaignId(campaignId)) return false;
  if (isOwnerUser(user)) return true;
  if (isStaffUser(user)) {
    if (!assignments) return false;
    return isStaffAssignedToCampaign(assignments, user.id, campaignId);
  }
  return false;
}

export function canOperateProductionWork(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  if (!user) return false;
  if (user.roles.includes("client") && !isOwnerUser(user)) return false;
  return canReadProductionWork(user, campaignId, envelope, assignments);
}

const EDITABLE_WORKFLOW = new Set(["in_progress", "needs_revision"]);

/**
 * Kitchen production body editing — role + claim + stage + assignment gate.
 * Owner may override. Producer does NOT get edit override (dispatch only).
 */
export function canEditKitchenWorkForTask(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
  campaignId: string,
  productionEnvelope?: ServerProductionEnvelope | null,
): boolean {
  if (!isKitchenV1ProductionTask(task)) return false;
  if (!canOperateProductionWork(user, campaignId, undefined, assignments)) return false;

  const workflow = task.workflowState ?? "unstarted";
  if (workflow === "blocked" || task.status === "blocked") return false;

  if (isOwnerUser(user)) return true;

  const requiredRole = taskRequiredRole(task);
  if (!userCanPerformRole(user, requiredRole, assignments)) return false;

  if (!EDITABLE_WORKFLOW.has(workflow)) return false;

  if (task.claimedByUserId !== user.id) return false;

  if (!productionEnvelope) return false;

  const unit = findWorkUnitForTask(productionEnvelope, task);
  if (!unit) return false;

  const mutable = validateWorkUnitCanMutate(unit);
  if (!mutable.ok) return false;

  if (unit.currentTaskId !== task.id) return false;

  return true;
}

export function resolveKitchenWorkEditByTaskId(
  user: StudioUser,
  tasks: readonly CampaignTaskItem[],
  assignments: CampaignAssignmentsFile,
  campaignId: string,
  productionEnvelope: ServerProductionEnvelope,
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const task of tasks) {
    map[task.id] = canEditKitchenWorkForTask(
      user,
      task,
      assignments,
      campaignId,
      productionEnvelope,
    );
  }
  return map;
}
