/**
 * Studio Lobby — Invisible Friend (outfit Presence).
 * Transparent RGBA wardrobe layer · no head / face / hands / skin.
 * Podium remains the only Lobby click target.
 *
 * @see docs/studio-tablet-v1-direction.md
 */

export type InvisibleFriendFeetAnchor = {
  /** Native plate X of feet contact (center between soles). */
  x: number;
  /** Native plate Y of feet contact (floor). */
  y: number;
};

export const studioLobbyInvisibleFriendV1 = {
  /** Off — Tagia rejected outfit pass; Lobby is environment-only until next approved friend. */
  enabled: false,

  assets: {
    outfit:
      "/welcome-hall/invisible-studio-host-outfit-transparent.png?v=2",
  },

  alt: "Invisible Studio employee — outfit and tablet near the welcome podium",

  /** Intrinsic pixel size of the outfit PNG. */
  intrinsicSize: { width: 682, height: 1024 } as const,

  /**
   * Display height in native Lobby pixels (1920×1080).
   * Open floor center-right (Host Layer zone). Podium left alone.
   */
  displayHeightNative: 620,

  /**
   * Feet pin on the 1920×1080 Lobby plate.
   * Same neighborhood as dormant Host Layer — beside podium, not on it.
   */
  feet: { x: 720, y: 995 } satisfies InvisibleFriendFeetAnchor,
} as const;

export function studioLobbyInvisibleFriendDisplaySize(
  displayHeightNative = studioLobbyInvisibleFriendV1.displayHeightNative,
  intrinsic = studioLobbyInvisibleFriendV1.intrinsicSize,
) {
  const height = displayHeightNative;
  const width = (intrinsic.width / intrinsic.height) * height;
  return { width, height };
}
