"use client";

import { useMemo, type CSSProperties } from "react";

import {
  plateRectToOverlayPercent,
  tileStatusCoverRects,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";

type Props = {
  tileId: DiscoveryTileId;
};

/** Hides the baked bottom status circle when a discovery tile is complete. */
export default function DiscoveryTileStatusCover({ tileId }: Props) {
  const style = useMemo(
    (): CSSProperties => plateRectToOverlayPercent(tileStatusCoverRects[tileId]),
    [tileId],
  );

  return (
    <span
      className="bds-tile-status-cover"
      style={style}
      data-tile-id={tileId}
      aria-hidden="true"
    />
  );
}
