"use client";

import { kitchenDataSourceLabel } from "@/lib/studio-kitchen";
import type { KitchenLiveFolderSlot } from "@/lib/studio-kitchen";

type Props = {
  folder: KitchenLiveFolderSlot;
  queuePosition?: number | null;
  onOpen: (campaignId: string) => void;
};

export default function StudioKitchenLiveFolderCard({
  folder,
  queuePosition,
  onOpen,
}: Props) {
  const position = queuePosition ?? folder.queuePosition;

  return (
    <button
      type="button"
      className={`sk-folder sk-folder--${folder.sticker}`}
      data-sticker={folder.sticker}
      data-kitchen-source={folder.source}
      onClick={() => onOpen(folder.campaignId)}
    >
      {position ? (
        <span className="sk-folder__queue" aria-label={`Queue position ${position}`}>
          {position}
        </span>
      ) : null}

      <span className="sk-folder__tab">
        <span className="sk-folder__number">{folder.source === "fixture_demo" ? "DEMO" : "LIVE"}</span>
        <span className="sk-folder__client">{folder.clientLabel}</span>
        <span className="sk-folder__campaign">{folder.campaignName}</span>
        <span className="sk-folder__campaign" style={{ fontSize: "0.7rem", opacity: 0.8 }}>
          {kitchenDataSourceLabel(folder.source)}
        </span>
      </span>

      <span className={`sk-folder__sticker sk-folder__sticker--${folder.sticker}`} aria-hidden="true" />
    </button>
  );
}
