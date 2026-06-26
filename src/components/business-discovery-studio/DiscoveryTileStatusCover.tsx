"use client";

import { useMemo, type CSSProperties } from "react";

import {
  businessDiscoveryStudio,
  sceneRectToCoverPercent,
  tileStatusCoverRects,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";

type Props = {
  tileId: DiscoveryTileId;
  stageSize: { width: number; height: number };
};

/** Hides the baked bottom status circle when a discovery tile is complete. */
export default function DiscoveryTileStatusCover({ tileId, stageSize }: Props) {
  const style = useMemo((): CSSProperties => {
    const rect = tileStatusCoverRects[tileId];
    return sceneRectToCoverPercent(rect, stageSize, businessDiscoveryStudio.plateFraming);
  }, [tileId, stageSize]);

  return (
    <span
      className="bds-tile-status-cover"
      style={style}
      data-tile-id={tileId}
      aria-hidden="true"
    />
  );
}
