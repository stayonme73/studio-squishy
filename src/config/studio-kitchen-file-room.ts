/**
 * Studio Kitchen V4 — file room model.
 * Campaign folder lives in exactly one bucket OR one exception tray.
 * Queue re-entry: folders returning from a tray join at the back of the home bucket queue.
 */

import {
  kitchenIsClientDelayed,
  type KitchenCampaign,
  type KitchenTimestamp,
} from "@/config/studio-kitchen";

export const KITCHEN_FILE_BUCKET_IDS = [
  "intake-received",
  "needs-concepts",
  "waiting-on-client",
  "ready-for-production",
  "in-production",
  "owner-review",
  "waiting-on-client-review",
  "revision-queue",
  "final-delivery-ready",
] as const;

export type KitchenFileBucketId = (typeof KITCHEN_FILE_BUCKET_IDS)[number];

export const KITCHEN_EXCEPTION_TRAY_IDS = [
  "client-delayed",
  "missing-information",
  "review-problem",
  "delivery-issue",
] as const;

export type KitchenExceptionTrayId = (typeof KITCHEN_EXCEPTION_TRAY_IDS)[number];

export type KitchenFolderSticker = "active" | "waiting" | "delayed";

export type KitchenBucketAlertLevel = "green" | "yellow" | "orange" | "red";

export type KitchenFileBucketDefinition = {
  id: KitchenFileBucketId;
  label: string;
  ownerAction: boolean;
  trayId?: KitchenExceptionTrayId;
  trayLabel?: string;
};

export type KitchenExceptionTrayDefinition = {
  id: KitchenExceptionTrayId;
  label: string;
  homeBucketId: KitchenFileBucketId;
};

export const kitchenFileBuckets: KitchenFileBucketDefinition[] = [
  { id: "intake-received", label: "Intake Received", ownerAction: false },
  {
    id: "needs-concepts",
    label: "Needs Concepts",
    ownerAction: true,
  },
  {
    id: "waiting-on-client",
    label: "Waiting On Client",
    ownerAction: false,
    trayId: "client-delayed",
    trayLabel: "Client Delayed",
  },
  {
    id: "ready-for-production",
    label: "Ready For Production",
    ownerAction: true,
    trayId: "missing-information",
    trayLabel: "Missing Information",
  },
  {
    id: "in-production",
    label: "In Production",
    ownerAction: false,
  },
  {
    id: "owner-review",
    label: "Owner Review",
    ownerAction: true,
    trayId: "review-problem",
    trayLabel: "Review Problem",
  },
  {
    id: "waiting-on-client-review",
    label: "Waiting On Client Review",
    ownerAction: false,
    trayId: "client-delayed",
    trayLabel: "Client Delayed",
  },
  {
    id: "revision-queue",
    label: "Revision Queue",
    ownerAction: true,
  },
  {
    id: "final-delivery-ready",
    label: "Final Delivery Ready",
    ownerAction: true,
    trayId: "delivery-issue",
    trayLabel: "Delivery Issue",
  },
];

export const kitchenExceptionTrays: KitchenExceptionTrayDefinition[] = [
  { id: "client-delayed", label: "Client Delayed", homeBucketId: "waiting-on-client" },
  { id: "missing-information", label: "Missing Information", homeBucketId: "ready-for-production" },
  { id: "review-problem", label: "Review Problem", homeBucketId: "owner-review" },
  { id: "delivery-issue", label: "Delivery Issue", homeBucketId: "final-delivery-ready" },
];

const bucketById = new Map(kitchenFileBuckets.map((bucket) => [bucket.id, bucket]));
const trayById = new Map(kitchenExceptionTrays.map((tray) => [tray.id, tray]));

export type KitchenFolderPlacement = {
  folderLocation: "bucket" | "tray";
  homeBucketId: KitchenFileBucketId;
  queueOrder: number | null;
  trayId: KitchenExceptionTrayId | null;
};

export function kitchenFileBucketLabel(bucketId: KitchenFileBucketId): string {
  return bucketById.get(bucketId)?.label ?? bucketId;
}

export function kitchenExceptionTrayLabel(trayId: KitchenExceptionTrayId): string {
  return trayById.get(trayId)?.label ?? trayId;
}

export function kitchenFolderSticker(campaign: KitchenCampaign): KitchenFolderSticker {
  if (campaign.folderLocation === "tray" || kitchenIsClientDelayed(campaign)) return "delayed";
  if (campaign.waitingOn === "Client" || campaign.priority === "Waiting") return "waiting";
  return "active";
}

export function kitchenShowReturnedToQueue(campaign: KitchenCampaign): boolean {
  return Boolean(campaign.returnedToQueueAt);
}

/** Map workflow stage to the campaign's home bucket when in active queue. */
export function resolveHomeBucket(campaign: KitchenCampaign): KitchenFileBucketId {
  switch (campaign.currentStageId) {
    case "new-campaign":
      return "intake-received";
    case "needs-directions":
      return "needs-concepts";
    case "waiting-on-client":
      return "waiting-on-client";
    case "ready-for-production":
      return "ready-for-production";
    case "in-production":
      return "in-production";
    case "owner-review":
      return "owner-review";
    case "ready-for-client-review":
      return "waiting-on-client-review";
    case "revision-requests":
      return "revision-queue";
    case "final-delivery":
      return "final-delivery-ready";
    default:
      return "owner-review";
  }
}

/** Infer tray placement from campaign state when seed does not set folderLocation explicitly. */
export function inferExceptionTray(campaign: KitchenCampaign): KitchenExceptionTrayId | null {
  if (campaign.trayId) return campaign.trayId;

  const home = resolveHomeBucket(campaign);

  if (
    (home === "waiting-on-client" || home === "waiting-on-client-review") &&
    kitchenIsClientDelayed(campaign)
  ) {
    return "client-delayed";
  }

  if (home === "ready-for-production" && campaign.alerts?.waitingOnOwner && campaign.waitingOn === "Campaign Brief") {
    return "missing-information";
  }

  if (home === "owner-review" && campaign.priority === "Overdue") {
    return "review-problem";
  }

  return null;
}

export function resolveFolderPlacement(campaign: KitchenCampaign): KitchenFolderPlacement {
  const homeBucketId = campaign.homeBucketId ?? resolveHomeBucket(campaign);

  if (campaign.folderLocation === "tray") {
    const trayId = campaign.trayId ?? inferExceptionTray(campaign) ?? "client-delayed";
    const tray = trayById.get(trayId);
    return {
      folderLocation: "tray",
      homeBucketId: tray?.homeBucketId ?? homeBucketId,
      queueOrder: null,
      trayId,
    };
  }

  if (campaign.folderLocation === "bucket") {
    return {
      folderLocation: "bucket",
      homeBucketId,
      queueOrder: campaign.queueOrder ?? null,
      trayId: null,
    };
  }

  const inferredTray = inferExceptionTray(campaign);
  if (inferredTray) {
    const tray = trayById.get(inferredTray);
    return {
      folderLocation: "tray",
      homeBucketId: tray?.homeBucketId ?? homeBucketId,
      queueOrder: null,
      trayId: inferredTray,
    };
  }

  return {
    folderLocation: "bucket",
    homeBucketId,
    queueOrder: campaign.queueOrder ?? null,
    trayId: null,
  };
}

/**
 * Sort active bucket queue — lower queueOrder = front.
 * Folders returning from a tray must have the highest queueOrder (back of line).
 */
export function sortBucketQueue<T extends { queueOrder: number | null }>(folders: T[]): T[] {
  return [...folders].sort((a, b) => {
    const orderA = a.queueOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.queueOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}

/**
 * Re-enter a folder at the back of its home bucket queue after leaving an exception tray.
 * Original queue position is never restored.
 */
export function reenterFolderAtQueueBack(
  campaign: KitchenCampaign,
  activeQueue: KitchenCampaign[],
): KitchenCampaign {
  const homeBucketId = campaign.homeBucketId ?? resolveHomeBucket(campaign);
  const maxOrder = activeQueue.reduce((max, folder) => {
    if (folder.homeBucketId !== homeBucketId && resolveHomeBucket(folder) !== homeBucketId) return max;
    return Math.max(max, folder.queueOrder ?? 0);
  }, 0);

  return {
    ...campaign,
    folderLocation: "bucket",
    trayId: undefined,
    homeBucketId,
    queueOrder: maxOrder + 1,
    returnedToQueueAt: campaign.returnedToQueueAt ?? { date: "June 21, 2026", time: "Now" },
  };
}

export function kitchenBucketAlertLevel(
  bucketId: KitchenFileBucketId,
  folderCount: number,
  hasOverdue: boolean,
): KitchenBucketAlertLevel {
  const bucket = bucketById.get(bucketId);
  if (!bucket) return "green";
  if (folderCount === 0) return "green";
  if (hasOverdue) return "red";
  if (bucket.ownerAction) {
    if (folderCount >= 3) return "orange";
    return "orange";
  }
  if (folderCount >= 4) return "yellow";
  return "green";
}

export function kitchenTrayAlertLevel(trayCount: number): KitchenBucketAlertLevel {
  if (trayCount === 0) return "green";
  if (trayCount >= 3) return "red";
  return "orange";
}

export type KitchenPriorityAlert = {
  id: string;
  message: string;
  level: KitchenBucketAlertLevel;
  bucketId?: KitchenFileBucketId;
  trayId?: KitchenExceptionTrayId;
};

export function formatPriorityAlert(count: number, singular: string, plural: string): string {
  const noun = count === 1 ? singular : plural;
  return `🚨 ${count} ${noun}`;
}
