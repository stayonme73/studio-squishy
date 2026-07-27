import {
  canReadCampaign,
  isClientUser,
  isInternalUser,
} from "@/lib/campaign-store/access";
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

/**
 * Authenticated customer may list customer-visible project communication for owned campaigns.
 */
export function canReadCustomerProjectCommunication(
  user: StudioUser | null,
  campaignId: string,
  envelope: ServerCampaignEnvelope | null | undefined,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  if (!user || !isClientUser(user)) return false;
  return canReadCampaign(user, campaignId, envelope, assignments);
}

/**
 * Authenticated customer may create a customer-authored project message for owned campaigns.
 * Ownership mirrors materials submit: client role + binding / allowlist / unbound+current.
 */
export function canCreateCustomerProjectCommunication(
  user: StudioUser | null,
  campaignId: string,
  envelope: ServerCampaignEnvelope | null | undefined,
): boolean {
  if (!user || !isClientUser(user)) return false;
  if (envelope?.campaignId === campaignId && envelope.clientUserId === user.id) return true;
  if (user.clientCampaignIds?.includes(campaignId)) return true;
  if (!envelope?.clientUserId && user.currentCampaignId === campaignId) return true;
  return false;
}
