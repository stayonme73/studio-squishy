import { campaignTasksConfig, formatBlockedReasonDisplay } from "@/config/campaign-tasks";
import { teamOffices } from "@/config/team-offices";

import type { FileRoomTaskRow } from "./tasks-view";

export function isTaskWorkflowBlocked(
  row: Pick<FileRoomTaskRow, "effectiveStatus" | "workflowState">,
): boolean {
  return row.effectiveStatus === "blocked" || row.workflowState === "blocked";
}

export function shouldOfferReassignControl(
  canReassign: boolean,
  officeMode?: { hideReassign?: boolean },
): boolean {
  return canReassign && !officeMode?.hideReassign;
}

export function resolveBlockedTaskGuidance(
  row: Pick<FileRoomTaskRow, "effectiveStatus" | "workflowState" | "blockedReason" | "responsibleRole">,
): { reason: string; nextAction: string } | null {
  if (!isTaskWorkflowBlocked(row)) return null;

  const reason =
    formatBlockedReasonDisplay(row.blockedReason) ?? teamOffices.blockedTaskDefaultReason;
  const token = (row.blockedReason ?? "").toLowerCase();

  if (
    token.includes("compliance_hold") ||
    token.includes("compliance hold") ||
    token.includes("owner_escalation") ||
    token.includes("direction hold") ||
    token.includes("plan_change") ||
    token.includes("plan change") ||
    token.includes("missing_client_fact") ||
    token.includes("missing client fact")
  ) {
    return { reason, nextAction: teamOffices.blockedTaskNextOwnerReview };
  }

  if (token.includes("upstream")) {
    return { reason, nextAction: teamOffices.blockedTaskNextProducerReview };
  }

  const roleLabel = campaignTasksConfig.productionRoleLabels[row.responsibleRole];
  return { reason, nextAction: teamOffices.blockedTaskNextRoleAction(roleLabel) };
}
