import {
  ownerConsole,
  ownerConsoleCampaignRoute,
  OWNER_CONSOLE_RECENTLY_RESOLVED_DAYS,
  OWNER_CONSOLE_RECENTLY_RESOLVED_MAX,
} from "@/config/owner-console";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { isOpenExceptionStatus } from "./exceptions";
import {
  isPromotedAwaitingClient,
  resolveOwnerReviewRequired,
} from "./exceptions-view";
import { isTaskWorkflowBlocked } from "./office-task-controls";
import type { OwnerConsoleCampaignBundle } from "./owner-console-view";
import { resolveFileRoomProductionTasksView } from "./tasks-view";
import type { CampaignExceptionRecord } from "./exceptions-types";

export type OwnerConsoleScanBucketId =
  | "blocked"
  | "waiting_client"
  | "waiting_internal"
  | "ready_to_move"
  | "recently_resolved";

export type OwnerConsoleScanItem = {
  id: string;
  campaignId: string;
  campaignName: string;
  title: string;
  subtitle: string;
  drillDownHref: string | null;
};

export type OwnerConsoleScanBucket = {
  id: OwnerConsoleScanBucketId;
  title: string;
  description: string;
  items: readonly OwnerConsoleScanItem[];
  isEmpty: boolean;
};

export type OwnerConsoleScanView = {
  buckets: readonly OwnerConsoleScanBucket[];
  totalItems: number;
};

const BUCKET_ORDER: readonly OwnerConsoleScanBucketId[] = [
  "blocked",
  "waiting_client",
  "waiting_internal",
  "ready_to_move",
  "recently_resolved",
];

function bucketMeta(id: OwnerConsoleScanBucketId): Pick<OwnerConsoleScanBucket, "title" | "description"> {
  return ownerConsole.scanBuckets[id];
}

function openExceptionsByTaskId(
  records: readonly CampaignExceptionRecord[] | undefined,
): ReadonlyMap<string, CampaignExceptionRecord[]> {
  const map = new Map<string, CampaignExceptionRecord[]>();
  for (const record of records ?? []) {
    if (!isOpenExceptionStatus(record.status) || !record.taskId) continue;
    const list = map.get(record.taskId) ?? [];
    list.push(record);
    map.set(record.taskId, list);
  }
  return map;
}

function isRecentlyResolved(record: CampaignExceptionRecord, nowMs: number): boolean {
  if (!record.resolvedAt) return false;
  const resolvedMs = new Date(record.resolvedAt).getTime();
  if (Number.isNaN(resolvedMs)) return false;
  const windowMs = OWNER_CONSOLE_RECENTLY_RESOLVED_DAYS * 24 * 60 * 60 * 1000;
  return nowMs - resolvedMs <= windowMs;
}

function sortScanItems(items: OwnerConsoleScanItem[]): OwnerConsoleScanItem[] {
  return items.sort((a, b) => {
    const campaign = a.campaignName.localeCompare(b.campaignName);
    if (campaign !== 0) return campaign;
    return a.title.localeCompare(b.title);
  });
}

export function resolveOwnerConsoleScanView(
  bundles: readonly OwnerConsoleCampaignBundle[],
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
  waitingOwnerExceptionIds: ReadonlySet<string>,
): OwnerConsoleScanView {
  const nowMs = Date.now();
  const bucketItems: Record<OwnerConsoleScanBucketId, OwnerConsoleScanItem[]> = {
    blocked: [],
    waiting_client: [],
    waiting_internal: [],
    ready_to_move: [],
    recently_resolved: [],
  };

  for (const bundle of bundles) {
    const listItem = resolveFileRoomListItemView(bundle.envelope);
    const records = bundle.tasksEnvelope.exceptionRecords ?? [];
    const openByTask = openExceptionsByTaskId(records);
    const productionTasks = resolveFileRoomProductionTasksView(bundle.tasksEnvelope, {
      user,
      assignments,
    });

    for (const row of productionTasks.tasks) {
      if (!isTaskWorkflowBlocked(row)) continue;

      const openOnTask = openByTask.get(row.id) ?? [];
      const hasOwnerWaiting = openOnTask.some(
        (entry) =>
          waitingOwnerExceptionIds.has(entry.id) || resolveOwnerReviewRequired(entry),
      );
      if (hasOwnerWaiting) continue;

      if (openOnTask.some((entry) => entry.status === "waiting_internal")) continue;

      bucketItems.blocked.push({
        id: `blocked:${bundle.envelope.campaignId}:${row.id}`,
        campaignId: listItem.campaignId,
        campaignName: listItem.campaignName,
        title: row.title,
        subtitle: row.blockedReason ?? row.statusLabel,
        drillDownHref: ownerConsoleCampaignRoute(listItem.campaignId),
      });
    }

    for (const record of records) {
      if (!isOpenExceptionStatus(record.status)) continue;

      if (record.status === "waiting_internal") {
        bucketItems.waiting_internal.push({
          id: `internal:${record.id}`,
          campaignId: listItem.campaignId,
          campaignName: listItem.campaignName,
          title: record.title,
          subtitle: record.assignedToDisplayName
            ? `Assigned to ${record.assignedToDisplayName}`
            : "Internal review",
          drillDownHref: ownerConsoleCampaignRoute(listItem.campaignId, record.id),
        });
        continue;
      }

      if (
        record.status === "waiting_client" ||
        isPromotedAwaitingClient(record)
      ) {
        bucketItems.waiting_client.push({
          id: `client:${record.id}`,
          campaignId: listItem.campaignId,
          campaignName: listItem.campaignName,
          title: record.title,
          subtitle: "Waiting on client response",
          drillDownHref: ownerConsoleCampaignRoute(listItem.campaignId, record.id),
        });
      }
    }

    for (const item of bundle.materials ?? []) {
      if (!isBlockingMaterialItem(item)) continue;
      if (item.sourceExceptionId) {
        const linked = records.find((entry) => entry.id === item.sourceExceptionId);
        if (linked && isOpenExceptionStatus(linked.status)) continue;
      }

      bucketItems.waiting_client.push({
        id: `material:${item.id}`,
        campaignId: listItem.campaignId,
        campaignName: listItem.campaignName,
        title: item.label,
        subtitle: "Blocking material — client action needed",
        drillDownHref: ownerConsoleCampaignRoute(listItem.campaignId),
      });
    }

    for (const row of productionTasks.tasks) {
      if (isTaskWorkflowBlocked(row)) continue;

      const openOnTask = openByTask.get(row.id) ?? [];
      if (openOnTask.some((entry) => isOpenExceptionStatus(entry.status))) continue;

      const readyToMove =
        (row.effectiveStatus === "ready" && row.workflowState === "unstarted") ||
        row.workflowState === "ready_for_qa";

      if (!readyToMove) continue;

      bucketItems.ready_to_move.push({
        id: `ready:${bundle.envelope.campaignId}:${row.id}`,
        campaignId: listItem.campaignId,
        campaignName: listItem.campaignName,
        title: row.title,
        subtitle: row.statusLabel,
        drillDownHref: ownerConsoleCampaignRoute(listItem.campaignId),
      });
    }

    const resolvedRecent = records
      .filter((entry) => !isOpenExceptionStatus(entry.status) && isRecentlyResolved(entry, nowMs))
      .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))
      .slice(0, OWNER_CONSOLE_RECENTLY_RESOLVED_MAX);

    for (const record of resolvedRecent) {
      bucketItems.recently_resolved.push({
        id: `resolved:${record.id}`,
        campaignId: listItem.campaignId,
        campaignName: listItem.campaignName,
        title: record.title,
        subtitle: record.resolvedAt
          ? `Resolved ${new Date(record.resolvedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`
          : "Resolved",
        drillDownHref: ownerConsoleCampaignRoute(listItem.campaignId, record.id),
      });
    }
  }

  const buckets: OwnerConsoleScanBucket[] = BUCKET_ORDER.map((id) => {
    const items = sortScanItems(bucketItems[id]);
    return {
      id,
      ...bucketMeta(id),
      items,
      isEmpty: items.length === 0,
    };
  });

  return {
    buckets,
    totalItems: buckets.reduce((sum, bucket) => sum + bucket.items.length, 0),
  };
}

/** Dedupe material scan rows when the same item appears via exception link. */
export function dedupeScanItems(items: readonly OwnerConsoleScanItem[]): OwnerConsoleScanItem[] {
  const seen = new Set<string>();
  const result: OwnerConsoleScanItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

export function resolveWaitingOwnerExceptionIds(
  waitingCards: readonly { id: string }[],
): ReadonlySet<string> {
  return new Set(waitingCards.map((card) => card.id));
}
