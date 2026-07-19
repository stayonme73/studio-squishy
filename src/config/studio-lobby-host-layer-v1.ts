/**
 * Studio Lobby — Host Layer V1 (placement).
 * Pose v1.0 locked (Tagia 2026-07-18). Blink / breathe not enabled yet.
 *
 * @see docs/studio-lobby-environment-separation-inspection-v1.md
 * @see docs/studio-host-character-standard-v1-locked.md
 */

export type LobbyHostFeetAnchor = {
  /** Native plate X of feet contact (center between soles). */
  x: number;
  /** Native plate Y of feet contact (floor). */
  y: number;
};

export const studioLobbyHostLayerV1 = {
  /** Dormant while Studio Presence Lobby prototype is under Tagia certification. */
  enabled: false,

  /**
   * Pose v1.0 (LOCKED — Tagia 2026-07-18)
   * - Right hand presents toward the podium (open palm — not a point, not a wave)
   * - Left hand holds the Studio Tablet
   * - Open-eye asset is the runtime default
   * - Closed-eye asset reserved for blink (not wired in this placement pass)
   * - No waving, pointing, or exaggerated gestures
   * - No pose changes unless Lobby composition reveals a genuine problem
   */
  poseVersion: "1.0" as const,

  assets: {
    /** Flattened full body — eyes open (runtime default). */
    base: "/welcome-hall/studio-lobby-host-base.png?v=3",
    eyesOpen: "/welcome-hall/studio-lobby-host-eyes-open.png?v=3",
    eyesClosed: "/welcome-hall/studio-lobby-host-eyes-closed.png?v=3",
  },

  alt: "Studio Host — guide toward the welcome podium",

  /**
   * Intrinsic pixel size of the Host PNGs (must match all three files).
   * Used for width/height attributes to reduce layout jump.
   */
  intrinsicSize: { width: 559, height: 994 } as const,

  /**
   * Display height in native Lobby pixels (1920×1080).
   * +~7.5% from first placement pass (Tagia: +5–10%). Podium left alone.
   */
  displayHeightNative: 602,

  /**
   * Feet pin on the 1920×1080 Lobby plate.
   * Raised a few pixels from y:1005 (Tagia). Podium / kiosk unchanged.
   */
  feet: { x: 700, y: 992 } satisfies LobbyHostFeetAnchor,

  /**
   * Motion gates for later passes. Placement pass keeps both false.
   */
  motion: {
    blinkEnabled: false,
    breatheEnabled: false,
  },
} as const;

export function studioLobbyHostDisplaySize(
  displayHeightNative = studioLobbyHostLayerV1.displayHeightNative,
  intrinsic = studioLobbyHostLayerV1.intrinsicSize,
) {
  const height = displayHeightNative;
  const width = (intrinsic.width / intrinsic.height) * height;
  return { width, height };
}
