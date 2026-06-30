import {
  isBrowsableCampaignId,
  isOwnerUser,
  isStaffUser,
} from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import { isKitchenV1ProductionTask } from "./validation";

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

export function canEditKitchenWorkForTask(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
  campaignId: string,
): boolean {
  if (!isKitchenV1ProductionTask(task)) return false;
  if (isOwnerUser(user)) return true;
  if (!isStaffUser(user)) return false;
  return isStaffAssignedToCampaign(assignments, user.id, campaignId);
}
