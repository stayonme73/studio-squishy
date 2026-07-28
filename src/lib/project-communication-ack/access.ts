import {
  canReadCustomerProjectCommunication,
} from "@/lib/project-communication/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

/** Read notification / ack state for owned campaigns. */
export function canReadStudioReplyAcknowledgment(
  user: StudioUser | null,
  campaignId: string,
  envelope: ServerCampaignEnvelope | null | undefined,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  return canReadCustomerProjectCommunication(user, campaignId, envelope, assignments);
}

/** Persist acknowledgment for owned campaigns (same ownership bar as read). */
export function canWriteStudioReplyAcknowledgment(
  user: StudioUser | null,
  campaignId: string,
  envelope: ServerCampaignEnvelope | null | undefined,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  return canReadCustomerProjectCommunication(user, campaignId, envelope, assignments);
}
