import { FILE_ROOM_ROUTE } from "@/config/file-room";
import { ownerConsole } from "@/config/owner-console";
import {
  officeRoleFromSlug,
  teamOfficePath,
  teamOfficeRoleLabels,
  TEAM_OFFICE_V1_LIVE_SLUGS,
  type TeamOfficeRoleSlug,
} from "@/config/team-offices";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import { resolveFileRoomProductionWorkPanelView } from "@/lib/campaign-production/production-view";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { canEnterTeamOffice } from "./office-access";

import {
  resolveFileRoomExceptionOperatorContext,
  resolveFileRoomExceptionsView,
  resolveOpenExceptionCountByTaskId,
} from "./exceptions-view";
import {
  resolveAssignCandidatesForException,
  resolveReassignCandidatesForTask,
  resolveReassignRolesForFamily,
  resolveTaskPermissions,
  type FileRoomQaHistoryEntry,
} from "./file-room-controls";
import type { ExceptionAssignCandidate } from "./file-room-controls";
import {
  resolveOwnerConsoleScanView,
  resolveWaitingOwnerExceptionIds,
  type OwnerConsoleScanView,
} from "./owner-console-scan-view";
import {
  resolveOwnerConsoleView,
  type OwnerConsoleCampaignBundle,
  type OwnerConsoleDecisionCard,
} from "./owner-console-view";
import { resolveFileRoomProductionTasksView, type FileRoomTaskRow } from "./tasks-view";
import type { ServerTasksEnvelope } from "./types";

export type OwnerConsoleOfficeLink = {
  slug: TeamOfficeRoleSlug;
  label: string;
  href: string;
};

export type OwnerConsoleLinkedMaterialSummary = {
  id: string;
  label: string;
  statusLabel: string;
  isBlocking: boolean;
};

export type OwnerConsoleProductionSummary = {
  stageLabel: string;
  workUnitStatusLabel: string | null;
  currentBodyPreview: string;
  blockedMessage: string | null;
  versionCount: number;
};

export type OwnerConsoleReassignContext = {
  taskId: string;
  taskTitle: string;
  canReassign: boolean;
  reassignRoles: readonly import("./types").ProductionRole[];
  candidates: ReturnType<typeof resolveReassignCandidatesForTask>;
  claimVersion: string | null;
  workflowState: import("./types").TaskWorkflowState;
  workVersionId: string | null;
};

export type OwnerConsoleCampaignDetailView = {
  campaignId: string;
  campaignName: string;
  businessLabel: string;
  waitingOnOwner: readonly OwnerConsoleDecisionCard[];
  selectedItemId: string | null;
  selectedCard: OwnerConsoleDecisionCard | null;
  operatorContext: ReturnType<typeof resolveFileRoomExceptionOperatorContext>;
  linkedTask: FileRoomTaskRow | null;
  linkedServiceName: string | null;
  linkedMaterials: readonly OwnerConsoleLinkedMaterialSummary[];
  qaHistory: readonly FileRoomQaHistoryEntry[];
  productionSummary: OwnerConsoleProductionSummary | null;
  officeLinks: readonly OwnerConsoleOfficeLink[];
  fileRoomHref: string;
  reassign: OwnerConsoleReassignContext | null;
  scan: OwnerConsoleScanView;
  isEmpty: boolean;
};

export type OwnerConsoleCampaignLoadInput = {
  envelope: ServerCampaignEnvelope;
  tasksEnvelope: ServerTasksEnvelope;
  materials: readonly CampaignMaterialItem[];
  productionEnvelope: ServerProductionEnvelope;
  user: StudioUser;
  assignments: CampaignAssignmentsFile;
  assignCandidates: readonly ExceptionAssignCandidate[];
  selectedItemId: string | null;
};

function resolveOfficeLinks(
  user: StudioUser,
  campaignId: string,
  assignments: CampaignAssignmentsFile,
  taskId: string | null,
): OwnerConsoleOfficeLink[] {
  return TEAM_OFFICE_V1_LIVE_SLUGS.filter((slug) =>
    canEnterTeamOffice(user, campaignId, officeRoleFromSlug(slug), assignments),
  ).map((slug) => {
    const base = teamOfficePath(campaignId, slug);
    const href = taskId ? `${base}?task=${encodeURIComponent(taskId)}` : base;
    return {
      slug,
      label: `${teamOfficeRoleLabels[slug]} Office`,
      href,
    };
  });
}

function linkedMaterialsForException(
  exceptionId: string,
  materials: readonly CampaignMaterialItem[],
): OwnerConsoleLinkedMaterialSummary[] {
  return materials
    .filter((item) => item.sourceExceptionId === exceptionId)
    .map((item) => ({
      id: item.id,
      label: item.label,
      statusLabel: item.reviewStatus.replace(/_/g, " "),
      isBlocking: item.requirementLevel === "required" && item.reviewStatus !== "approved_for_use",
    }));
}

function resolveProductionSummary(
  productionEnvelope: ServerProductionEnvelope,
  linkedTask: FileRoomTaskRow | null,
  tasks: readonly import("./types").CampaignTaskItem[],
): OwnerConsoleProductionSummary | null {
  if (!linkedTask) return null;

  const rawTask = tasks.find((entry) => entry.id === linkedTask.id) ?? null;
  const panel = rawTask
    ? resolveFileRoomProductionWorkPanelView(productionEnvelope, rawTask, false)
    : null;
  if (!panel?.visible) return null;

  return {
    stageLabel: panel.stageLabel || linkedTask.phaseLabel,
    workUnitStatusLabel: panel.workUnitStatusLabel,
    currentBodyPreview: panel.currentBody.trim()
      ? panel.currentBody.slice(0, 200)
      : ownerConsole.noProduction,
    blockedMessage: panel.blockedMessage,
    versionCount: panel.versions.length,
  };
}

function resolveReassignContext(
  user: StudioUser,
  campaignId: string,
  assignments: CampaignAssignmentsFile,
  users: readonly StudioUser[],
  linkedTask: FileRoomTaskRow | null,
  productionEnvelope: ServerProductionEnvelope,
  tasks: readonly import("./types").CampaignTaskItem[],
): OwnerConsoleReassignContext | null {
  if (!linkedTask) return null;

  const rawTask = tasks.find((entry) => entry.id === linkedTask.id) ?? null;
  const productionPanel = rawTask
    ? resolveFileRoomProductionWorkPanelView(productionEnvelope, rawTask, false)
    : null;

  const permissions = resolveTaskPermissions(user, {
    id: linkedTask.id,
    familyId: linkedTask.familyId,
    workflowState: linkedTask.workflowState,
    status: linkedTask.effectiveStatus,
    claimedAt: linkedTask.claimVersion ?? undefined,
    claimedByUserId: linkedTask.claimedByUserId,
  } as import("./types").CampaignTaskItem, assignments);

  const candidates = resolveReassignCandidatesForTask(
    {
      id: linkedTask.id,
      familyId: linkedTask.familyId,
      workflowState: linkedTask.workflowState,
      status: linkedTask.effectiveStatus,
    } as import("./types").CampaignTaskItem,
    campaignId,
    assignments,
    users,
  );

  return {
    taskId: linkedTask.id,
    taskTitle: linkedTask.title,
    canReassign: permissions.canReassign,
    reassignRoles: resolveReassignRolesForFamily(linkedTask.familyId),
    candidates,
    claimVersion: linkedTask.claimVersion,
    workflowState: linkedTask.workflowState,
    workVersionId: productionPanel?.currentVersionId ?? null,
  };
}

export function resolveOwnerConsoleCampaignDetailView(
  input: OwnerConsoleCampaignLoadInput,
  users: readonly StudioUser[],
): OwnerConsoleCampaignDetailView {
  const {
    envelope,
    tasksEnvelope,
    materials,
    productionEnvelope,
    user,
    assignments,
    assignCandidates,
    selectedItemId,
  } = input;

  const bundle: OwnerConsoleCampaignBundle = {
    envelope,
    tasksEnvelope,
    materials,
  };

  const assignCandidatesByCampaign = {
    [envelope.campaignId]: assignCandidates,
  };

  const consoleView = resolveOwnerConsoleView(
    [bundle],
    user,
    assignments,
    assignCandidatesByCampaign,
  );

  const waitingOwnerIds = resolveWaitingOwnerExceptionIds(consoleView.waitingOnOwner);
  const scan = resolveOwnerConsoleScanView([bundle], user, assignments, waitingOwnerIds);

  const listItem = resolveFileRoomListItemView(envelope);

  const productionTasksView = resolveFileRoomProductionTasksView(tasksEnvelope, {
    user,
    assignments,
    openExceptionCountByTaskId: resolveOpenExceptionCountByTaskId(
      tasksEnvelope.exceptionRecords,
    ),
  });

  const selectedCard =
    consoleView.waitingOnOwner.find((card) => card.id === selectedItemId) ??
    consoleView.waitingOnOwner[0] ??
    null;

  const effectiveSelectedId = selectedCard?.id ?? null;
  const taskId = selectedCard?.row.taskId ?? null;

  const linkedTask =
    taskId != null
      ? productionTasksView.tasks.find((row) => row.id === taskId) ?? null
      : null;

  const operatorContext = resolveFileRoomExceptionOperatorContext(
    user,
    envelope.campaignId,
    assignments,
    assignCandidates,
  );

  return {
    campaignId: listItem.campaignId,
    campaignName: listItem.campaignName,
    businessLabel: listItem.businessLabel,
    waitingOnOwner: consoleView.waitingOnOwner,
    selectedItemId: effectiveSelectedId,
    selectedCard,
    operatorContext,
    linkedTask,
    linkedServiceName: linkedTask?.serviceName ?? null,
    linkedMaterials: effectiveSelectedId
      ? linkedMaterialsForException(effectiveSelectedId, materials)
      : [],
    qaHistory: linkedTask?.qaHistory ?? [],
    productionSummary: resolveProductionSummary(
      productionEnvelope,
      linkedTask,
      tasksEnvelope.tasks,
    ),
    officeLinks: resolveOfficeLinks(user, envelope.campaignId, assignments, taskId),
    fileRoomHref: `${FILE_ROOM_ROUTE}/${envelope.campaignId}`,
    reassign: resolveReassignContext(
      user,
      envelope.campaignId,
      assignments,
      users,
      linkedTask,
      productionEnvelope,
      tasksEnvelope.tasks,
    ),
    scan,
    isEmpty: consoleView.isEmpty && scan.totalItems === 0,
  };
}
