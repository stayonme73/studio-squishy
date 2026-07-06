import {
  campaignExceptionsConfig,
  exceptionKindRequiresOwner,
} from "@/config/campaign-exceptions";
import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import {
  canAssignException,
  canRaiseException,
  canRaiseExceptionKind,
  isOpenExceptionStatus,
} from "./exceptions";
import {
  isPromotableExceptionRow,
  resolveFileRoomExceptionPromotionPanel,
  type FileRoomExceptionPromotionPanel,
} from "./exceptions-promotion-view";
import type { ExceptionAssignCandidate, FileRoomExceptionPermissions } from "./file-room-controls";
import { resolveExceptionPermissions } from "./file-room-controls";
import type {
  CampaignExceptionEvent,
  CampaignExceptionKind,
  CampaignExceptionRecord,
  CampaignExceptionStatus,
} from "./exceptions-types";
import type { CampaignTaskItem } from "./types";

export type ExceptionFilter = "open" | "resolved";

export type FileRoomExceptionRow = {
  id: string;
  kind: CampaignExceptionKind;
  kindLabel: string;
  status: CampaignExceptionStatus;
  statusLabel: string;
  title: string;
  reasonPreview: string | null;
  taskId: string | null;
  taskTitle: string | null;
  assigneeDisplayName: string | null;
  raisedByDisplayName: string;
  ownerReviewRequired: boolean;
  sentToClient: boolean;
  isAutoCreatedFromQa: boolean;
  nextRequiredAction: string;
  permissions: FileRoomExceptionPermissions;
  promotion: FileRoomExceptionPromotionPanel;
  resolvedAt: string | null;
};

export type FileRoomExceptionsView = {
  filter: ExceptionFilter;
  rows: readonly FileRoomExceptionRow[];
  isEmpty: boolean;
  openCount: number;
  resolvedCount: number;
};

export type ResolveFileRoomExceptionsOptions = {
  user?: StudioUser;
  assignments?: CampaignAssignmentsFile;
  filter?: ExceptionFilter;
  materials?: readonly CampaignMaterialItem[];
  events?: readonly CampaignExceptionEvent[];
};

const ALL_RAISEABLE_KINDS: readonly CampaignExceptionKind[] = [
  "routine_internal",
  "scope_change",
  "compliance_hold",
  "direction_disagreement",
  "missing_client_fact",
  "deadline_commitment",
  "deadline_risk",
  "revision_exhausted",
  "client_request",
] as const;

const EMPTY_PROMOTION_PANEL: FileRoomExceptionPromotionPanel = {
  showApprovalPanel: false,
  showReadOnlyDetails: false,
  showPromotedSummary: false,
  canApprove: false,
  canDecline: false,
  canHold: false,
  promotionDeclined: false,
  internalContext: null,
  holdStateLabel: null,
  defaultWording: {
    category: "factual-confirmation",
    contentKind: "confirmation",
    clientFacingLabel: "",
    clientFacingPrompt: "",
    whyNeeded: "",
    requirementLevel: "required",
    relatedServiceIds: [],
  },
  slotPreview: null,
  promotedSummary: null,
};

function taskTitleById(
  tasks: readonly CampaignTaskItem[],
  taskId: string | undefined,
): string | null {
  if (!taskId) return null;
  return tasks.find((entry) => entry.id === taskId)?.title ?? taskId;
}

function reasonPreview(record: CampaignExceptionRecord): string | null {
  const description = record.description?.trim();
  if (description) return description;
  const draft = record.clientRequestDraft;
  if (draft?.whyBlocksWork?.trim()) return draft.whyBlocksWork.trim();
  if (draft?.exactClientOnlyItem?.trim()) return draft.exactClientOnlyItem.trim();
  if (draft?.whyTeamCannotSolveInternally?.trim()) {
    return draft.whyTeamCannotSolveInternally.trim();
  }
  return null;
}

export function isPromotedAwaitingClient(record: CampaignExceptionRecord): boolean {
  return Boolean(record.promotion) && record.status === "waiting_client";
}

export function resolveExceptionStatusLabel(record: CampaignExceptionRecord): string {
  if (isPromotedAwaitingClient(record)) {
    return campaignExceptionsConfig.promotedWaitingClientStatusLabel;
  }
  return campaignExceptionsConfig.statusLabels[record.status];
}

export function resolveOwnerReviewRequired(record: CampaignExceptionRecord): boolean {
  if (!isOpenExceptionStatus(record.status)) return false;
  if (isPromotedAwaitingClient(record)) return false;

  if (isPromotableExceptionRow(record.kind)) {
    if (record.promotion) return false;
    return record.status === "waiting_owner" || record.status === "open";
  }

  if (exceptionKindRequiresOwner(record.kind)) {
    return record.status === "waiting_owner" || record.status === "open";
  }

  return false;
}

export function resolveSentToClientBadge(record: CampaignExceptionRecord): boolean {
  return isPromotedAwaitingClient(record);
}

export function resolveNextRequiredAction(record: CampaignExceptionRecord): string {
  const { nextActionLabels } = campaignExceptionsConfig;

  if (record.status === "resolved") return nextActionLabels.resolved;
  if (record.status === "cancelled") return nextActionLabels.cancelled;

  if (isPromotedAwaitingClient(record)) {
    return nextActionLabels.clientResponseNeeded;
  }

  if (record.status === "waiting_client") {
    return nextActionLabels.waitingClient;
  }

  if (isPromotableExceptionRow(record.kind)) {
    if (!record.promotion && (record.status === "waiting_owner" || record.status === "open")) {
      return nextActionLabels.ownerReview;
    }
  } else if (record.status === "waiting_owner" || exceptionKindRequiresOwner(record.kind)) {
    return nextActionLabels.ownerReview;
  }

  if (record.status === "waiting_internal") {
    return nextActionLabels.waitingInternal;
  }

  if (record.assignedToUserId) {
    return nextActionLabels.openAssigned;
  }

  return nextActionLabels.openUnassigned;
}

export function resolveRaiseableExceptionKinds(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): readonly CampaignExceptionKind[] {
  if (!canRaiseException(user, assignments)) return [];
  return ALL_RAISEABLE_KINDS.filter((kind) => canRaiseExceptionKind(user, assignments, kind));
}

export function resolveOpenExceptionCountByTaskId(
  records: readonly CampaignExceptionRecord[] | undefined,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const record of records ?? []) {
    if (!isOpenExceptionStatus(record.status) || !record.taskId) continue;
    counts.set(record.taskId, (counts.get(record.taskId) ?? 0) + 1);
  }
  return counts;
}

function toRow(
  record: CampaignExceptionRecord,
  tasks: readonly CampaignTaskItem[],
  options: ResolveFileRoomExceptionsOptions,
): FileRoomExceptionRow {
  const permissions =
    options.user && options.assignments
      ? resolveExceptionPermissions(
          options.user,
          record,
          options.assignments,
          options.events,
        )
      : {
          canRaise: false,
          canAssign: false,
          canResolve: false,
          canApproveClientRequest: false,
          canDeclinePromotion: false,
          canHoldPromotionReview: false,
          canViewPromotionDetails: false,
        };

  const isOpen = isOpenExceptionStatus(record.status);
  const rowPermissions: FileRoomExceptionPermissions = isOpen
    ? permissions
    : {
        ...permissions,
        canAssign: false,
        canResolve: false,
        canApproveClientRequest: false,
        canDeclinePromotion: false,
        canHoldPromotionReview: false,
      };

  const promotion =
    options.user && options.assignments
      ? resolveFileRoomExceptionPromotionPanel(
          record,
          options.events,
          options.materials ?? [],
          tasks,
          options.user,
          options.assignments,
        )
      : EMPTY_PROMOTION_PANEL;

  return {
    id: record.id,
    kind: record.kind,
    kindLabel: campaignExceptionsConfig.kindLabels[record.kind],
    status: record.status,
    statusLabel: resolveExceptionStatusLabel(record),
    title: record.title,
    reasonPreview: reasonPreview(record),
    taskId: record.taskId ?? null,
    taskTitle: taskTitleById(tasks, record.taskId),
    assigneeDisplayName: record.assignedToDisplayName ?? null,
    raisedByDisplayName: record.raisedByDisplayName,
    ownerReviewRequired: resolveOwnerReviewRequired(record),
    sentToClient: resolveSentToClientBadge(record),
    isAutoCreatedFromQa: Boolean(record.qaRecordId),
    nextRequiredAction: resolveNextRequiredAction(record),
    permissions: rowPermissions,
    promotion,
    resolvedAt: record.resolvedAt ?? null,
  };
}

function sortExceptionRows(rows: FileRoomExceptionRow[]): FileRoomExceptionRow[] {
  return rows.sort((a, b) => {
    const aTime = a.resolvedAt ?? "";
    const bTime = b.resolvedAt ?? "";
    if (aTime !== bTime) return bTime.localeCompare(aTime);
    return a.title.localeCompare(b.title);
  });
}

export function resolveFileRoomExceptionsView(
  records: readonly CampaignExceptionRecord[] | undefined,
  tasks: readonly CampaignTaskItem[],
  options: ResolveFileRoomExceptionsOptions = {},
): FileRoomExceptionsView {
  const all = records ?? [];
  const openRecords = all.filter((entry) => isOpenExceptionStatus(entry.status));
  const resolvedRecords = all.filter((entry) => !isOpenExceptionStatus(entry.status));
  const openRows = openRecords.map((record) => toRow(record, tasks, options));
  const resolvedRows = sortExceptionRows(
    resolvedRecords.map((record) => toRow(record, tasks, options)),
  );
  const rows = [...openRows, ...resolvedRows];

  return {
    filter: options.filter ?? "open",
    rows,
    isEmpty: rows.length === 0,
    openCount: openRecords.length,
    resolvedCount: resolvedRecords.length,
  };
}

export function resolveFileRoomExceptionOperatorContext(
  user: StudioUser,
  campaignId: string,
  assignments: CampaignAssignmentsFile,
  assignCandidates: readonly ExceptionAssignCandidate[],
) {
  return {
    canRaise: canRaiseException(user, assignments),
    canAssign: canAssignException(user, assignments),
    raiseableKinds: resolveRaiseableExceptionKinds(user, assignments),
    assignCandidates,
    isOwner: isOwnerUser(user),
  };
}

export type FileRoomExceptionOperatorContext = ReturnType<
  typeof resolveFileRoomExceptionOperatorContext
>;
