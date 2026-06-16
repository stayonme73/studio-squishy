/**
 * Art Tower — layer + rotation config (Phase 2).
 *
 * V2 static plate — tower removed; welcome pillar baked into art (dormant).
 * Set TOWER_ROTATION_ENABLED = true and wire ArtTowerLayer into the scene
 * when Phase 2 interactive tower ships.
 *
 * @see src/components/entrance/dormant/ArtTowerLayer.tsx
 * @see src/hooks/useArtTowerRotation.ts
 * @see src/components/entrance/v3/ShowroomTower.tsx (V3 showroom dial — Studio Guide path)
 * @see src/components/entrance/ArtPrism.tsx (legacy 4-face CSS 3D prism)
 */

import type { SceneRect } from "@/config/welcome-hall-scene";
import { welcomeHallScene } from "@/config/welcome-hall-scene";

/** Phase 2 gate — V1 static plate keeps tower environmental only. */
export const TOWER_ROTATION_ENABLED = false as const;

export type ArtTowerSegmentId = "spark" | "momentum" | "growth" | "impact";

export type ArtTowerSegment = {
  id: ArtTowerSegmentId;
  label: string;
  /** Native pixel rect on plate v29 (1024×683). Top → bottom stack. */
  layer: SceneRect;
};

/** Plate v29 — welcome pillar column (tower removed; bounds for dormant artPrism zone). */
const PLATE = welcomeHallScene.nativeSize;

/** Welcome pillar — native pixels, plate v29 (was Art Tower on v28). */
export const artTowerBounds: SceneRect = {
  x: 588,
  y: 72,
  width: 132,
  height: 478,
};

const segmentHeight = Math.floor(artTowerBounds.height / 4);

/** Layer stack — spark (top) through impact (bottom). */
export const artTowerSegments: readonly ArtTowerSegment[] = [
  {
    id: "spark",
    label: "SPARK",
    layer: {
      x: artTowerBounds.x,
      y: artTowerBounds.y,
      width: artTowerBounds.width,
      height: segmentHeight,
    },
  },
  {
    id: "momentum",
    label: "MOMENTUM",
    layer: {
      x: artTowerBounds.x,
      y: artTowerBounds.y + segmentHeight,
      width: artTowerBounds.width,
      height: segmentHeight,
    },
  },
  {
    id: "growth",
    label: "GROWTH",
    layer: {
      x: artTowerBounds.x,
      y: artTowerBounds.y + segmentHeight * 2,
      width: artTowerBounds.width,
      height: segmentHeight,
    },
  },
  {
    id: "impact",
    label: "IMPACT",
    layer: {
      x: artTowerBounds.x,
      y: artTowerBounds.y + segmentHeight * 3,
      width: artTowerBounds.width,
      height: artTowerBounds.height - segmentHeight * 3,
    },
  },
] as const;

/** Dormant tap targets — one rect per segment (not wired in V1 static scene). */
export const artTowerHotspots: Record<ArtTowerSegmentId, SceneRect> =
  Object.fromEntries(
    artTowerSegments.map((s) => [s.id, s.layer]),
  ) as Record<ArtTowerSegmentId, SceneRect>;

/** Normalized zone for legacy WelcomeHallScene / WELCOME_HALL_ZONES artPrism slot. */
export function artTowerZoneNormalized() {
  const { x, y, width, height } = artTowerBounds;
  return {
    x: x / PLATE.width,
    y: y / PLATE.height,
    width: width / PLATE.width,
    height: height / PLATE.height,
  };
}

