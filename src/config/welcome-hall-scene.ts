/**
 * Welcome Hall — RUNTIME scene asset (V2 tower-free plate).
 *
 * LOCKED v31 — approved by Tagia (Creative Director), 2026-06-14.
 * Archived final: public/welcome-hall/welcome-hall-v2-final-locked.png
 *
 * CHANGE POLICY — no visual redesigns, copy rewrites, layout adjustments,
 * mural/kiosk/draft room/lighting changes, or environmental experiments unless:
 *   - verified technical defect
 *   - verified accessibility issue
 *   - verified navigation failure
 * All other changes require explicit Tagia approval.
 *
 * Plate v31 cache ?v=31 — 1920x1080 founder art; kiosk right foreground.
 * Tower rotation dormant — enable TOWER_ROTATION_ENABLED for Phase 2 only.
 *
 * @see docs/illustration/welcome-hall-locked.md
 * @see src/config/welcome-hall-tower.ts
 */

export type SceneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const welcomeHallScene = {
  src: "/welcome-hall/welcome-hall-scene-v3.2.png?v=31",
  alt: "Welcome Hall — Team Studio entrance",
  aspectRatio: "1920 / 1080" as const,
  nativeSize: { width: 1920, height: 1080 } as const,

  /** Legacy kiosk hotspot — v2 interactive scene only */
  guideHotspot: {
    left: "5.5%",
    top: "68%",
    width: "16%",
    height: "18%",
  },

  /**
   * Full kiosk tap target — native pixels on plate v31 (1920×1080).
   * Entire black kiosk body + screen + baked tap button.
   * Calibrated via grid overlay (_verify-hotspots-v31.png).
   */
  kioskTapTarget: {
    x: 1440,
    y: 502,
    width: 394,
    height: 537,
  } satisfies SceneRect,

  /**
   * Doorway lintel plate — DRAFT ROOM label baked in art; rect for future overlay.
   * Native pixels on plate v31 (1920×1080).
   */
  wallLabelPlate: {
    x: 741,
    y: 139,
    width: 431,
    height: 66,
  } satisfies SceneRect,

  /** Cover on desktop 16:9 — zero crop; portrait uses contain for full-scene kiosk */
  framing: {
    default: { x: 0.5, y: 0.5, fit: "cover" as const },
    portrait: { x: 0.5, y: 0.5, fit: "contain" as const },
  },
} as const;

/** Map a native-scene rect to percentage styles for the plate overlay. */
export function sceneRectToPercent(
  rect: SceneRect,
  native = welcomeHallScene.nativeSize,
) {
  return {
    left: `${(rect.x / native.width) * 100}%`,
    top: `${(rect.y / native.height) * 100}%`,
    width: `${(rect.width / native.width) * 100}%`,
    height: `${(rect.height / native.height) * 100}%`,
  };
}

export type WelcomeHallFraming = {
  x: number;
  y: number;
  fit: "cover" | "contain";
};

export function welcomeHallFraming(viewport: {
  width: number;
  height: number;
}): WelcomeHallFraming {
  const { width, height } = viewport;
  if (width > 0 && height > width && width <= 768) {
    return welcomeHallScene.framing.portrait;
  }
  return welcomeHallScene.framing.default;
}

/** @deprecated Use welcomeHallFraming */
export function welcomeHallObjectPosition(viewport: {
  width: number;
  height: number;
}) {
  const { x, y } = welcomeHallFraming(viewport);
  return { x, y };
}

/** Map native-scene rect to overlay % for object-fit cover or contain. */
export function sceneRectToCoverPercent(
  rect: SceneRect,
  viewport: { width: number; height: number },
  framing = welcomeHallFraming(viewport),
  native = welcomeHallScene.nativeSize,
) {
  const { width: iw, height: ih } = native;
  const { width: vw, height: vh } = viewport;
  if (vw <= 0 || vh <= 0) {
    return sceneRectToPercent(rect, native);
  }

  const scale =
    framing.fit === "contain"
      ? Math.min(vw / iw, vh / ih)
      : Math.max(vw / iw, vh / ih);
  const renderedW = iw * scale;
  const renderedH = ih * scale;
  const marginX = (vw - renderedW) * framing.x;
  const marginY = (vh - renderedH) * framing.y;

  const mapPoint = (px: number, py: number) => ({
    x: px * scale + marginX,
    y: py * scale + marginY,
  });

  const topLeft = mapPoint(rect.x, rect.y);

  return {
    left: `${(topLeft.x / vw) * 100}%`,
    top: `${(topLeft.y / vh) * 100}%`,
    width: `${((rect.width * scale) / vw) * 100}%`,
    height: `${((rect.height * scale) / vh) * 100}%`,
  };
}

/** Native Y range visible at viewport top/bottom after cover/contain framing. */
export function welcomeHallVisibleYRange(
  viewport: { width: number; height: number },
  framing = welcomeHallFraming(viewport),
  native = welcomeHallScene.nativeSize,
) {
  const { width: iw, height: ih } = native;
  const { width: vw, height: vh } = viewport;
  const scale =
    framing.fit === "contain"
      ? Math.min(vw / iw, vh / ih)
      : Math.max(vw / iw, vh / ih);
  const marginY = (vh - ih * scale) * framing.y;

  const nativeYAtViewportY = (vy: number) => (vy - marginY) / scale;

  return {
    top: nativeYAtViewportY(0),
    bottom: nativeYAtViewportY(vh),
  };
}

/** Internal reference boards — documentation only */
export const welcomeHallReferenceAssets = {
  v32FinalDirection: "/welcome-hall/welcome-hall-v3.2-final-direction.png",
  v3Concept: "/welcome-hall/welcome-hall-v3-concept-reference.png",
  readabilityComparison: "/welcome-hall/welcome-hall-v3-readability-comparison.png",
  kioskHotspotAlignment: "/welcome-hall/welcome-hall-kiosk-hotspot-reference.png",
} as const;
