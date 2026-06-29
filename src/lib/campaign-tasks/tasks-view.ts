import { campaignTasksConfig, taskPhaseLabel, taskStatusLabel } from "@/config/campaign-tasks";

import type { CampaignTaskItem, CampaignTasksRecord, ProductionTaskFamilyId, TaskStatus } from "./types";

export type FileRoomTaskRow = {
  id: string;
  title: string;
  phaseLabel: string;
  status: TaskStatus;
  statusLabel: string;
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
  return {
    id: task.id,
    title: task.title,
    phaseLabel: taskPhaseLabel(task.phase),
    status: task.status,
    statusLabel: taskStatusLabel(task.status),
    serviceName: task.serviceName,
    blockedReason: task.blockedReason ?? null,
    cycleLabel: task.cycleLabel ?? null,
    dependsOnCount: task.dependsOn.length,
  };
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
    readyCount: rows.filter((row) => row.status === "ready").length,
    blockedCount: rows.filter((row) => row.status === "blocked").length,
    notReadyCount: rows.filter((row) => row.status === "not_ready").length,
  };
}

export function resolveProductionTasksApiPayload(record: CampaignTasksRecord) {
  return {
    tasks: record.tasks,
    planFingerprint: record.planFingerprint,
    summary: {
      total: record.tasks.length,
      ready: record.tasks.filter((task) => task.status === "ready").length,
      blocked: record.tasks.filter((task) => task.status === "blocked").length,
      notReady: record.tasks.filter((task) => task.status === "not_ready").length,
    },
  };
}
