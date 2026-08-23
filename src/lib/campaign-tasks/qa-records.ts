import type { FileRoomTaskQaSummary } from "./file-room-controls-types";
import type { QaRecord } from "./types";

export function qaRecordsForTask(
  qaRecords: readonly QaRecord[] | undefined,
  taskId: string,
): readonly QaRecord[] {
  return (qaRecords ?? []).filter(
    (record) => record.taskId === taskId || record.routedTaskId === taskId,
  );
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
