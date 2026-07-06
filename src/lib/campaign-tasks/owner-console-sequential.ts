import type { OwnerConsoleScanView } from "@/lib/campaign-tasks/owner-console-scan-view";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import type { OwnerDeskItem } from "@/lib/job-control/owner-desk";
import type { OwnerControlRoomView } from "@/lib/job-control/control-room-view";

import type { OwnerConsoleView } from "./owner-console-view";

function isPromotableExceptionKind(kind: CampaignExceptionKind): boolean {
  return kind === "missing_client_fact" || kind === "client_request";
}

/** Locked responsibility map — tray storage model. */
export type OwnerConsoleTrayId =
  | "needs_my_decision"
  | "needs_my_approval"
  | "ready_to_release"
  | "needs_client"
  | "recently_handled";

export type OwnerConsoleSequentialItem = {
  id: string;
  trayId: OwnerConsoleTrayId;
  urgencyRank: number;
  campaignId: string;
  campaignName: string;
  title: string;
  subtitle: string;
  tabLabel: string;
  updatedAt: string;
  ageLabel: string;
  exceptionCard: OwnerConsoleDecisionCard | null;
  deskItem: OwnerDeskItem | null;
};

export type OwnerConsoleTraySummary = {
  id: OwnerConsoleTrayId;
  label: string;
  shortLabel: string;
  count: number;
  actionRequired: boolean;
  itemIds: readonly string[];
};

export type OwnerConsoleSequentialDeskView = {
  items: readonly OwnerConsoleSequentialItem[];
  trays: readonly OwnerConsoleTraySummary[];
  todaysDecisionCount: number;
  isEmpty: boolean;
  needsClientCount: number;
};

const TRAY_LABELS: Record<OwnerConsoleTrayId, string> = {
  needs_my_decision: "Needs My Decision",
  needs_my_approval: "Needs My Approval",
  ready_to_release: "Ready to Release",
  needs_client: "Needs Client",
  recently_handled: "Recently Handled",
};

export const OWNER_CONSOLE_TRAY_SHORT_LABELS: Record<OwnerConsoleTrayId, string> = {
  needs_my_decision: "🟠 Decisions",
  needs_my_approval: "🔵 Approvals",
  ready_to_release: "🟢 Ready to Release",
  needs_client: "🟡 Waiting on Client",
  recently_handled: "⚪ Completed Today",
};

const TRAY_TAB_LABELS: Record<OwnerConsoleTrayId, string> = {
  needs_my_decision: "Decision",
  needs_my_approval: "Approval",
  ready_to_release: "Release",
  needs_client: "Client",
  recently_handled: "Completed",
};

const APPROVAL_EXCEPTION_KINDS = new Set<CampaignExceptionKind>([
  "client_request",
  "missing_client_fact",
]);

const DECISION_EXCEPTION_KINDS = new Set<CampaignExceptionKind>([
  "compliance_hold",
  "direction_disagreement",
  "scope_change",
  "deadline_commitment",
  "deadline_risk",
  "revision_exhausted",
  "routine_internal",
]);

/** Lower rank = more urgent (responsibility map §7). */
export function resolveExceptionUrgencyRank(card: OwnerConsoleDecisionCard): number {
  const { kind, status } = card.row;

  if (status === "waiting_owner" && isPromotableExceptionKind(kind) && card.row.promotion.showApprovalPanel) {
    return 8;
  }

  if (APPROVAL_EXCEPTION_KINDS.has(kind)) {
    return 8;
  }

  switch (kind) {
    case "scope_change":
      return 5;
    case "revision_exhausted":
      return 6;
    case "deadline_commitment":
    case "deadline_risk":
      return 7;
    case "compliance_hold":
    case "direction_disagreement":
      return 9;
    case "routine_internal":
      return 10;
    default:
      return 9;
  }
}

export function resolveDeskUrgencyRank(item: OwnerDeskItem): number {
  switch (item.reason) {
    case "approval_before_delivery":
      return 2;
    case "approval_before_review":
      return 3;
    case "scope_issue":
      return 5;
    case "revision_limit_reached":
      return 6;
    case "deadline_exception":
    case "at_risk_job":
      return 7;
    case "heavy_lane_full":
      return 10;
    default:
      return 9;
  }
}

export function resolveTrayForException(card: OwnerConsoleDecisionCard): OwnerConsoleTrayId {
  const { kind } = card.row;
  if (APPROVAL_EXCEPTION_KINDS.has(kind) || isPromotableExceptionKind(kind)) {
    return "needs_my_approval";
  }
  if (DECISION_EXCEPTION_KINDS.has(kind)) {
    return "needs_my_decision";
  }
  return "needs_my_decision";
}

export function resolveTrayForDeskItem(item: OwnerDeskItem): OwnerConsoleTrayId {
  if (item.reason === "approval_before_delivery") return "ready_to_release";
  if (item.reason === "approval_before_review") return "needs_my_approval";
  return "needs_my_decision";
}

function deskItemFromCard(card: OwnerConsoleDecisionCard): OwnerConsoleSequentialItem {
  return {
    id: `exception:${card.id}`,
    trayId: resolveTrayForException(card),
    urgencyRank: resolveExceptionUrgencyRank(card),
    campaignId: card.campaignId,
    campaignName: card.campaignName,
    title: card.row.title,
    subtitle: card.row.kindLabel,
    tabLabel: TRAY_TAB_LABELS[resolveTrayForException(card)],
    updatedAt: card.updatedAt,
    ageLabel: card.ageLabel,
    exceptionCard: card,
    deskItem: null,
  };
}

function sequentialItemFromDesk(desk: OwnerDeskItem): OwnerConsoleSequentialItem {
  const trayId = resolveTrayForDeskItem(desk);
  return {
    id: desk.id,
    trayId,
    urgencyRank: resolveDeskUrgencyRank(desk),
    campaignId: desk.campaignId,
    campaignName: desk.campaignName,
    title: desk.title,
    subtitle: desk.reasonLabel,
    tabLabel: TRAY_TAB_LABELS[trayId],
    updatedAt: desk.updatedAt,
    ageLabel: "",
    exceptionCard: null,
    deskItem: desk,
  };
}

function sortSequentialItems(items: OwnerConsoleSequentialItem[]): OwnerConsoleSequentialItem[] {
  return [...items].sort((a, b) => {
    if (a.urgencyRank !== b.urgencyRank) return a.urgencyRank - b.urgencyRank;
    return a.updatedAt.localeCompare(b.updatedAt);
  });
}

function exceptionIdFromDeskItem(desk: OwnerDeskItem): string | null {
  if (!desk.id.startsWith("desk:exception:")) return null;
  return desk.id.slice("desk:exception:".length);
}

export function sortWaitingCardsByUrgency(
  cards: OwnerConsoleDecisionCard[],
): OwnerConsoleDecisionCard[] {
  return [...cards].sort((a, b) => {
    const rankA = resolveExceptionUrgencyRank(a);
    const rankB = resolveExceptionUrgencyRank(b);
    if (rankA !== rankB) return rankA - rankB;
    if (a.row.isAutoCreatedFromQa !== b.row.isAutoCreatedFromQa) {
      return a.row.isAutoCreatedFromQa ? -1 : 1;
    }
    return a.updatedAt.localeCompare(b.updatedAt);
  });
}

function buildTraySummaries(
  items: readonly OwnerConsoleSequentialItem[],
  scan: OwnerConsoleScanView,
): OwnerConsoleTraySummary[] {
  const actionTrayIds: OwnerConsoleTrayId[] = [
    "needs_my_decision",
    "needs_my_approval",
    "ready_to_release",
  ];

  const summaries: OwnerConsoleTraySummary[] = actionTrayIds.map((id) => {
    const trayItems = items.filter((entry) => entry.trayId === id);
    return {
      id,
      label: TRAY_LABELS[id],
      shortLabel: OWNER_CONSOLE_TRAY_SHORT_LABELS[id],
      count: trayItems.length,
      actionRequired: true,
      itemIds: trayItems.map((entry) => entry.id),
    };
  });

  const waitingClient = scan.buckets.find((bucket) => bucket.id === "waiting_client");
  summaries.push({
    id: "needs_client",
    label: TRAY_LABELS.needs_client,
    shortLabel: OWNER_CONSOLE_TRAY_SHORT_LABELS.needs_client,
    count: waitingClient?.items.length ?? 0,
    actionRequired: false,
    itemIds: [],
  });

  const recentlyResolved = scan.buckets.find((bucket) => bucket.id === "recently_resolved");
  summaries.push({
    id: "recently_handled",
    label: TRAY_LABELS.recently_handled,
    shortLabel: OWNER_CONSOLE_TRAY_SHORT_LABELS.recently_handled,
    count: recentlyResolved?.items.length ?? 0,
    actionRequired: false,
    itemIds: recentlyResolved?.items.map((entry) => entry.id) ?? [],
  });

  return summaries;
}

export function resolveOwnerConsoleSequentialDesk(
  view: OwnerConsoleView,
  controlRoom: OwnerControlRoomView,
  scan: OwnerConsoleScanView,
): OwnerConsoleSequentialDeskView {
  const exceptionIds = new Set(view.waitingOnOwner.map((card) => card.id));
  const items: OwnerConsoleSequentialItem[] = view.waitingOnOwner.map(deskItemFromCard);

  for (const desk of controlRoom.ownerDesk) {
    const linkedExceptionId = exceptionIdFromDeskItem(desk);
    if (linkedExceptionId && exceptionIds.has(linkedExceptionId)) continue;
    if (items.some((entry) => entry.id === desk.id)) continue;
    items.push(sequentialItemFromDesk(desk));
  }

  const sorted = sortSequentialItems(items);
  const needsClientCount =
    scan.buckets.find((bucket) => bucket.id === "waiting_client")?.items.length ?? 0;

  return {
    items: sorted,
    trays: buildTraySummaries(sorted, scan),
    todaysDecisionCount: sorted.length,
    isEmpty: sorted.length === 0,
    needsClientCount,
  };
}

export function resolveSequentialItemById(
  desk: OwnerConsoleSequentialDeskView,
  itemId: string | null,
): OwnerConsoleSequentialItem | null {
  if (!itemId) return desk.items[0] ?? null;
  return desk.items.find((entry) => entry.id === itemId) ?? desk.items[0] ?? null;
}
