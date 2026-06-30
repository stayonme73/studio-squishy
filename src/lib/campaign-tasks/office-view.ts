import { campaignProductionConfig } from "@/config/campaign-production";
import { campaignTasksConfig } from "@/config/campaign-tasks";
import { teamOffices } from "@/config/team-offices";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import {
  currentVersionForTask,
  findWorkUnitForTask,
  isKitchenV1ProductionPhase,
} from "@/lib/campaign-production/validation";
import type { FileRoomCampaignView } from "@/lib/file-room-view";

import { taskRequiredRole } from "./capabilities";
import type { FileRoomQaHistoryEntry, FileRoomTaskQaSummary } from "./file-room-controls";
import type {
  CampaignTaskItem,
  CampaignTasksRecord,
  ProductionRole,
  TaskWorkflowState,
} from "./types";
import type { FileRoomProductionTasksView, FileRoomTaskRow } from "./tasks-view";

export type OfficeQueueTaskRow = FileRoomTaskRow & {
  /** Task requires a different production role than the active office. */
  isWrongRole: boolean;
  /** Work body and handoffs are read-only for the viewer. */
  isReadOnly: boolean;
};

export type OfficeQueueView = {
  officeRole: ProductionRole;
  tasks: readonly OfficeQueueTaskRow[];
  isEmpty: boolean;
};

export type OfficeStrategyContextView = {
  visible: boolean;
  taskTitle: string;
  stageLabel: string;
  currentBody: string;
  currentVersionId: string | null;
};

export type OfficeDownstreamStatusView = {
  visible: boolean;
  taskTitle: string;
  statusLabel: string;
  workflowState: TaskWorkflowState;
};

export type OfficeQaStatusView = {
  visible: boolean;
  waitingForQa: boolean;
  statusLabel: string;
  workflowState: TaskWorkflowState;
  qaSummary: FileRoomTaskQaSummary;
  latestQa: FileRoomQaHistoryEntry | null;
};

export type OfficeContextRailView = {
  campaignName: string;
  planIncludes: readonly string[];
  deliverableScope: FileRoomCampaignView["deliverableScope"];
  materialsCount: number;
  strategyContext: OfficeStrategyContextView;
  downstreamStatus: OfficeDownstreamStatusView;
};

export type OfficeSceneView = {
  officeRole: ProductionRole;
  officeLabel: string;
  queue: OfficeQueueView;
  selectedTask: OfficeQueueTaskRow | null;
  qaStatus: OfficeQaStatusView;
  contextRail: OfficeContextRailView;
};

function kitchenTaskFromRow(row: FileRoomTaskRow): CampaignTaskItem {
  const serviceId = row.id.split(":")[0] ?? "sm-001";
  return {
    id: row.id,
    title: row.title,
    phase: row.phase,
    status: row.effectiveStatus,
    relatedServiceIds: [serviceId as import("@/catalog/types").ServiceId],
    familyId: row.familyId,
    catalogFamilyId: "social_media",
    serviceName: row.serviceName,
    dependsOn: [],
    workflowState: row.workflowState,
    claimedByUserId: row.claimedByUserId,
    assignedRole: row.assignedRole,
    responsibleRole: row.responsibleRole,
  };
}

function isCopyOfficeTask(row: FileRoomTaskRow, officeRole: ProductionRole): boolean {
  return taskRequiredRole(kitchenTaskFromRow(row)) === officeRole;
}

function isActiveOfficeQueueTask(row: FileRoomTaskRow): boolean {
  return row.effectiveStatus !== "complete" && row.effectiveStatus !== "cancelled";
}

export function isOfficeTaskReadOnly(
  row: FileRoomTaskRow,
  officeRole: ProductionRole,
  canEditTask: boolean,
): boolean {
  if (!isCopyOfficeTask(row, officeRole)) return true;
  return !canEditTask;
}

export function filterOfficeQueueTasks(
  productionTasks: FileRoomProductionTasksView,
  officeRole: ProductionRole,
  options: {
    userId: string;
    canEditForTask: (task: CampaignTaskItem) => boolean;
    deepLinkTaskId?: string | null;
  },
): OfficeQueueView {
  const defaultQueue = productionTasks.tasks.filter(
    (row) => isCopyOfficeTask(row, officeRole) && isActiveOfficeQueueTask(row),
  );

  let queueRows = defaultQueue;
  if (options.deepLinkTaskId) {
    const deepLinked = productionTasks.tasks.find((row) => row.id === options.deepLinkTaskId);
    if (deepLinked && !queueRows.some((row) => row.id === deepLinked.id)) {
      queueRows = [...queueRows, deepLinked];
    }
  }

  const tasks: OfficeQueueTaskRow[] = queueRows.map((row) => {
    const task = kitchenTaskFromRow(row);
    const isWrongRole = !isCopyOfficeTask(row, officeRole);
    const isReadOnly = isOfficeTaskReadOnly(row, officeRole, options.canEditForTask(task));
    return { ...row, isWrongRole, isReadOnly };
  });

  return {
    officeRole,
    tasks,
    isEmpty: tasks.length === 0,
  };
}

export function resolveOfficeSelectedTask(
  queue: OfficeQueueView,
  selectedTaskId: string | null | undefined,
): OfficeQueueTaskRow | null {
  if (!selectedTaskId) {
    return queue.tasks[0] ?? null;
  }
  return queue.tasks.find((row) => row.id === selectedTaskId) ?? queue.tasks[0] ?? null;
}

export function resolveOfficeStrategyContext(
  productionEnvelope: ServerProductionEnvelope | null | undefined,
  tasksRecord: CampaignTasksRecord,
  serviceId = "sm-001",
): OfficeStrategyContextView {
  const strategyTask = tasksRecord.tasks.find(
    (task) =>
      task.id === `${serviceId}:strategy_content_direction` &&
      isKitchenV1ProductionPhase(task.phase),
  );

  if (!strategyTask || !productionEnvelope) {
    return {
      visible: false,
      taskTitle: "",
      stageLabel: campaignProductionConfig.stageLabels.strategy_content_direction,
      currentBody: "",
      currentVersionId: null,
    };
  }

  const version = currentVersionForTask(productionEnvelope, strategyTask);

  return {
    visible: true,
    taskTitle: strategyTask.title,
    stageLabel: campaignProductionConfig.stageLabels.strategy_content_direction,
    currentBody: version?.body ?? "",
    currentVersionId: version?.id ?? null,
  };
}

export function resolveOfficeDownstreamStatus(
  tasksRecord: CampaignTasksRecord,
  serviceId = "sm-001",
): OfficeDownstreamStatusView {
  const creativeTask = tasksRecord.tasks.find((task) => task.id === `${serviceId}:creative`);

  if (!creativeTask) {
    return {
      visible: false,
      taskTitle: "",
      statusLabel: teamOffices.downstreamEmpty,
      workflowState: "unstarted",
    };
  }

  return {
    visible: true,
    taskTitle: creativeTask.title,
    statusLabel: campaignTasksConfig.effectiveStatusLabels[creativeTask.status],
    workflowState: creativeTask.workflowState ?? "unstarted",
  };
}

export function resolveOfficeQaStatus(task: OfficeQueueTaskRow | null): OfficeQaStatusView {
  if (!task) {
    return {
      visible: false,
      waitingForQa: false,
      statusLabel: "",
      workflowState: "unstarted",
      qaSummary: { total: 0, passes: 0, fails: 0, blocks: 0 },
      latestQa: null,
    };
  }

  const waitingForQa = task.workflowState === "ready_for_qa";
  const showStatus =
    waitingForQa ||
    task.workflowState === "needs_revision" ||
    task.qaSummary.total > 0;

  return {
    visible: showStatus,
    waitingForQa,
    statusLabel: task.statusLabel,
    workflowState: task.workflowState,
    qaSummary: task.qaSummary,
    latestQa: task.latestQaHistory,
  };
}

export function resolveOfficeContextRail(
  campaignView: FileRoomCampaignView,
  productionEnvelope: ServerProductionEnvelope,
  tasksRecord: CampaignTasksRecord,
): OfficeContextRailView {
  return {
    campaignName: campaignView.campaignName,
    planIncludes: campaignView.planIncludes,
    deliverableScope: campaignView.deliverableScope,
    materialsCount: campaignView.materials.groups.reduce(
      (count, group) => count + group.items.length,
      0,
    ),
    strategyContext: resolveOfficeStrategyContext(productionEnvelope, tasksRecord),
    downstreamStatus: resolveOfficeDownstreamStatus(tasksRecord),
  };
}

export function resolveOfficeWorkUnitStageMatch(
  productionEnvelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
): boolean {
  const unit = findWorkUnitForTask(productionEnvelope, task);
  if (!unit) return false;
  return unit.status === "active" && unit.currentTaskId === task.id;
}
