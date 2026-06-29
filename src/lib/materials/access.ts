import { canReadCampaign, isOwnerUser, isStaffUser } from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";

export function canReadMaterials(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  return canReadCampaign(user, campaignId, envelope, assignments);
}

/** Client may submit materials for their own campaign only (Slice 2c). */
export function canSubmitMaterials(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
): boolean {
  if (!user) return false;
  if (!user.roles.includes("client")) return false;
  if (user.currentCampaignId === campaignId) return true;
  if (envelope?.campaignId === campaignId && envelope.clientUserId === user.id) return true;
  return false;
}

/** Owner and assigned staff may review materials in File Room (Slice 2c). */
export function canReviewMaterials(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  if (!user) return false;
  if (!canReadMaterials(user, campaignId, envelope, assignments)) return false;
  if (isOwnerUser(user)) return true;
  if (isStaffUser(user)) {
    if (!assignments) return false;
    return isStaffAssignedToCampaign(assignments, user.id, campaignId);
  }
  return false;
}

export function isMaterialsTeamAudience(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  return canReviewMaterials(user, campaignId, envelope, assignments);
}
