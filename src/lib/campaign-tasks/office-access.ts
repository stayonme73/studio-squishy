import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";
import {
  isTeamOfficeRoleSlug,
  isTeamOfficeV1Live,
  officeRoleFromSlug,
  type TeamOfficeRoleSlug,
} from "@/config/team-offices";

import { userCanPerformRole } from "./capabilities";
import type { ProductionRole } from "./types";

export type TeamOfficeAccessResult =
  | { kind: "ok"; officeRole: ProductionRole }
  | { kind: "invalid-role" }
  | { kind: "not-built" }
  | { kind: "forbidden" };

/** Owner may enter every office; staff need campaign assignment + role capability. */
export function canEnterTeamOffice(
  user: StudioUser,
  campaignId: string,
  officeRole: ProductionRole,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (isOwnerUser(user)) return true;
  if (!user.roles.includes("staff")) return false;
  if (!isStaffAssignedToCampaign(assignments, user.id, campaignId)) return false;
  return userCanPerformRole(user, officeRole, assignments);
}

export function resolveTeamOfficeAccess(
  user: StudioUser,
  campaignId: string,
  roleSlug: string,
  assignments: CampaignAssignmentsFile,
): TeamOfficeAccessResult {
  if (!isTeamOfficeRoleSlug(roleSlug)) {
    return { kind: "invalid-role" };
  }

  if (!isTeamOfficeV1Live(roleSlug)) {
    return { kind: "not-built" };
  }

  const officeRole = officeRoleFromSlug(roleSlug);
  if (!canEnterTeamOffice(user, campaignId, officeRole, assignments)) {
    return { kind: "forbidden" };
  }

  return { kind: "ok", officeRole };
}
