import { isStaffOrOwner } from "@/lib/auth/roles";

import type { ServerCampaignEnvelope, StudioUser } from "./types";

export function canReadCampaign(
  user: StudioUser | null,
  campaignId: string,
  envelope?: ServerCampaignEnvelope | null,
): boolean {
  if (!user) return false;
  if (isStaffOrOwner(user)) return true;
  if (user.roles.includes("client")) {
    if (user.currentCampaignId === campaignId) return true;
    if (envelope?.campaignId === campaignId && envelope.clientUserId === user.id) return true;
  }
  return false;
}

export function canListAllCampaigns(user: StudioUser | null): boolean {
  return isStaffOrOwner(user);
}

export function canSyncCurrentCampaign(user: StudioUser | null): boolean {
  if (!user) return false;
  return user.roles.includes("client") || isStaffOrOwner(user);
}
