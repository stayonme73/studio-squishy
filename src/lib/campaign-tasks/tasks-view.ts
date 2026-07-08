import {
  campaignTasksConfig,
  effectiveStatusLabel,
  formatBlockedReasonDisplay,
  taskPhaseLabel,
  toDisplayStatus,
  type TaskDisplayStatus,
} from "@/config/campaign-tasks";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  claimVersionForTask,
  resolveLatestHandoffForTask,
  resolveLatestQaHistoryForTask,
  resolveQaHistoryForTask,
  resolveQaSummaryForTask,
  resolveReassignRolesForFamily,
  resolveTaskPermissions,
  type FileRoomQaHistoryEntry,
  type FileRoomTaskQaSummary,
} from "./file-room-controls";
import type { FileRoomTaskPermissions } from "./file-room-controls-types";
import { taskRequiredRole } from "./capabilities";
import { resolveQaSummary } from "./qa";
import type {
  CampaignTaskItem,
  CampaignTasksRecord,
  ProductionRole,
  ProductionTaskFamilyId,
  TaskEffectiveStatus,
  TaskPhase,
  TaskWorkflowState,
} from "./types";

export type FileRoomTaskRow = {
  id: string;
  title: string;
  phase: TaskPhase;
  phaseLabel: string;
  /** Display bucket for unchanged File Room UI (not_ready | ready | blocked). */
  status: TaskDisplayStatus;
  statusLabel: string;
  effectiveStatus: TaskEffectiveStatus;
  workflowState: TaskWorkflowState;
  serviceName: string;
  familyId: ProductionTaskFamilyId;
  responsibleRole: ProductionRole;
  assignedRole?: ProductionRole;
  blockedReason: string | null;
  cycleLabel: string | null;
  dependsOnCount: number;
  claimedByUserId?: string;
  claimedByDisplayName?: string;
  claimVersion: string | null;
  permissions: FileRoomTaskPermissions;
  reassignRoles: readonly ProductionRole[];
  handoffHistoryCount: number;
  latestHandoffSummary: string | null;
  qaSummary: FileRoomTaskQaSummary;
  qaHistory: readonly FileRoomQaHistoryEntry[];
  latestQaHistory: FileRoomQaHistoryEntry | null;
  openExceptionCount: number;
};

export type ResolveFileRoomProductionTasksOptions = {
  user?: StudioUser;
  assignments?: CampaignAssignmentsFile;
  openExceptionCountByTaskId?: ReadonlyMap<string, number>;
};

export type FileRoomTaskGroup = {
  familyId: ProductionTaskFamilyId;
  familyLabel: string;
  serviceName: string;
  tasks: readonly FileRoomTaskRow[];
};

export type FileRoomProductionTasksView = {
  tasks: readonly FileRoomTaskRow[];
  groups: readonly FileRoomTaskGroup[];
  isEmpty: boolean;
  planFingerprint: string;
  readyCount: number;
  blockedCount: number;
  notReadyCount: number;
};

function toRow(
  task: CampaignTaskItem,
  options: ResolveFileRoomProductionTasksOptions,
  handoffs: CampaignTasksRecord["handoffs"],
  qaRecords: CampaignTasksRecord["qaRecords"],
): FileRoomTaskRow {
  const effectiveStatus = task.status;
  const displayStatus = toDisplayStatus(effectiveStatus);
  const workflowState = task.workflowState ?? "unstarted";
  const handoffMeta = resolveLatestHandoffForTask(handoffs, task.id);
  const qaSummary = resolveQaSummaryForTask(qaRecords, task.id);
  const qaHistory = resolveQaHistoryForTask(qaRecords, task.id);
  const latestQaHistory = resolveLatestQaHistoryForTask(qaRecords, task.id);
  const permissions =
    options.user && options.assignments
      ? resolveTaskPermissions(options.user, task, options.assignments)
      : {
          canClaim: false,
          canRelease: false,
          canSubmitHandoff: false,
          canReassign: false,
          canQaPass: false,
          canQaFail: false,
          canQaBlock: false,
        };

  return {
    id: task.id,
    title: task.title,
    phase: task.phase,
    phaseLabel: taskPhaseLabel(task.phase),
    status: displayStatus,
    statusLabel: effectiveStatusLabel(effectiveStatus),
    effectiveStatus,
    workflowState,
    serviceName: task.serviceName,
    familyId: task.familyId,
    responsibleRole: taskRequiredRole(task),
    assignedRole: task.assignedRole,
    blockedReason: formatBlockedReasonDisplay(task.blockedReason ?? task.workflowBlockedReason),
    cycleLabel: task.cycleLabel ?? null,
    dependsOnCount: task.dependsOn.length,
    claimedByUserId: task.claimedByUserId,
    claimedByDisplayName: task.claimedByDisplayName,
    claimVersion: claimVersionForTask(task),
    permissions,
    reassignRoles: resolveReassignRolesForFamily(task.familyId),
    handoffHistoryCount: handoffMeta.count,
    latestHandoffSummary: handoffMeta.latestSummary,
    qaSummary,
    qaHistory,
    latestQaHistory,
    openExceptionCount: options.openExceptionCountByTaskId?.get(task.id) ?? 0,
  };
}

function countByDisplayBucket(rows: readonly FileRoomTaskRow[], bucket: TaskDisplayStatus): number {
  return rows.filter((row) => row.status === bucket).length;
}

export function resolveFileRoomProductionTasksView(
  record: CampaignTasksRecord,
  options: ResolveFileRoomProductionTasksOptions = {},
): FileRoomProductionTasksView {
  const rows = record.tasks.map((task) => toRow(task, options, record.handoffs, record.qaRecords));
  const groupMap = new Map<string, FileRoomTaskGroup>();

  for (const task of record.tasks) {
    const key = `${task.familyId}:${task.serviceName}`;
    const existing = groupMap.get(key);
    const row = toRow(task, options, record.handoffs, record.qaRecords);
    if (existing) {
      existing.tasks = [...existing.tasks, row];
      continue;
    }
    groupMap.set(key, {
      familyId: task.familyId,
      familyLabel: campaignTasksConfig.familyLabels[task.familyId],
      serviceName: task.serviceName,
      tasks: [row],
    });
  }

  const groups = [...groupMap.values()];

  return {
    tasks: rows,
    groups,
    isEmpty: rows.length === 0,
    planFingerprint: record.planFingerprint,
    readyCount: countByDisplayBucket(rows, "ready"),
    blockedCount: countByDisplayBucket(rows, "blocked"),
    notReadyCount: countByDisplayBucket(rows, "not_ready"),
  };
}

export function resolveProductionTasksApiPayload(
  record: CampaignTasksRecord,
  options: { includeQaSummary?: boolean } = {},
) {
  const rows = record.tasks.map((task) => toRow(task, {}, record.handoffs, record.qaRecords));

  const payload = {
    tasks: record.tasks.map((task) => ({
      ...task,
      effectiveStatus: task.status,
      workflowState: task.workflowState ?? "unstarted",
    })),
    planFingerprint: record.planFingerprint,
    planVersion: record.planVersion ?? 1,
    planChangePendingOwnerApproval: record.planChangePendingOwnerApproval ?? false,
    summary: {
      total: record.tasks.length,
      ready: countByDisplayBucket(rows, "ready"),
      blocked: countByDisplayBucket(rows, "blocked"),
      notReady: countByDisplayBucket(rows, "not_ready"),
      byEffectiveStatus: record.tasks.reduce<Record<TaskEffectiveStatus, number>>(
        (counts, task) => {
          counts[task.status] = (counts[task.status] ?? 0) + 1;
          return counts;
        },
        {
          not_ready: 0,
          ready: 0,
          in_progress: 0,
          ready_for_qa: 0,
          needs_revision: 0,
          blocked: 0,
          complete: 0,
          cancelled: 0,
        },
      ),
    },
  };

  if (options.includeQaSummary) {
    return {
      ...payload,
      qaSummary: resolveQaSummary(record.qaRecords),
    };
  }

  return payload;
}
