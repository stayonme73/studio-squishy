import {
  campaignTasksConfig,
  effectiveStatusLabel,
  taskPhaseLabel,
  toDisplayStatus,
  type TaskDisplayStatus,
} from "@/config/campaign-tasks";

import type {
  CampaignTaskItem,
  CampaignTasksRecord,
  ProductionTaskFamilyId,
  TaskEffectiveStatus,
  TaskWorkflowState,
} from "./types";

export type FileRoomTaskRow = {
  id: string;
  title: string;
  phaseLabel: string;
  /** Display bucket for unchanged File Room UI (not_ready | ready | blocked). */
  status: TaskDisplayStatus;
  statusLabel: string;
  effectiveStatus: TaskEffectiveStatus;
  workflowState: TaskWorkflowState;
  serviceName: string;
  blockedReason: string | null;
  cycleLabel: string | null;
  dependsOnCount: number;
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

function toRow(task: CampaignTaskItem): FileRoomTaskRow {
  const effectiveStatus = task.status;
  const displayStatus = toDisplayStatus(effectiveStatus);
  const workflowState = task.workflowState ?? "unstarted";

  return {
    id: task.id,
    title: task.title,
    phaseLabel: taskPhaseLabel(task.phase),
    status: displayStatus,
    statusLabel: effectiveStatusLabel(effectiveStatus),
    effectiveStatus,
    workflowState,
    serviceName: task.serviceName,
    blockedReason: task.blockedReason ?? null,
    cycleLabel: task.cycleLabel ?? null,
    dependsOnCount: task.dependsOn.length,
  };
}

function countByDisplayBucket(rows: readonly FileRoomTaskRow[], bucket: TaskDisplayStatus): number {
  return rows.filter((row) => row.status === bucket).length;
}

export function resolveFileRoomProductionTasksView(
  record: CampaignTasksRecord,
): FileRoomProductionTasksView {
  const rows = record.tasks.map(toRow);
  const groupMap = new Map<string, FileRoomTaskGroup>();

  for (const task of record.tasks) {
    const key = `${task.familyId}:${task.serviceName}`;
    const existing = groupMap.get(key);
    const row = toRow(task);
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

export function resolveProductionTasksApiPayload(record: CampaignTasksRecord) {
  const rows = record.tasks.map(toRow);

  return {
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
}
