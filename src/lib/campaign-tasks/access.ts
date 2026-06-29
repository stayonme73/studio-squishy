import {
  isBrowsableCampaignId,
  isOwnerUser,
  isStaffUser,
} from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";

import {
  canClaimTask,
  canPerformQa,
  canReassignTask,
  canReleaseClaim,
  canSubmitHandoff,
  userIsProducer,
  canAssignException,
  canRaiseException,
  canResolveException,
  canApproveClientRequest,
} from "./capabilities";
import type { CampaignExceptionRecord, CampaignTaskItem } from "./types";

/** Owner and assigned staff may read production tasks — clients are excluded (Slice 3a). */
export function canReadProductionTasks(
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

/** Clients are forbidden — owner and assigned staff may PATCH task workflow (Slice 3b-b-a). */
export function canOperateProductionTasks(
  user: StudioUser | null,
  campaignId: string,
  _envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  if (!user) return false;
  if (user.roles.includes("client") && !isOwnerUser(user)) return false;
  return canReadProductionTasks(user, campaignId, _envelope, assignments);
}

export function canUserClaimTask(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canClaimTask(user, task, assignments);
}

export function canUserSubmitHandoff(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canSubmitHandoff(user, task, assignments);
}

export function canUserReleaseClaim(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canReleaseClaim(user, task, assignments);
}

export function canUserReassignTask(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canReassignTask(user, assignments);
}

export function canUserPerformQa(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canPerformQa(user, assignments);
}

export function isProductionProducer(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  return userIsProducer(user, assignments);
}

export function canUserRaiseException(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canRaiseException(user, assignments);
}

export function canUserAssignException(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canAssignException(user, assignments);
}

export function canUserResolveException(
  user: StudioUser,
  exception: CampaignExceptionRecord,
  assignments: CampaignAssignmentsFile,
): boolean {
  return canResolveException(user, exception, assignments);
}

export function canUserApproveClientRequest(
  user: StudioUser,
  exception: CampaignExceptionRecord,
): boolean {
  return canApproveClientRequest(user, exception);
}
