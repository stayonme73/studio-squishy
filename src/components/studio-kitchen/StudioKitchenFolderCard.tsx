"use client";

import { studioKitchen } from "@/config/studio-kitchen";
import type { KitchenFolderView } from "@/lib/studio-kitchen-file-room-view";

type Props = {
  folder: KitchenFolderView;
  queuePosition?: number | null;
  onOpen: (campaignId: string) => void;
};

export default function StudioKitchenFolderCard({ folder, queuePosition, onOpen }: Props) {
  const { fileRoom } = studioKitchen;
  const position = queuePosition ?? folder.queuePosition;

  return (
    <button
      type="button"
      className={`sk-folder sk-folder--${folder.sticker}`}
      data-sticker={folder.sticker}
      onClick={() => onOpen(folder.id)}
    >
      {position ? (
        <span className="sk-folder__queue" aria-label={`Queue position ${position}`}>
          {position}
        </span>
      ) : null}

      <span className="sk-folder__tab">
        <span className="sk-folder__number">{folder.folderNumber}</span>
        <span className="sk-folder__client">{folder.clientName}</span>
        <span className="sk-folder__campaign">{folder.campaignName}</span>
      </span>

      <span className={`sk-folder__sticker sk-folder__sticker--${folder.sticker}`} aria-hidden="true" />

      {folder.showReturnedToQueue ? (
        <span className="sk-folder__returned">{fileRoom.returnedToQueueLabel}</span>
      ) : null}
    </button>
  );
}
