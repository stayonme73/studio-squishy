"use client";

import { useMemo, type CSSProperties } from "react";

import {
  businessDiscoveryStudio,
  doneBadgePlateRect,
  sceneRectToCoverPercent,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";

type Props = {
  tileId: DiscoveryTileId;
  stageSize: { width: number; height: number };
};

/** Single ✓ badge anchored to native plate pixels for one discovery tile. */
export default function DiscoveryTileDoneBadge({ tileId, stageSize }: Props) {
  const style = useMemo((): CSSProperties => {
    const rect = doneBadgePlateRect(tileId);
    return sceneRectToCoverPercent(rect, stageSize, businessDiscoveryStudio.plateFraming);
  }, [tileId, stageSize]);

  return (
    <span
      className={[
        "bds-tile-done-badge",
        tileId === "submit-project" ? "bds-tile-done-badge--submit" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-tile-id={tileId}
      aria-hidden="true"
    >
      ✓
    </span>
  );
}
