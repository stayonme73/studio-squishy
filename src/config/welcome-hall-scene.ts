/**
 * Studio Lobby — Room 1 runtime scene (production).
 * 🔒 LOBBY ENVIRONMENT LOCKED — Tagia 2026-07-18 (16:9 podium-final plate)
 * @see docs/studio-lobby-v1-locked.md
 * Host identity: docs/studio-host-character-standard-v1-locked.md (separate Host Layer — not baked into plate)
 *
 * Approved visual baseline. Do not redesign or reinterpret.
 * Preserve composition, hierarchy, lighting, customer flow, palette, premium feel.
 * Faithful implementation — not pixel-perfect recreation.
 *
 * 16:9 plate matches common desktops — contain framing shows the full Lobby
 * without dominating blurred side bars.
 *
 * CHANGE POLICY — no visual redesigns, copy rewrites, layout adjustments,
 * or hotspot changes unless: verified technical defect, accessibility issue,
 * navigation failure, or explicit Tagia approval.
 *
 * Retired plates live under src/archive/welcome-hall/ (not served).
 *
 * @see src/config/welcome-hall-tower.ts
 */

export type SceneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const welcomeHallScene = {
  /**
   * Production Lobby environment (Host not baked in).
   * Host Layer is a separate transparent stack — see studio-lobby-host-layer-v1.ts.
   */
  src: "/welcome-hall/studio-lobby-environment.png?v=16",
  alt: "Studio Lobby — welcome podium and Studio interior",
  aspectRatio: "1920 / 1080" as const,
  nativeSize: { width: 1920, height: 1080 } as const,

  /** Full fit — restored original Lobby plate. */
  plateDisplayScale: 1,

  /**
   * Podium / kiosk tap target — native pixels on 16:9 plate (1920×1080).
   * Desktop: plate-canvas % overlay. Mobile: cover-mapped at object-position 48% 50%.
   * Full visible podium (screen + frame + stand). Verify with ?debug=1.
   */
  kioskTapTarget: {
    x: 55,
    y: 340,
    width: 520,
    height: 700,
  } satisfies SceneRect,

  /**
   * Greeting lives on the podium screen (baked). HTML balloon overlay stays off.
   * Rect retained for reference only.
   */
  squishyGreetingOverlayEnabled: false,
  squishyGreetingBalloon: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  } satisfies SceneRect,

  /** @deprecated Archive interactive scene only — not used by Room 1 production. */
  guideHotspot: {
    left: "5.5%",
    top: "68%",
    width: "16%",
    height: "18%",
  },

  /**
   * Desktop: cover — full-bleed Lobby (Tagia preference: no side bars).
   * 16:9 plate fills the viewport; minor top/bottom crop only when the window
   * aspect differs slightly from 16:9. Portrait mobile uses CSS crop path.
   */
  framing: {
    default: { x: 0.5, y: 0.52, fit: "cover" as const },
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
  if (width > 0 && height > width) {
    return welcomeHallScene.framing.portrait;
  }
  if (width >= 1025) {
    return welcomeHallScene.framing.default;
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
    (framing.fit === "contain"
      ? Math.min(vw / iw, vh / ih)
      : Math.max(vw / iw, vh / ih)) * welcomeHallScene.plateDisplayScale;
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

/** Plate canvas size + offset — matches object-fit cover/contain + object-position framing. */
export function welcomeHallPlateCoverLayout(
  viewport: { width: number; height: number },
  framing = welcomeHallFraming(viewport),
  native = welcomeHallScene.nativeSize,
) {
  const { width: vw, height: vh } = viewport;
  const { width: iw, height: ih } = native;
  if (vw <= 0 || vh <= 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }

  const scale =
    (framing.fit === "contain"
      ? Math.min(vw / iw, vh / ih)
      : Math.max(vw / iw, vh / ih)) * welcomeHallScene.plateDisplayScale;
  const width = iw * scale;
  const height = ih * scale;
  return {
    width,
    height,
    offsetX: (vw - width) * framing.x,
    offsetY: (vh - height) * framing.y,
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
    (framing.fit === "contain"
      ? Math.min(vw / iw, vh / ih)
      : Math.max(vw / iw, vh / ih)) * welcomeHallScene.plateDisplayScale;
  const marginY = (vh - ih * scale) * framing.y;

  const nativeYAtViewportY = (vy: number) => (vy - marginY) / scale;

  return {
    top: nativeYAtViewportY(0),
    bottom: nativeYAtViewportY(vh),
  };
}

/**
 * Historical reference boards — files live under src/archive/welcome-hall/plates/.
 * Not served; paths are archive-relative for documentation only.
 */
export const welcomeHallReferenceAssets = {
  archiveRoot: "src/archive/welcome-hall/plates",
  v32FinalDirection: "welcome-hall-v3.2-final-direction.png",
  v3Concept: "welcome-hall-v3-concept-reference.png",
  readabilityComparison: "welcome-hall-v3-readability-comparison.png",
  kioskHotspotAlignment: "welcome-hall-kiosk-hotspot-reference.png",
} as const;
