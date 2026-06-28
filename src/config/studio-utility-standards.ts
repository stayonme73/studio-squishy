/**
 * Studio Utility Page Design System — approved implementation tokens.
 * @see docs/the-studio-design-system-v1.md
 * @see docs/studio-backdrop-placement-guide.md
 */

import { studioBoard } from "@/config/studio-board";

import type { UtilityNavId } from "./utility-shell";

export const studioUtilityDesignSystem = {
  typography: {
    fontFamily: 'var(--font-studio-board-sans), "Inter", "Segoe UI", system-ui, sans-serif',
    h1: {
      sizeMin: "1.85rem",
      sizeMax: "2.35rem",
      letterSpacing: "0.04em",
    },
    h2: {
      size: "0.95rem",
      letterSpacing: "0.04em",
    },
    body: "1rem",
  },
  colors: {
    eucalyptus: "#456b5a",
    eucalyptusDeep: "#3d5a4d",
    eucalyptusMuted: "#5a7a6e",
    paperCream: "#e8e2d8",
    sage: "#a7b89a",
    terracotta: "#d56b4d",
    charcoal: "#2f3437",
  },
  card: {
    radius: "10px",
    padding: "1.25rem",
    shadow: "0 2px 10px rgba(46, 94, 78, 0.08)",
  },
  button: {
    radius: "8px",
    padding: "0.75rem 1.25rem",
    fontSize: "0.82rem",
  },
  layout: {
    contentMax: "56rem",
    narrowMax: "28rem",
    pagePad: "clamp(1rem, 2.5vw, 1.75rem)",
    cardGap: "1rem",
  },
  assets: {
    backdrop: "/welcome-hall/welcome-hall-scene-v4.png",
  },
} as const;

/** In-scope utility routes — blurred Studio Lobby backdrop (Priority 2). */
const UTILITY_BACKDROP_NAV_IDS = new Set<UtilityNavId>([
  "help-center",
  "review-room",
  "deliverables",
  "payment",
]);

/** Route paths that receive the lobby backdrop (documentation / guards). */
export const studioUtilityBackdropRoutes = new Set<string>([
  "/project-summary",
  studioBoard.routes.helpCenter,
  studioBoard.routes.feedbackStudio,
  studioBoard.routes.deliverables,
  "/payment",
  "/project-details",
  studioBoard.routes.campaignDetails,
]);

export function utilityPageUsesBackdrop(navId: UtilityNavId): boolean {
  return UTILITY_BACKDROP_NAV_IDS.has(navId);
}

export function utilityPageUsesSecondaryNav(navId: UtilityNavId): boolean {
  return navId !== "studio-board";
}
