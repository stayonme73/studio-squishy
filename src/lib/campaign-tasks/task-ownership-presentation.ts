import {
  campaignTasksConfig,
  productionRoleLabel,
} from "@/config/campaign-tasks";
import type { ProductionRole } from "@/lib/campaign-tasks/types";

/** Gate #15 — File Room task ownership lines (presentation only). */
export type FileRoomTaskOwnershipPresentation = {
  responsibleRole: ProductionRole;
  responsibleRoleLabel: string;
  responsibleRoleLine: string;
  claimStatus: "claimed" | "unclaimed";
  claimLine: string;
};

/**
 * Answers on one surface, without inference:
 * 1. Who is responsible? (role)
 * 2. Has anyone claimed it yet?
 */
export function resolveFileRoomTaskOwnershipPresentation(input: {
  responsibleRole: ProductionRole;
  claimedByDisplayName?: string | null;
}): FileRoomTaskOwnershipPresentation {
  const responsibleRoleLabel = productionRoleLabel(input.responsibleRole);
  const claimedName = input.claimedByDisplayName?.trim() || "";
  const claimStatus = claimedName ? ("claimed" as const) : ("unclaimed" as const);

  return {
    responsibleRole: input.responsibleRole,
    responsibleRoleLabel,
    responsibleRoleLine: `${campaignTasksConfig.responsibleRoleLabel}: ${responsibleRoleLabel}`,
    claimStatus,
    claimLine: claimedName
      ? `${campaignTasksConfig.claimedByLabel} ${claimedName}`
      : campaignTasksConfig.unclaimedLabel,
  };
}
