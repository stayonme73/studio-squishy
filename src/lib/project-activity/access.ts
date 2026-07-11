import { canReadCampaign, isInternalUser } from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { canReviewMaterials } from "@/lib/materials/access";

export function canReadProjectActivity(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  return canReadCampaign(user, campaignId, envelope, assignments);
}

export function canSubmitInformationUpdateRequest(
  user: StudioUser | null,
  campaignId: string,
  campaignEnvelope?: ServerCampaignEnvelope | null,
): boolean {
  if (!user?.roles.includes("client")) return false;
  if (!campaignEnvelope?.record.paymentReceivedAt) return false;
  return canReadCampaign(user, campaignId, campaignEnvelope);
}

export function canReviewInformationUpdateRequest(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  return canReviewMaterials(user, campaignId, envelope, assignments);
}

export function isProjectActivityStaffUser(user: StudioUser | null): boolean {
  return isInternalUser(user);
}
