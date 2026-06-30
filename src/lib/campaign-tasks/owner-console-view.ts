import {
  campaignExceptionsConfig,
  exceptionKindRequiresOwner,
} from "@/config/campaign-exceptions";
import {
  ownerConsole,
  ownerConsoleImpactByKind,
  ownerConsoleOutcomeByKind,
} from "@/config/owner-console";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
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
import type { CampaignExceptionRecord } from "./exceptions-types";
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
  updatedAt: string;
  ageLabel: string;
  whatHappened: string;
  whyOwner: string;
  recommendedNextAction: string;
  impactIfNoAction: string;
  whereWorkGoesAfter: string;
  availableActions: readonly OwnerConsoleActionDescriptor[];
  row: FileRoomExceptionRow;
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

function sortWaitingCards(cards: OwnerConsoleDecisionCard[]): OwnerConsoleDecisionCard[] {
  return cards.sort((a, b) => {
    if (a.row.isAutoCreatedFromQa !== b.row.isAutoCreatedFromQa) {
      return a.row.isAutoCreatedFromQa ? -1 : 1;
    }
    if (a.row.status === "waiting_owner" && b.row.status !== "waiting_owner") return -1;
    if (b.row.status === "waiting_owner" && a.row.status !== "waiting_owner") return 1;

    const aPromotablePending =
      isPromotableExceptionRow(a.row.kind) && !a.row.promotion.showPromotedSummary;
    const bPromotablePending =
      isPromotableExceptionRow(b.row.kind) && !b.row.promotion.showPromotedSummary;
    if (aPromotablePending !== bPromotablePending) {
      return aPromotablePending ? -1 : 1;
    }

    return a.updatedAt.localeCompare(b.updatedAt);
  });
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

  const sorted = sortWaitingCards(waitingCards);
  const campaignsWithWaiting = new Set(sorted.map((card) => card.campaignId));

  return {
    waitingOnOwner: sorted,
    waitingCount: sorted.length,
    campaignCount: campaignsWithWaiting.size,
    isEmpty: sorted.length === 0,
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
