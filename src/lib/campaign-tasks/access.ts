import {
  isBrowsableCampaignId,
  isOwnerUser,
  isStaffUser,
} from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";

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
