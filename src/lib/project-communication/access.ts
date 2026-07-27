import { isInternalUser, canReadCampaign } from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

/**
 * Staff/owner may list and reply on project communication for campaigns they can read.
 * Clients never use this staff workflow — even for their own campaign.
 */
export function canAccessStaffProjectCommunication(
  user: StudioUser | null,
  campaignId: string,
  envelope: ServerCampaignEnvelope | null | undefined,
  assignments: CampaignAssignmentsFile | null | undefined,
): boolean {
  if (!user || !isInternalUser(user)) return false;
  return canReadCampaign(user, campaignId, envelope, assignments);
}

export function canReplyStaffProjectCommunication(
  user: StudioUser | null,
  campaignId: string,
  envelope: ServerCampaignEnvelope | null | undefined,
  assignments: CampaignAssignmentsFile | null | undefined,
): boolean {
  return canAccessStaffProjectCommunication(user, campaignId, envelope, assignments);
}
