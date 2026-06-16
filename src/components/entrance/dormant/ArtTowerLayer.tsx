"use client";

import {
  TOWER_ROTATION_ENABLED,
  artTowerSegments,
} from "@/config/welcome-hall-tower";
import { sceneRectToPercent } from "@/config/welcome-hall-scene";
import { useArtTowerRotation } from "@/hooks/useArtTowerRotation";

type Props = {
  /** Override flag for Storybook / QA — defaults to TOWER_ROTATION_ENABLED. */
  enabled?: boolean;
};

/**
 * Art Tower interactive layer — DORMANT in V1 static Welcome Hall.
 *
 * V1 static plate — enable TOWER_ROTATION_ENABLED for Phase 2.
 * Not wired into WelcomeHallWelcomeScene; preserved for future rotation.
 *
 * @see src/config/welcome-hall-tower.ts
 */
export default function ArtTowerLayer({ enabled = TOWER_ROTATION_ENABLED }: Props) {
  const { faceIndex, rotateNext, rotatePrev, selectSegment } = useArtTowerRotation();

  if (!enabled) {
    return null;
  }

  return (
    <div className="art-tower-layer" aria-label="Art Tower category selector">
      {artTowerSegments.map((segment, index) => {
        const style = sceneRectToPercent(segment.layer);
        const isActive = index === faceIndex;
        return (
          <button
            key={segment.id}
            type="button"
            className={`art-tower-layer-segment${isActive ? " art-tower-layer-segment--active" : ""}`}
            style={style}
            aria-label={segment.label}
            aria-pressed={isActive}
            onClick={() => selectSegment(segment.id)}
          />
        );
      })}
      <div className="art-tower-layer-controls" aria-hidden={!enabled}>
        <button type="button" onClick={rotatePrev} aria-label="Previous tower face">
          ‹
        </button>
        <button type="button" onClick={rotateNext} aria-label="Next tower face">
          ›
        </button>
      </div>
    </div>
  );
}
