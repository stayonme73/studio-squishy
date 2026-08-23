import type { StudioUser } from "@/lib/campaign-store/types";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments-shared";

import { canOperateProductionTasks } from "./access";
import { resolveOperatorPayload } from "./operator-payload";
import {
  canClaimTask,
  canPerformQa,
  canReassignTask,
  canReleaseClaim,
  canSubmitHandoff as userCanSubmitHandoff,
  canRaiseException,
  canAssignException,
  canResolveException,
  canApproveClientRequest,
  canDeclinePromotion,
  canHoldPromotionReview,
  FAMILY_CAPABLE_ROLES,
  isRoleCapableForTaskFamily,
  isUserCapableForTaskFamily,
  userProductionRoles,
} from "./capabilities";
import { qaRecordsForTask } from "./qa-records";
import { isQaBlockedReason } from "./qa-blocked";
import { campaignTasksConfig } from "@/config/campaign-tasks";

import type {
  CampaignExceptionRecord,
  CampaignTaskItem,
  ProductionRole,
  ProductionTaskFamilyId,
  QaRecord,
  TaskHandoffRecord,
  TaskWorkflowState,
} from "./types";

import type {
  FileRoomQaHistoryEntry,
  FileRoomTaskOperator,
  FileRoomTaskOperatorContext,
  FileRoomTaskPermissions,
  ReassignCandidate,
} from "./file-room-controls-types";
export type {
  FileRoomQaHistoryEntry,
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

export type FileRoomExceptionPermissions = {
  canRaise: boolean;
  canAssign: boolean;
  canResolve: boolean;
  canApproveClientRequest: boolean;
  canDeclinePromotion: boolean;
  canHoldPromotionReview: boolean;
  canViewPromotionDetails: boolean;
};

export type ExceptionAssignCandidate = {
  userId: string;
  displayName: string;
  isOwner: boolean;
};

export function resolveAssignCandidatesForException(
  campaignId: string,
  assignments: CampaignAssignmentsFile,
  users: readonly StudioUser[],
): ExceptionAssignCandidate[] {
  const candidates: ExceptionAssignCandidate[] = [];

  for (const user of users) {
    if (isOwnerUser(user)) {
      candidates.push({
        userId: user.id,
        displayName: user.displayName,
        isOwner: true,
      });
      continue;
    }
    if (!user.roles.includes("staff")) continue;
    if (!isStaffAssignedToCampaign(assignments, user.id, campaignId)) continue;
    candidates.push({
      userId: user.id,
      displayName: user.displayName,
      isOwner: false,
    });
  }

  return candidates.sort((a, b) => {
    if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function resolveExceptionPermissions(
  user: StudioUser,
  exception: CampaignExceptionRecord,
  assignments: CampaignAssignmentsFile,
  events: readonly import("./exceptions-types").CampaignExceptionEvent[] = [],
): FileRoomExceptionPermissions {
  const promotable =
    exception.kind === "missing_client_fact" || exception.kind === "client_request";

  return {
    canRaise: canRaiseException(user, assignments),
    canAssign: canAssignException(user, assignments),
    canResolve: canResolveException(user, exception, assignments, [], events),
    canApproveClientRequest: canApproveClientRequest(user, exception, events),
    canDeclinePromotion: canDeclinePromotion(user, exception, events),
    canHoldPromotionReview: canHoldPromotionReview(user, exception, events),
    canViewPromotionDetails: promotable && !isOwnerUser(user),
  };
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

function qaCategoryLabel(record: QaRecord): string | null {
  if (!record.category) return null;
  if (record.category === "scope_change") return null;
  if (record.action === "qa_block") {
    return (
      campaignTasksConfig.qaBlockCategoryLabels[record.category as "compliance_concern" | "direction_disagreement"] ??
      record.category
    );
  }
  if (record.category === "production_correction" || record.category === "missing_client_fact") {
    return campaignTasksConfig.qaFailCategoryLabels[record.category];
  }
  return record.category;
}

function toQaHistoryEntry(record: QaRecord): FileRoomQaHistoryEntry {
  return {
    id: record.id,
    action: record.action,
    actionLabel: campaignTasksConfig.qaActionLabels[record.action],
    categoryLabel: qaCategoryLabel(record),
    actorDisplayName: record.actorDisplayName,
    createdAt: record.createdAt,
    notesPreview: record.notes?.trim() || record.missingFactDescription?.trim() || null,
  };
}

export function resolveQaHistoryForTask(
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): readonly FileRoomQaHistoryEntry[] {
  return qaRecordsForTask(qaRecords, taskId).map(toQaHistoryEntry);
}

export function resolveLatestQaHistoryForTask(
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): FileRoomQaHistoryEntry | null {
  const history = resolveQaHistoryForTask(qaRecords, taskId);
  return history.length > 0 ? history[history.length - 1] : null;
}

export { resolveQaSummaryForTask } from "./qa-records";
export type { FileRoomTaskQaSummary } from "./file-room-controls-types";

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
