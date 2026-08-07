import {
  kitchenBucketAlertLevel,
  kitchenExceptionTrayLabel,
  kitchenFileBuckets,
  kitchenTrayAlertLevel,
  type KitchenBucketAlertLevel,
  type KitchenExceptionTrayId,
  type KitchenFileBucketId,
} from "@/config/studio-kitchen-file-room";

import type { KitchenProductionFolder, KitchenProjectionBoard } from "./types";

export type KitchenLiveFolderSlot = KitchenProductionFolder & {
  sticker: "active" | "waiting" | "delayed";
  queuePosition: number | null;
};

export type KitchenLiveTraySlotView = {
  trayId: KitchenExceptionTrayId;
  label: string;
  homeBucketId: KitchenFileBucketId;
  folders: KitchenLiveFolderSlot[];
  alertLevel: KitchenBucketAlertLevel;
};

export type KitchenLiveBucketSlotView = {
  bucketId: KitchenFileBucketId;
  label: string;
  ownerAction: boolean;
  folders: KitchenLiveFolderSlot[];
  tray: KitchenLiveTraySlotView | null;
  alertLevel: KitchenBucketAlertLevel;
};

export type KitchenLiveFileRoomView = {
  board: KitchenProjectionBoard;
  buckets: KitchenLiveBucketSlotView[];
  folders: KitchenLiveFolderSlot[];
};

function stickerFor(folder: KitchenProductionFolder): KitchenLiveFolderSlot["sticker"] {
  if (folder.placement.folderLocation === "tray") return "delayed";
  if (folder.waitingOnLabel === "Client" || folder.waitingOnLabel === "Client materials") {
    return "waiting";
  }
  return "active";
}

export function buildKitchenLiveFileRoomView(
  board: KitchenProjectionBoard,
): KitchenLiveFileRoomView {
  const folders: KitchenLiveFolderSlot[] = board.folders.map((folder) => ({
    ...folder,
    sticker: stickerFor(folder),
    queuePosition: null,
  }));

  const bucketFolders = new Map<KitchenFileBucketId, KitchenLiveFolderSlot[]>();
  const trayFolders = new Map<KitchenExceptionTrayId, KitchenLiveFolderSlot[]>();

  for (const id of kitchenFileBuckets.map((bucket) => bucket.id)) {
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

  const buckets: KitchenLiveBucketSlotView[] = kitchenFileBuckets.map((def) => {
    const queued = [...(bucketFolders.get(def.id) ?? [])].map((folder, index) => ({
      ...folder,
      queuePosition: index + 1,
    }));

    let tray: KitchenLiveTraySlotView | null = null;
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
      alertLevel: kitchenBucketAlertLevel(def.id, queued.length, false),
    };
  });

  return { board, buckets, folders };
}
