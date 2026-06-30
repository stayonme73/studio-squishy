import { campaignProductionConfig } from "@/config/campaign-production";
import { formatBlockedReasonDisplay } from "@/config/campaign-tasks";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

import { resolveDefaultVersionReason } from "./actions";
import {
  currentVersionForTask,
  findWorkUnitForTask,
  isKitchenV1ProductionPhase,
  isKitchenV1ProductionTask,
} from "./validation";
import type { ProductionVersionReason } from "./types";
import type {
  ProductionVersion,
  ProductionWorkUnit,
  ServerProductionEnvelope,
} from "./types";

export type FileRoomProductionVersionRow = {
  id: string;
  reasonLabel: string;
  createdAt: string;
  createdByDisplayName: string;
  bodyPreview: string;
  isCurrent: boolean;
  qaPinned: boolean;
  qaActionLabel: string | null;
};

export type FileRoomProductionWorkPanelView = {
  visible: boolean;
  workUnitId: string | null;
  workUnitStatus: ProductionWorkUnit["status"] | null;
  workUnitStatusLabel: string | null;
  deliverableKeys: readonly string[];
  currentVersionId: string | null;
  currentBody: string;
  canEdit: boolean;
  isBlocked: boolean;
  blockedMessage: string | null;
  versions: readonly FileRoomProductionVersionRow[];
  stageLabel: string;
  nextVersionReason: ProductionVersionReason;
};

export function resolveVersionSaveReason(
  envelope: ServerProductionEnvelope,
  task: CampaignTaskItem,
): ProductionVersionReason {
  return resolveDefaultVersionReason(envelope, task);
}

function bodyPreview(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 120) return trimmed;
  return `${trimmed.slice(0, 117)}…`;
}

function versionRowsForTask(
  envelope: ServerProductionEnvelope,
  unit: ProductionWorkUnit,
  task: CampaignTaskItem,
): FileRoomProductionVersionRow[] {
  if (!isKitchenV1ProductionPhase(task.phase)) return [];

  const lineage = unit.stageLineage.find((entry) => entry.stage === task.phase);
  const currentId = lineage?.currentVersionId ?? null;

  return envelope.versions
    .filter((version) => version.workUnitId === unit.id && version.stage === task.phase)
    .map((version) => ({
      id: version.id,
      reasonLabel: campaignProductionConfig.versionReasonLabels[version.reason],
      createdAt: version.createdAt,
      createdByDisplayName: version.createdByDisplayName,
      bodyPreview: bodyPreview(version.body),
      isCurrent: version.id === currentId,
      qaPinned: Boolean(version.qaPin),
      qaActionLabel: version.qaPin
        ? campaignProductionConfig.qaPinActionLabels[version.qaPin.action]
        : null,
    }));
}

export function resolveFileRoomProductionWorkPanelView(
  envelope: ServerProductionEnvelope | null | undefined,
  task: CampaignTaskItem,
  canEdit: boolean,
): FileRoomProductionWorkPanelView {
  const empty: FileRoomProductionWorkPanelView = {
    visible: false,
    workUnitId: null,
    workUnitStatus: null,
    workUnitStatusLabel: null,
    deliverableKeys: [],
    currentVersionId: null,
    currentBody: "",
    canEdit: false,
    isBlocked: false,
    blockedMessage: null,
    versions: [],
    stageLabel: "",
    nextVersionReason: "initial",
  };

  if (!envelope || !isKitchenV1ProductionTask(task)) {
    return empty;
  }

  const unit = findWorkUnitForTask(envelope, task);
  if (!unit) {
    return { ...empty, visible: true, blockedMessage: campaignProductionConfig.noWorkUnitMessage };
  }

  const lineage = unit.stageLineage.find((entry) => entry.stage === task.phase);
  const currentVersionId = lineage?.currentVersionId ?? null;
  const currentVersion: ProductionVersion | undefined = currentVersionId
    ? envelope.versions.find((version) => version.id === currentVersionId)
    : undefined;

  const isTaskBlocked =
    task.status === "blocked" || task.workflowState === "blocked";

  const isBlocked =
    isTaskBlocked ||
    unit.status === "blocked_plan_change" ||
    unit.status === "superseded" ||
    unit.currentTaskId !== task.id;

  let blockedMessage: string | null = null;
  if (isTaskBlocked) {
    blockedMessage =
      formatBlockedReasonDisplay(task.blockedReason ?? task.workflowBlockedReason) ??
      campaignProductionConfig.blockedPlanChangeMessage;
  } else if (unit.status === "blocked_plan_change") {
    blockedMessage = campaignProductionConfig.blockedPlanChangeMessage;
  } else if (unit.status === "superseded") {
    blockedMessage = campaignProductionConfig.supersededMessage;
  } else if (unit.currentTaskId !== task.id) {
    blockedMessage = campaignProductionConfig.wrongStageMessage;
  }

  return {
    visible: true,
    workUnitId: unit.id,
    workUnitStatus: unit.status,
    workUnitStatusLabel: campaignProductionConfig.workUnitStatusLabels[unit.status],
    deliverableKeys: unit.deliverableKeys,
    currentVersionId,
    currentBody: currentVersion?.body ?? "",
    canEdit: canEdit && !isBlocked && unit.status === "active",
    isBlocked,
    blockedMessage,
    versions: versionRowsForTask(envelope, unit, task),
    stageLabel: isKitchenV1ProductionPhase(task.phase)
      ? campaignProductionConfig.stageLabels[task.phase]
      : "",
    nextVersionReason: resolveVersionSaveReason(envelope, task),
  };
}

export function resolveProductionApiPayload(envelope: ServerProductionEnvelope) {
  return {
    campaignId: envelope.campaignId,
    planFingerprint: envelope.planFingerprint,
    workUnits: envelope.workUnits,
    versions: envelope.versions,
    version: envelope.version,
    updatedAt: envelope.updatedAt,
  };
}
