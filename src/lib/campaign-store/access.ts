import { hasRole } from "@/lib/auth/roles";
import { isFixtureCampaignId } from "@/lib/campaign-store/fixture-guard";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";

import type { ServerCampaignEnvelope, StudioUser } from "./types";

export function isOwnerUser(user: StudioUser | null | undefined): boolean {
  if (!user) return false;
  return hasRole(user, "owner");
}

export function isStaffUser(user: StudioUser | null | undefined): boolean {
  if (!user) return false;
  return hasRole(user, "staff") && !hasRole(user, "owner");
}

export function isInternalUser(user: StudioUser | null | undefined): boolean {
  return isOwnerUser(user) || isStaffUser(user);
}

/** Fixture/test campaigns are never browsable via File Room (Slice 1b). */
export function isBrowsableCampaignId(campaignId: string): boolean {
  return !isFixtureCampaignId(campaignId);
}

export function canReadCampaign(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
  assignments?: CampaignAssignmentsFile | null,
): boolean {
  if (!user) return false;
  if (!isBrowsableCampaignId(campaignId)) return false;

  if (isOwnerUser(user)) return true;

  if (isStaffUser(user)) {
    if (!assignments) return false;
    return isStaffAssignedToCampaign(assignments, user.id, campaignId);
  }

  if (user.roles.includes("client")) {
    if (user.currentCampaignId === campaignId) return true;
    if (envelope?.campaignId === campaignId && envelope.clientUserId === user.id) return true;
  }
  return false;
}

/** Owner sees all non-fixture campaigns; staff only assigned campaigns. */
export function canListFileRoomCampaigns(user: StudioUser | null): boolean {
  return isInternalUser(user);
}

export function canListAllCampaigns(user: StudioUser | null): boolean {
  return isOwnerUser(user);
}

export function canSyncCurrentCampaign(user: StudioUser | null): boolean {
  if (!user) return false;
  return user.roles.includes("client") || isInternalUser(user);
}

export function filterCampaignsForUser(
  envelopes: readonly ServerCampaignEnvelope[],
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ServerCampaignEnvelope[] {
  return envelopes.filter((envelope) => {
    if (!isBrowsableCampaignId(envelope.campaignId)) return false;
    return canReadCampaign(user, envelope.campaignId, envelope, assignments);
  });
}
