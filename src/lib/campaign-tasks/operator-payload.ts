import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import { canReassignTask, userProductionRoles } from "./capabilities";

export function resolveOperatorPayload(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
) {
  return {
    userId: user.id,
    capabilities: [...userProductionRoles(user, assignments)],
    canReassign: canReassignTask(user, assignments),
  };
}
