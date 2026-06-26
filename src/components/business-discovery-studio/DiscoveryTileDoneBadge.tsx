"use client";

import { useMemo, type CSSProperties } from "react";

import {
  doneBadgePlateRect,
  sceneRectToPercent,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";

type Props = {
  tileId: DiscoveryTileId;
};

/** Single ✓ badge anchored to native plate pixels for one discovery tile. */
export default function DiscoveryTileDoneBadge({ tileId }: Props) {
  const style = useMemo((): CSSProperties => sceneRectToPercent(doneBadgePlateRect(tileId)), [tileId]);

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
