/**
 * Studio Environment Shell V1 — OWNER GO 2026-09-06.
 *
 * Three layers:
 *   BACK — stationary Lounge (same asset; phone 16% 42%; desktop 50% 50%)
 *   SHARED FROST — stationary, behind content, Gold Master light ivory
 *   CONTENT — questions, cards, Route, Step 2, Step 3, Checkout
 *
 * Shared frost must not be a full-screen 14px blur sheet over controls.
 * Gold Master cards (Let’s Get Started / Voice Choice) keep their own 14px.
 *
 * @see MOBILE_VISUAL_MASTER
 * @see welcomeHallScene
 */

export const STUDIO_ENVIRONMENT_SHELL_STATUS = "APPROVED_NOT_FROZEN" as const;

export const studioEnvironmentShellV1 = {
  approvedAt: "2026-09-06",
  goldMaster: "lets-get-started-samsung",
  asset: "/welcome-hall/studio-lobby-lounge.png?v=1",
  fallback: "#ebe2d4",
  phoneCrop: "16% 42%",
  desktopCrop: "50% 50%",
  phoneMaxWidthPx: 1024,
  plateSize: "100lvh / 100lvw",
  veil: "color-mix(in srgb, #2e2b28 18%, transparent)",
  veilFilter: "blur(2px)",
  sharedFrostFill:
    "color-mix(in srgb, color-mix(in srgb, #f7f4ee 68%, #ebe2d4 32%) 22%, transparent)",
  contentGlassFill:
    "color-mix(in srgb, color-mix(in srgb, #f7f4ee 68%, #ebe2d4 32%) 46%, transparent)",
  contentGlassFilter: "blur(14px) saturate(1.04) brightness(1.1)",
  doNotPutFullScreenFrostAboveControls: true,
  doNotImplementSliding: true,
  preserveStep2Tiles: true,
  owner:
    "src/components/studio-environment/StudioEnvironmentShell.tsx",
  css: "src/app/studio-environment-shell.css",
} as const;

export const STUDIO_ENVIRONMENT_FORBIDDEN_FULL_VIEWPORT_PAINTERS = [
  'url("/welcome-hall/studio-utility-backdrop.png',
  "studio-utility-backdrop.png?v=1",
] as const;
