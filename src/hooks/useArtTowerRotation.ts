"use client";

import { useCallback, useState } from "react";

import {
  TOWER_ROTATION_ENABLED,
  artTowerSegments,
  type ArtTowerSegmentId,
} from "@/config/welcome-hall-tower";

export type ArtTowerRotationState = {
  /** Active segment index (0 = spark, top). Frozen at 0 when rotation disabled. */
  faceIndex: number;
  activeSegment: ArtTowerSegmentId;
  rotationEnabled: boolean;
  /** No-op when TOWER_ROTATION_ENABLED is false. */
  rotateNext: () => void;
  rotatePrev: () => void;
  selectSegment: (id: ArtTowerSegmentId) => void;
};

/**
 * Art Tower rotation hook — dormant in V1 static plate.
 * Enable TOWER_ROTATION_ENABLED and wire ArtTowerLayer for Phase 2.
 */
export function useArtTowerRotation(): ArtTowerRotationState {
  const count = artTowerSegments.length;
  const [faceIndex, setFaceIndex] = useState(0);

  const clamp = useCallback(
    (index: number) => ((index % count) + count) % count,
    [count],
  );

  const rotateNext = useCallback(() => {
    if (!TOWER_ROTATION_ENABLED) return;
    setFaceIndex((i) => clamp(i + 1));
  }, [clamp]);

  const rotatePrev = useCallback(() => {
    if (!TOWER_ROTATION_ENABLED) return;
    setFaceIndex((i) => clamp(i - 1));
  }, [clamp]);

  const selectSegment = useCallback(
    (id: ArtTowerSegmentId) => {
      if (!TOWER_ROTATION_ENABLED) return;
      const idx = artTowerSegments.findIndex((s) => s.id === id);
      if (idx >= 0) setFaceIndex(idx);
    },
    [],
  );

  return {
    faceIndex: TOWER_ROTATION_ENABLED ? faceIndex : 0,
    activeSegment: artTowerSegments[TOWER_ROTATION_ENABLED ? faceIndex : 0].id,
    rotationEnabled: TOWER_ROTATION_ENABLED,
    rotateNext,
    rotatePrev,
    selectSegment,
  };
}
