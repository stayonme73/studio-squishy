import {
  formatPriorityAlert,
  kitchenBucketAlertLevel,
  kitchenExceptionTrayLabel,
  kitchenFileBucketLabel,
  kitchenFileBuckets,
  kitchenFolderSticker,
  kitchenShowReturnedToQueue,
  kitchenTrayAlertLevel,
  resolveFolderPlacement,
  type KitchenBucketAlertLevel,
  type KitchenExceptionTrayId,
  type KitchenFileBucketId,
  type KitchenFolderPlacement,
  type KitchenFolderSticker,
  type KitchenPriorityAlert,
} from "@/config/studio-kitchen-file-room";
import { kitchenCampaigns, type KitchenCampaign } from "@/config/studio-kitchen";

export type KitchenFolderView = KitchenCampaign & {
  placement: KitchenFolderPlacement;
  sticker: KitchenFolderSticker;
  showReturnedToQueue: boolean;
  queuePosition: number | null;
};

export type KitchenTraySlotView = {
  trayId: KitchenExceptionTrayId;
  label: string;
  homeBucketId: KitchenFileBucketId;
  folders: KitchenFolderView[];
  alertLevel: KitchenBucketAlertLevel;
};

export type KitchenBucketSlotView = {
  bucketId: KitchenFileBucketId;
  label: string;
  ownerAction: boolean;
  folders: KitchenFolderView[];
  tray: KitchenTraySlotView | null;
  alertLevel: KitchenBucketAlertLevel;
};

export type KitchenFileRoomView = {
  priorityAlerts: KitchenPriorityAlert[];
  buckets: KitchenBucketSlotView[];
  folders: KitchenFolderView[];
};

export function withKitchenFolder(campaign: KitchenCampaign): KitchenFolderView {
  const placement = resolveFolderPlacement(campaign);
  return {
    ...campaign,
    placement,
    sticker: kitchenFolderSticker(campaign),
    showReturnedToQueue: kitchenShowReturnedToQueue(campaign),
    queuePosition: placement.queueOrder,
  };
}

export function buildKitchenFileRoomView(
  campaigns: KitchenCampaign[] = kitchenCampaigns,
): KitchenFileRoomView {
  const folders = campaigns.map(withKitchenFolder);

  const bucketFolders = new Map<KitchenFileBucketId, KitchenFolderView[]>();
  const trayFolders = new Map<KitchenExceptionTrayId, KitchenFolderView[]>();

  for (const id of kitchenFileBuckets.map((b) => b.id)) {
    bucketFolders.set(id, []);
  }

  for (const folder of folders) {
    if (folder.placement.folderLocation === "tray" && folder.placement.trayId) {
      const list = trayFolders.get(folder.placement.trayId) ?? [];
      list.push(folder);
      trayFolders.set(folder.placement.trayId, list);
      continue;
    }

    const list = bucketFolders.get(folder.placement.homeBucketId) ?? [];
    list.push(folder);
    bucketFolders.set(folder.placement.homeBucketId, list);
  }

  const buckets: KitchenBucketSlotView[] = kitchenFileBuckets.map((def) => {
    const queued = [...(bucketFolders.get(def.id) ?? [])]
      .sort((a, b) => (a.placement.queueOrder ?? 999) - (b.placement.queueOrder ?? 999))
      .map((folder, index) => ({
        ...folder,
        queuePosition: index + 1,
      }));

    const hasOverdue = queued.some((f) => f.priority === "Overdue");

    let tray: KitchenTraySlotView | null = null;
    if (def.trayId) {
      const trayList = (trayFolders.get(def.trayId) ?? []).filter(
        (folder) => folder.placement.homeBucketId === def.id,
      );
      tray = {
        trayId: def.trayId,
        label: def.trayLabel ?? kitchenExceptionTrayLabel(def.trayId),
        homeBucketId: def.id,
        folders: trayList,
        alertLevel: kitchenTrayAlertLevel(trayList.length),
      };
    }

    return {
      bucketId: def.id,
      label: def.label,
      ownerAction: def.ownerAction,
      folders: queued,
      tray,
      alertLevel: kitchenBucketAlertLevel(def.id, queued.length, hasOverdue),
    };
  });

  return {
    priorityAlerts: buildKitchenPriorityAlerts(buckets),
    buckets,
    folders,
  };
}

export function buildKitchenPriorityAlerts(buckets: KitchenBucketSlotView[]): KitchenPriorityAlert[] {
  const alerts: KitchenPriorityAlert[] = [];

  const needsConcepts = buckets.find((b) => b.bucketId === "needs-concepts");
  const ownerConcepts = needsConcepts?.folders.filter((f) => f.waitingOn !== "ChatGPT") ?? [];
  if (ownerConcepts.length > 0) {
    alerts.push({
      id: "needs-concepts",
      message: formatPriorityAlert(
        ownerConcepts.length,
        "Campaign Need Concepts",
        "Campaigns Need Concepts",
      ),
      level: needsConcepts?.alertLevel ?? "orange",
      bucketId: "needs-concepts",
    });
  }

  const productionReady = buckets.find((b) => b.bucketId === "production-ready");
  if (productionReady && productionReady.folders.length > 0) {
    alerts.push({
      id: "production-ready",
      message: formatPriorityAlert(
        productionReady.folders.length,
        "Campaign Production Ready",
        "Campaigns Production Ready",
      ),
      level: productionReady.alertLevel,
      bucketId: "production-ready",
    });
  }

  const ownerReview = buckets.find((b) => b.bucketId === "owner-review");
  if (ownerReview && ownerReview.folders.length > 0) {
    alerts.push({
      id: "owner-review",
      message: formatPriorityAlert(
        ownerReview.folders.length,
        "Campaign Needs Owner Review",
        "Campaigns Need Owner Review",
      ),
      level: ownerReview.alertLevel,
      bucketId: "owner-review",
    });
  }

  const finalDelivery = buckets.find((b) => b.bucketId === "final-delivery");
  if (finalDelivery && finalDelivery.folders.length > 0) {
    alerts.push({
      id: "final-delivery",
      message: formatPriorityAlert(
        finalDelivery.folders.length,
        "Final Delivery Ready",
        "Final Deliveries Ready",
      ),
      level: finalDelivery.alertLevel,
      bucketId: "final-delivery",
    });
  }

  let clientDelayedCount = 0;
  for (const bucket of buckets) {
    if (bucket.tray?.trayId === "client-delayed") {
      clientDelayedCount += bucket.tray.folders.length;
    }
  }
  if (clientDelayedCount > 0) {
    alerts.push({
      id: "client-delayed",
      message: formatPriorityAlert(clientDelayedCount, "Client Delayed", "Client Delayed"),
      level: kitchenTrayAlertLevel(clientDelayedCount),
      trayId: "client-delayed",
    });
  }

  const traysWithFolders = buckets
    .map((b) => b.tray)
    .filter((t): t is KitchenTraySlotView => t !== null && t.folders.length > 0 && t.trayId !== "client-delayed");

  for (const tray of traysWithFolders) {
    alerts.push({
      id: tray.trayId,
      message: formatPriorityAlert(
        tray.folders.length,
        `${tray.label} Issue`,
        `${tray.label} Issues`,
      ),
      level: tray.alertLevel,
      trayId: tray.trayId,
    });
  }

  return alerts;
}

export function getKitchenFolder(campaignId: string): KitchenFolderView | null {
  const campaign = kitchenCampaigns.find((c) => c.id === campaignId);
  return campaign ? withKitchenFolder(campaign) : null;
}
