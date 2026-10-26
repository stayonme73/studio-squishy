import type { QaRecord, TaskHandoffRecord } from "./types";

/**
 * Read-only task record glances.
 * Browser-safe. Do not import server actions or Node production modules here.
 */

export type FileRoomTaskQaSummary = {
  total: number;
  passes: number;
  fails: number;
  blocks: number;
};

export function qaRecordsForTask(
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): readonly QaRecord[] {
  return (qaRecords ?? []).filter(
    (record) => record.taskId === taskId || record.routedTaskId === taskId,
  );
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

export function resolveQaSummaryForTask(
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): FileRoomTaskQaSummary {
  const records = qaRecordsForTask(qaRecords, taskId);
  return {
    total: records.length,
    passes: records.filter((entry) => entry.action === "qa_pass").length,
    fails: records.filter((entry) => entry.action === "qa_fail").length,
    blocks: records.filter((entry) => entry.action === "qa_block").length,
  };
}
