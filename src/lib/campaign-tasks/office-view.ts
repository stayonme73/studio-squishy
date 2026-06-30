import { campaignProductionConfig } from "@/config/campaign-production";
import { campaignTasksConfig } from "@/config/campaign-tasks";
import { teamOffices } from "@/config/team-offices";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import {
  currentVersionForTask,
  findWorkUnitForTask,
  isKitchenV1ProductionPhase,
} from "@/lib/campaign-production/validation";
import type { FileRoomCampaignView, FileRoomDiscoveryItem } from "@/lib/file-room-view";

import { taskRequiredRole } from "./capabilities";
import { isFormalQaTask } from "./qa";
import { isTaskWorkflowBlocked } from "./office-task-controls";
export {
  isTaskWorkflowBlocked,
  resolveBlockedTaskGuidance,
  shouldOfferReassignControl,
} from "./office-task-controls";
import type { FileRoomQaHistoryEntry, FileRoomTaskQaSummary } from "./file-room-controls";
import type {
  CampaignTaskItem,
  CampaignTasksRecord,
  ProductionRole,
  TaskHandoffRecord,
  TaskWorkflowState,
} from "./types";
import type { FileRoomProductionTasksView, FileRoomTaskRow } from "./tasks-view";

export type OfficeQueueTaskRow = FileRoomTaskRow & {
  /** Task requires a different production role than the active office. */
  isWrongRole: boolean;
  /** Work body and handoffs are read-only for the viewer. */
  isReadOnly: boolean;
  /** QA office queue tier — actionable ready_for_qa vs de-emphasized formal QA. */
  queueTier?: "primary" | "secondary";
};

export type QaOfficeQueueView = OfficeQueueView & {
  primaryTasks: readonly OfficeQueueTaskRow[];
  secondaryTasks: readonly OfficeQueueTaskRow[];
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

export type OfficeCopyContextView = {
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
  officeRole: ProductionRole;
  campaignName: string;
  planIncludes: readonly string[];
  deliverableScope: FileRoomCampaignView["deliverableScope"];
  materialsCount: number;
  discoverySnippet: readonly FileRoomDiscoveryItem[];
  strategyContext: OfficeStrategyContextView;
  copyContext: OfficeCopyContextView;
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

export type ProducerHandoffFeedEntry = {
  id: string;
  taskTitle: string;
  fromRole: string;
  toRole: string;
  summary: string;
  createdAt: string;
};

export type ProducerDispatchBucket = {
  key: string;
  title: string;
  tasks: readonly OfficeQueueTaskRow[];
};

export type ProducerDispatchView = {
  buckets: readonly ProducerDispatchBucket[];
  recentHandoffs: readonly ProducerHandoffFeedEntry[];
  openExceptionCount: number;
  isEmpty: boolean;
};

const DISCOVERY_SNIPPET_LIMIT = 4;

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

function isOfficeRoleTask(row: FileRoomTaskRow, officeRole: ProductionRole): boolean {
  return taskRequiredRole(kitchenTaskFromRow(row)) === officeRole;
}

function isActiveOfficeQueueTask(row: FileRoomTaskRow): boolean {
  return row.effectiveStatus !== "complete" && row.effectiveStatus !== "cancelled";
}

function isQaOfficeQueueTask(row: FileRoomTaskRow): boolean {
  const task = kitchenTaskFromRow(row);
  if (isFormalQaTask(task)) return isActiveOfficeQueueTask(row);
  return row.workflowState === "ready_for_qa" && isActiveOfficeQueueTask(row);
}

function toOfficeQueueRow(
  row: FileRoomTaskRow,
  officeRole: ProductionRole,
  canEditForTask: (task: CampaignTaskItem) => boolean,
  matchRole: (row: FileRoomTaskRow, role: ProductionRole) => boolean,
): OfficeQueueTaskRow {
  const task = kitchenTaskFromRow(row);
  const isWrongRole = !matchRole(row, officeRole);
  const isReadOnly = isOfficeTaskReadOnly(row, officeRole, canEditForTask(task), matchRole);
  return { ...row, isWrongRole, isReadOnly };
}

export function isOfficeTaskReadOnly(
  row: FileRoomTaskRow,
  officeRole: ProductionRole,
  canEditTask: boolean,
  matchRole: (row: FileRoomTaskRow, role: ProductionRole) => boolean = isOfficeRoleTask,
): boolean {
  if (isTaskWorkflowBlocked(row)) return true;
  if (!matchRole(row, officeRole)) return true;
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
    (row) => isOfficeRoleTask(row, officeRole) && isActiveOfficeQueueTask(row),
  );

  let queueRows = defaultQueue;
  if (options.deepLinkTaskId) {
    const deepLinked = productionTasks.tasks.find((row) => row.id === options.deepLinkTaskId);
    if (deepLinked && !queueRows.some((row) => row.id === deepLinked.id)) {
      queueRows = [...queueRows, deepLinked];
    }
  }

  const tasks: OfficeQueueTaskRow[] = queueRows.map((row) =>
    toOfficeQueueRow(row, officeRole, options.canEditForTask, isOfficeRoleTask),
  );

  return {
    officeRole,
    tasks,
    isEmpty: tasks.length === 0,
  };
}

function qaQueueTierForRow(row: FileRoomTaskRow): "primary" | "secondary" {
  if (row.workflowState === "ready_for_qa") return "primary";
  return "secondary";
}

export function filterQaOfficeQueueTasks(
  productionTasks: FileRoomProductionTasksView,
  options: {
    canEditForTask: (task: CampaignTaskItem) => boolean;
    deepLinkTaskId?: string | null;
  },
): QaOfficeQueueView {
  const officeRole: ProductionRole = "qa";
  const defaultQueue = productionTasks.tasks.filter(isQaOfficeQueueTask);

  let queueRows = defaultQueue;
  if (options.deepLinkTaskId) {
    const deepLinked = productionTasks.tasks.find((row) => row.id === options.deepLinkTaskId);
    if (deepLinked && !queueRows.some((row) => row.id === deepLinked.id)) {
      queueRows = [...queueRows, deepLinked];
    }
  }

  const primarySource = queueRows.filter((row) => row.workflowState === "ready_for_qa");
  const secondarySource = queueRows.filter((row) => row.workflowState !== "ready_for_qa");
  const orderedRows = [...primarySource, ...secondarySource];

  const toQaRow = (row: FileRoomTaskRow): OfficeQueueTaskRow => ({
    ...toOfficeQueueRow(row, officeRole, options.canEditForTask, () => true),
    queueTier: qaQueueTierForRow(row),
  });

  const primaryTasks = primarySource.map(toQaRow);
  const secondaryTasks = secondarySource.map(toQaRow);
  const tasks = orderedRows.map(toQaRow);

  return {
    officeRole,
    tasks,
    primaryTasks,
    secondaryTasks,
    isEmpty: tasks.length === 0,
  };
}

export function resolveProducerDispatchView(
  productionTasks: FileRoomProductionTasksView,
  handoffs: readonly TaskHandoffRecord[],
  openExceptionCount: number,
  taskTitleById: Readonly<Record<string, string>>,
): ProducerDispatchView {
  const activeRows = productionTasks.tasks.filter(isActiveOfficeQueueTask);
  const toRow = (row: FileRoomTaskRow): OfficeQueueTaskRow => ({
    ...row,
    isWrongRole: false,
    isReadOnly: true,
  });

  const blocked = activeRows.filter(
    (row) => row.effectiveStatus === "blocked" || row.workflowState === "blocked",
  );
  const stalled = activeRows.filter(
    (row) =>
      row.workflowState === "in_progress" &&
      row.effectiveStatus !== "blocked" &&
      row.openExceptionCount > 0,
  );
  const readyForQa = activeRows.filter((row) => row.workflowState === "ready_for_qa");
  const needsRevision = activeRows.filter((row) => row.workflowState === "needs_revision");
  const unclaimedReady = activeRows.filter(
    (row) => row.workflowState === "unstarted" && row.effectiveStatus === "ready",
  );

  const buckets: ProducerDispatchBucket[] = [
    { key: "blocked", title: teamOffices.producerBlockedTitle, tasks: blocked.map(toRow) },
    { key: "stalled", title: teamOffices.producerStalledTitle, tasks: stalled.map(toRow) },
    {
      key: "ready_for_qa",
      title: teamOffices.producerReadyForQaTitle,
      tasks: readyForQa.map(toRow),
    },
    {
      key: "needs_revision",
      title: teamOffices.producerNeedsRevisionTitle,
      tasks: needsRevision.map(toRow),
    },
    {
      key: "unclaimed_ready",
      title: teamOffices.producerUnclaimedReadyTitle,
      tasks: unclaimedReady.map(toRow),
    },
  ].filter((bucket) => bucket.tasks.length > 0);

  const recentHandoffs: ProducerHandoffFeedEntry[] = [...handoffs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((handoff) => ({
      id: handoff.id,
      taskTitle: taskTitleById[handoff.taskId] ?? handoff.taskId,
      fromRole: handoff.fromRole,
      toRole: handoff.toRole,
      summary: handoff.completedSummary,
      createdAt: handoff.createdAt,
    }));

  const isEmpty =
    buckets.every((bucket) => bucket.tasks.length === 0) &&
    recentHandoffs.length === 0 &&
    openExceptionCount === 0;

  return { buckets, recentHandoffs, openExceptionCount, isEmpty };
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

export function resolveOfficeCopyContext(
  productionEnvelope: ServerProductionEnvelope | null | undefined,
  tasksRecord: CampaignTasksRecord,
  serviceId = "sm-001",
): OfficeCopyContextView {
  const copyTask = tasksRecord.tasks.find(
    (task) => task.id === `${serviceId}:copy` && isKitchenV1ProductionPhase(task.phase),
  );

  if (!copyTask || !productionEnvelope) {
    return {
      visible: false,
      taskTitle: "",
      stageLabel: campaignProductionConfig.stageLabels.copy,
      currentBody: "",
      currentVersionId: null,
    };
  }

  const version = currentVersionForTask(productionEnvelope, copyTask);

  return {
    visible: true,
    taskTitle: copyTask.title,
    stageLabel: campaignProductionConfig.stageLabels.copy,
    currentBody: version?.body ?? "",
    currentVersionId: version?.id ?? null,
  };
}

export function resolveOfficeDownstreamStatus(
  tasksRecord: CampaignTasksRecord,
  officeRole: ProductionRole,
  serviceId = "sm-001",
): OfficeDownstreamStatusView {
  const downstreamTaskId =
    officeRole === "strategy"
      ? `${serviceId}:copy`
      : officeRole === "copy"
        ? `${serviceId}:creative`
        : null;

  if (!downstreamTaskId) {
    return {
      visible: false,
      taskTitle: "",
      statusLabel: teamOffices.downstreamCreativeEmpty,
      workflowState: "unstarted",
    };
  }

  const downstreamTask = tasksRecord.tasks.find((task) => task.id === downstreamTaskId);
  const emptyLabel =
    officeRole === "strategy"
      ? teamOffices.downstreamCopyEmpty
      : teamOffices.downstreamCreativeEmpty;

  if (!downstreamTask) {
    return {
      visible: false,
      taskTitle: "",
      statusLabel: emptyLabel,
      workflowState: "unstarted",
    };
  }

  return {
    visible: true,
    taskTitle: downstreamTask.title,
    statusLabel: campaignTasksConfig.effectiveStatusLabels[downstreamTask.status],
    workflowState: downstreamTask.workflowState ?? "unstarted",
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
  officeRole: ProductionRole,
): OfficeContextRailView {
  return {
    officeRole,
    campaignName: campaignView.campaignName,
    planIncludes: campaignView.planIncludes,
    deliverableScope: campaignView.deliverableScope,
    materialsCount: campaignView.materials.groups.reduce(
      (count, group) => count + group.items.length,
      0,
    ),
    discoverySnippet: campaignView.discoveryItems.slice(0, DISCOVERY_SNIPPET_LIMIT),
    strategyContext: resolveOfficeStrategyContext(productionEnvelope, tasksRecord),
    copyContext: resolveOfficeCopyContext(productionEnvelope, tasksRecord),
    downstreamStatus: resolveOfficeDownstreamStatus(tasksRecord, officeRole),
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
