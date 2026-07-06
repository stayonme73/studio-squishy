/** Client-safe campaign assignment types and helpers — no Node fs. */

export type CampaignAssignmentsFile = {
  staffByUserId: Record<string, readonly string[]>;
  /** Production roles each staff user may perform (Slice 3b-b-a). */
  staffCapabilities?: Record<string, readonly string[]>;
};

export function staffAssignedCampaignIds(
  assignments: CampaignAssignmentsFile,
  userId: string,
): readonly string[] {
  return assignments.staffByUserId[userId] ?? [];
}

export function isStaffAssignedToCampaign(
  assignments: CampaignAssignmentsFile,
  userId: string,
  campaignId: string,
): boolean {
  return staffAssignedCampaignIds(assignments, userId).includes(campaignId);
}
