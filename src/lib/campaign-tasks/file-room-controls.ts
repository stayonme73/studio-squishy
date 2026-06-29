import type { StudioUser } from "@/lib/campaign-store/types";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments";

import { canOperateProductionTasks } from "./access";
import { resolveOperatorPayload } from "./actions";
import {
  canClaimTask,
  canPerformQa,
  canReassignTask,
  canReleaseClaim,
  canSubmitHandoff as userCanSubmitHandoff,
  FAMILY_CAPABLE_ROLES,
  isRoleCapableForTaskFamily,
  isUserCapableForTaskFamily,
  userProductionRoles,
} from "./capabilities";
import { isQaBlockedReason } from "./qa";
import type {
  CampaignTaskItem,
  ProductionRole,
  ProductionTaskFamilyId,
  TaskHandoffRecord,
  TaskWorkflowState,
} from "./types";

import type {
  FileRoomTaskOperator,
  FileRoomTaskOperatorContext,
  FileRoomTaskPermissions,
  ReassignCandidate,
} from "./file-room-controls-types";
export type {
  FileRoomTaskOperator,
  FileRoomTaskOperatorContext,
  FileRoomTaskPermissions,
  ReassignCandidate,
} from "./file-room-controls-types";

const CLAIMABLE_WORKFLOW: readonly TaskWorkflowState[] = ["unstarted", "needs_revision"];
const REASSIGNABLE_WORKFLOW: readonly TaskWorkflowState[] = [
  "unstarted",
  "needs_revision",
  "in_progress",
];

function claimVersionForTask(task: CampaignTaskItem): string | null {
  return task.claimedAt ?? null;
}

export function resolveTaskPermissions(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
): FileRoomTaskPermissions {
  const workflow = task.workflowState ?? "unstarted";

  const canClaim =
    CLAIMABLE_WORKFLOW.includes(workflow) &&
    canClaimTask(user, task, assignments) &&
    (task.status === "ready" || task.status === "needs_revision");

  const canRelease = workflow === "in_progress" && canReleaseClaim(user, task, assignments);

  const canSubmitHandoff =
    workflow === "in_progress" && userCanSubmitHandoff(user, task, assignments);

  const canReassign =
    REASSIGNABLE_WORKFLOW.includes(workflow) && canReassignTask(user, assignments);

  const canQa =
    workflow === "ready_for_qa" &&
    canPerformQa(user, assignments) &&
    !isQaBlockedReason(task);

  return {
    canClaim,
    canRelease,
    canSubmitHandoff,
    canReassign,
    canQaPass: canQa,
    canQaFail: canQa,
    canQaBlock: canQa,
  };
}

export function resolveReassignRolesForFamily(
  familyId: ProductionTaskFamilyId,
): readonly ProductionRole[] {
  return FAMILY_CAPABLE_ROLES[familyId].filter((role) => role !== "qa" && role !== "owner");
}

export function resolveReassignCandidatesForTask(
  task: CampaignTaskItem,
  campaignId: string,
  assignments: CampaignAssignmentsFile,
  users: readonly StudioUser[],
): ReassignCandidate[] {
  const familyRoles = resolveReassignRolesForFamily(task.familyId);
  const candidates: ReassignCandidate[] = [];

  for (const user of users) {
    if (!user.roles.includes("staff")) continue;
    if (!isStaffAssignedToCampaign(assignments, user.id, campaignId)) continue;

    const capableRoles = familyRoles.filter((role) =>
      isUserCapableForTaskFamily(user, task, role, assignments),
    );
    if (capableRoles.length === 0) continue;

    candidates.push({
      userId: user.id,
      displayName: user.displayName,
      roles: capableRoles,
    });
  }

  return candidates.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function resolveReassignCandidatesForCampaign(
  campaignId: string,
  assignments: CampaignAssignmentsFile,
  users: readonly StudioUser[],
): ReassignCandidate[] {
  const candidates: ReassignCandidate[] = [];

  for (const user of users) {
    if (!user.roles.includes("staff")) continue;
    if (!isStaffAssignedToCampaign(assignments, user.id, campaignId)) continue;

    const staffRoles = userProductionRoles(user, assignments).filter(
      (role) => role !== "qa" && role !== "owner" && role !== "client_input",
    );
    if (staffRoles.length === 0) continue;

    candidates.push({
      userId: user.id,
      displayName: user.displayName,
      roles: staffRoles,
    });
  }

  return candidates.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function resolveLatestHandoffForTask(
  handoffs: readonly TaskHandoffRecord[] | undefined,
  taskId: string,
): { count: number; latestSummary: string | null } {
  const taskHandoffs = (handoffs ?? []).filter((entry) => entry.taskId === taskId);
  if (taskHandoffs.length === 0) {
    return { count: 0, latestSummary: null };
  }
  const latest = taskHandoffs[taskHandoffs.length - 1];
  return {
    count: taskHandoffs.length,
    latestSummary: latest.completedSummary,
  };
}

export function resolveFileRoomTaskOperatorContext(
  user: StudioUser,
  campaignId: string,
  envelope: ServerCampaignEnvelope,
  assignments: CampaignAssignmentsFile,
  users: readonly StudioUser[],
): FileRoomTaskOperatorContext {
  const canOperate = canOperateProductionTasks(user, campaignId, envelope, assignments);
  const operatorPayload = resolveOperatorPayload(user, assignments);

  return {
    canOperate,
    operator: {
      userId: operatorPayload.userId,
      capabilities: operatorPayload.capabilities,
      canReassign: operatorPayload.canReassign,
    },
    reassignCandidates: canOperate
      ? resolveReassignCandidatesForCampaign(campaignId, assignments, users)
      : [],
  };
}

export function isRoleValidForTaskReassign(
  task: CampaignTaskItem,
  role: ProductionRole,
): boolean {
  return isRoleCapableForTaskFamily(task.familyId, role);
}

export { claimVersionForTask };
