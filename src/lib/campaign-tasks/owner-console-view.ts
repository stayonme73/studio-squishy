import {
  campaignExceptionsConfig,
  exceptionKindRequiresOwner,
} from "@/config/campaign-exceptions";
import { campaignTasksConfig } from "@/config/campaign-tasks";
import {
  ownerConsole,
  ownerConsoleImpactByKind,
  ownerConsoleOutcomeByKind,
} from "@/config/owner-console";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";

import { isOpenExceptionStatus } from "./exceptions";
import {
  resolveFileRoomExceptionOperatorContext,
  resolveFileRoomExceptionsView,
  resolveNextRequiredAction,
  resolveOwnerReviewRequired,
  type FileRoomExceptionOperatorContext,
  type FileRoomExceptionRow,
} from "./exceptions-view";
import { isPromotableExceptionRow } from "./exceptions-promotion-view";
import type { CampaignExceptionRecord, CampaignExceptionKind } from "./exceptions-types";
import { sortWaitingCardsByUrgency } from "./owner-console-sequential";
import { isTaskWorkflowBlocked } from "./office-task-controls";
import type { FileRoomTaskRow } from "./tasks-view";
import {
  resolveAssignCandidatesForException,
  type ExceptionAssignCandidate,
} from "./file-room-controls";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import type { QaRecord, ServerTasksEnvelope } from "./types";

export type OwnerConsoleActionDescriptor = {
  kind: "approve" | "hold" | "decline" | "resolve" | "assign";
  label: string;
  irreversible: boolean;
};

export type OwnerConsoleDecisionCard = {
  id: string;
  campaignId: string;
  campaignName: string;
  businessLabel: string;
  /** Compact queue line — linked task, kind, campaign suffix when titles collide. */
  queueDifferentiator: string;
  updatedAt: string;
  ageLabel: string;
  whatHappened: string;
  whyOwner: string;
  recommendedNextAction: string;
  impactIfNoAction: string;
  whereWorkGoesAfter: string;
  availableActions: readonly OwnerConsoleActionDescriptor[];
  row: FileRoomExceptionRow;
  /** Consented project change ready for Owner Desk typed apply. */
  projectChangeApply?: {
    requestId: string;
    requestSummary: string;
  };
};

export type OwnerConsoleCampaignContext = {
  campaignId: string;
  campaignName: string;
  businessLabel: string;
  operatorContext: FileRoomExceptionOperatorContext;
};

export type OwnerConsoleView = {
  waitingOnOwner: readonly OwnerConsoleDecisionCard[];
  waitingCount: number;
  campaignCount: number;
  isEmpty: boolean;
  campaigns: readonly OwnerConsoleCampaignContext[];
};

export type OwnerConsoleCampaignBundle = {
  envelope: ServerCampaignEnvelope;
  tasksEnvelope: ServerTasksEnvelope;
  materials?: readonly CampaignMaterialItem[];
};

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

function formatAgeLabel(updatedAt: string): string {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveWhatHappened(
  record: CampaignExceptionRecord,
  qaRecords: readonly QaRecord[] | undefined,
): string {
  const parts: string[] = [];
  if (record.qaRecordId && qaRecords) {
    const qa = qaRecords.find((entry) => entry.id === record.qaRecordId);
    if (qa?.notes?.trim()) {
      parts.push(`QA: ${qa.notes.trim()}`);
    }
  }
  parts.push(record.title);
  const preview = reasonPreview(record);
  if (preview && preview !== record.title) {
    parts.push(preview);
  }
  return parts.join(" — ");
}

function resolveWhyOwner(record: CampaignExceptionRecord): string {
  const kindLabel = campaignExceptionsConfig.kindLabels[record.kind];
  if (isPromotableExceptionRow(record.kind) && !record.promotion) {
    return `${kindLabel} — ${ownerConsole.promotableWhyOwner}`;
  }
  if (exceptionKindRequiresOwner(record.kind)) {
    return `${kindLabel} — ${ownerConsole.ownerHeldWhySuffix}`;
  }
  return `${kindLabel} — ${ownerConsole.ownerHeldWhySuffix}`;
}

/** Owner-held kinds where routing to another role cannot clear the blocker. */
const OWNER_REASSIGN_BLOCKER_KINDS = new Set<CampaignExceptionKind>([
  "compliance_hold",
  "direction_disagreement",
  "scope_change",
]);

function isTaskBlockedByUnsolvableOwnerDecision(
  task: Pick<FileRoomTaskRow, "effectiveStatus" | "workflowState" | "blockedReason">,
): boolean {
  if (!isTaskWorkflowBlocked(task)) return false;

  const token = (task.blockedReason ?? "").toLowerCase();
  return (
    token.includes("compliance_hold") ||
    token.includes("compliance hold") ||
    token.includes("direction") ||
    token.includes("plan_change") ||
    token.includes("plan change") ||
    token.includes("scope_change") ||
    token.includes("scope change") ||
    token.includes("missing_client_fact") ||
    token.includes("missing client fact") ||
    token.includes("owner_escalation")
  );
}

function canReassignAdvanceLinkedTask(
  task: Pick<FileRoomTaskRow, "workflowState" | "effectiveStatus">,
): boolean {
  if (task.workflowState === "needs_revision") return true;
  if (task.workflowState === "unstarted" && task.effectiveStatus === "ready") return true;
  if (task.workflowState === "in_progress" && !isTaskWorkflowBlocked(task)) return true;
  return false;
}

export function isOwnerExceptionBlockingReassign(row: FileRoomExceptionRow): boolean {
  if (isPromotableExceptionRow(row.kind) && row.ownerReviewRequired) {
    return true;
  }
  if (OWNER_REASSIGN_BLOCKER_KINDS.has(row.kind) && row.ownerReviewRequired) {
    return true;
  }
  return false;
}

export function shouldOfferOwnerConsoleReassign(
  exceptionRow: FileRoomExceptionRow | null,
  linkedTask: Pick<
    FileRoomTaskRow,
    "effectiveStatus" | "workflowState" | "blockedReason" | "claimedByUserId"
  > | null,
  canReassignPermission: boolean,
): boolean {
  if (!canReassignPermission || !linkedTask) return false;
  if (exceptionRow && isOwnerExceptionBlockingReassign(exceptionRow)) return false;
  if (isTaskBlockedByUnsolvableOwnerDecision(linkedTask)) return false;
  return canReassignAdvanceLinkedTask(linkedTask);
}

export function resolveOwnerConsoleReassignReason(
  linkedTask: Pick<
    FileRoomTaskRow,
    "workflowState" | "effectiveStatus" | "responsibleRole" | "claimedByUserId"
  >,
): string {
  const roleLabel = campaignTasksConfig.productionRoleLabels[linkedTask.responsibleRole];
  const unclaimed = !linkedTask.claimedByUserId;

  if (linkedTask.workflowState === "needs_revision") {
    if (unclaimed) {
      return `Task unclaimed and ready for ${roleLabel} role — needs revision after QA feedback.`;
    }
    return `Needs revision after QA fail — route to available ${roleLabel} staff.`;
  }

  if (linkedTask.workflowState === "unstarted" && linkedTask.effectiveStatus === "ready") {
    if (unclaimed) {
      return `Task unclaimed and ready for ${roleLabel} role.`;
    }
    return `Ready work — route to available ${roleLabel} staff.`;
  }

  if (linkedTask.workflowState === "in_progress") {
    if (unclaimed) {
      return `Stalled in progress — route to available ${roleLabel} staff.`;
    }
    return `Stalled in progress — reassign to refresh ownership in ${roleLabel} role.`;
  }

  return `Incorrect routing — reassign to capable ${roleLabel} role.`;
}

export function resolveAvailableOwnerActions(
  row: FileRoomExceptionRow,
): readonly OwnerConsoleActionDescriptor[] {
  const actions: OwnerConsoleActionDescriptor[] = [];

  if (row.promotion.showApprovalPanel) {
    if (row.promotion.canApprove) {
      actions.push({
        kind: "approve",
        label: campaignExceptionsConfig.promotionApproveLabel,
        irreversible: true,
      });
    }
    if (row.promotion.canHold) {
      actions.push({
        kind: "hold",
        label: campaignExceptionsConfig.promotionHoldLabel,
        irreversible: false,
      });
    }
    if (row.promotion.canDecline) {
      actions.push({
        kind: "decline",
        label: campaignExceptionsConfig.promotionDeclineLabel,
        irreversible: true,
      });
    }
  }

  if (row.permissions.canResolve) {
    actions.push({
      kind: "resolve",
      label: campaignExceptionsConfig.resolveLabel,
      irreversible: true,
    });
  }

  if (row.permissions.canAssign) {
    actions.push({
      kind: "assign",
      label: campaignExceptionsConfig.assignLabel,
      irreversible: false,
    });
  }

  return actions;
}

function waitingCardDedupKey(card: OwnerConsoleDecisionCard): string {
  return `${card.campaignId}:${card.row.taskId ?? ""}:${card.row.kind}`;
}

/** Collapse duplicate open exceptions — same campaign, linked task, and kind. */
export function dedupeOwnerConsoleWaitingCards(
  cards: readonly OwnerConsoleDecisionCard[],
): OwnerConsoleDecisionCard[] {
  const bestByKey = new Map<string, OwnerConsoleDecisionCard>();
  for (const card of cards) {
    const key = waitingCardDedupKey(card);
    const existing = bestByKey.get(key);
    if (!existing || card.updatedAt.localeCompare(existing.updatedAt) > 0) {
      bestByKey.set(key, card);
    }
  }
  return [...bestByKey.values()];
}

function visualQueueFingerprint(card: OwnerConsoleDecisionCard): string {
  return `${card.campaignName}\0${card.row.title}\0${card.row.kind}`;
}

function resolveQueueDifferentiator(
  card: OwnerConsoleDecisionCard,
  collisionCount: number,
): string {
  const parts: string[] = [];

  if (card.row.taskTitle) {
    parts.push(card.row.taskTitle);
  } else if (card.row.taskId) {
    parts.push(card.row.taskId);
  }

  parts.push(card.row.kindLabel);

  if (collisionCount > 1) {
    parts.push(`${card.campaignName} · ${card.campaignId.slice(-8)}`);
  } else if (card.businessLabel && card.businessLabel !== card.campaignName) {
    parts.push(card.businessLabel);
  }

  return parts.join(" · ");
}

function applyQueueDifferentiators(
  cards: OwnerConsoleDecisionCard[],
): OwnerConsoleDecisionCard[] {
  const fingerprintCounts = new Map<string, number>();
  for (const card of cards) {
    const fingerprint = visualQueueFingerprint(card);
    fingerprintCounts.set(fingerprint, (fingerprintCounts.get(fingerprint) ?? 0) + 1);
  }

  return cards.map((card) => ({
    ...card,
    queueDifferentiator: resolveQueueDifferentiator(
      card,
      fingerprintCounts.get(visualQueueFingerprint(card)) ?? 1,
    ),
  }));
}

function sortWaitingCards(cards: OwnerConsoleDecisionCard[]): OwnerConsoleDecisionCard[] {
  return sortWaitingCardsByUrgency(cards);
}

function toDecisionCard(
  record: CampaignExceptionRecord,
  row: FileRoomExceptionRow,
  listItem: ReturnType<typeof resolveFileRoomListItemView>,
  qaRecords: readonly QaRecord[] | undefined,
): OwnerConsoleDecisionCard {
  return {
    id: record.id,
    campaignId: listItem.campaignId,
    campaignName: listItem.campaignName,
    businessLabel: listItem.businessLabel,
    queueDifferentiator: "",
    updatedAt: record.updatedAt,
    ageLabel: formatAgeLabel(record.updatedAt),
    whatHappened: resolveWhatHappened(record, qaRecords),
    whyOwner: resolveWhyOwner(record),
    recommendedNextAction: resolveNextRequiredAction(record),
    impactIfNoAction: ownerConsoleImpactByKind[record.kind],
    whereWorkGoesAfter: ownerConsoleOutcomeByKind[record.kind],
    availableActions: resolveAvailableOwnerActions(row),
    row,
  };
}

export function resolveOwnerConsoleView(
  bundles: readonly OwnerConsoleCampaignBundle[],
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  assignCandidatesByCampaign: Readonly<
    Record<string, readonly ExceptionAssignCandidate[]>
  >,
): OwnerConsoleView {
  const waitingCards: OwnerConsoleDecisionCard[] = [];
  const campaignContexts: OwnerConsoleCampaignContext[] = [];

  for (const bundle of bundles) {
    const listItem = resolveFileRoomListItemView(bundle.envelope);

    const exceptionsView = resolveFileRoomExceptionsView(
      bundle.tasksEnvelope.exceptionRecords,
      bundle.tasksEnvelope.tasks,
      {
        user,
        assignments,
        materials: bundle.materials,
        events: bundle.tasksEnvelope.exceptionEvents,
      },
    );

    const operatorContext = resolveFileRoomExceptionOperatorContext(
      user,
      bundle.envelope.campaignId,
      assignments,
      assignCandidatesByCampaign[bundle.envelope.campaignId] ?? [],
    );

    campaignContexts.push({
      campaignId: listItem.campaignId,
      campaignName: listItem.campaignName,
      businessLabel: listItem.businessLabel,
      operatorContext,
    });

    const records = bundle.tasksEnvelope.exceptionRecords ?? [];
    for (const record of records) {
      if (!isOpenExceptionStatus(record.status)) continue;
      if (!resolveOwnerReviewRequired(record)) continue;

      const row = exceptionsView.rows.find((entry) => entry.id === record.id);
      if (!row) continue;

      waitingCards.push(
        toDecisionCard(record, row, listItem, bundle.tasksEnvelope.qaRecords),
      );
    }
  }

  const deduped = applyQueueDifferentiators(
    sortWaitingCards(dedupeOwnerConsoleWaitingCards(waitingCards)),
  );
  const campaignsWithWaiting = new Set(deduped.map((card) => card.campaignId));

  return {
    waitingOnOwner: deduped,
    waitingCount: deduped.length,
    campaignCount: campaignsWithWaiting.size,
    isEmpty: deduped.length === 0,
    campaigns: campaignContexts.filter((ctx) => campaignsWithWaiting.has(ctx.campaignId)),
  };
}

export function resolveAssignCandidatesByCampaign(
  bundles: readonly OwnerConsoleCampaignBundle[],
  assignments: CampaignAssignmentsFile,
  users: readonly StudioUser[],
): Record<string, readonly ExceptionAssignCandidate[]> {
  const map: Record<string, readonly ExceptionAssignCandidate[]> = {};
  for (const bundle of bundles) {
    map[bundle.envelope.campaignId] = resolveAssignCandidatesForException(
      bundle.envelope.campaignId,
      assignments,
      users,
    );
  }
  return map;
}

/** Exclude delivered campaigns with no owner-waiting items from aggregate load. */
export function shouldIncludeCampaignInOwnerConsoleAggregate(
  envelope: ServerCampaignEnvelope,
  hasWaitingOnOwner: boolean,
): boolean {
  if (hasWaitingOnOwner) return true;
  if (envelope.record.campaignStatus === "DELIVERED") return false;
  return false;
}
