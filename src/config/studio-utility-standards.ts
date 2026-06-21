/**
 * Studio Utility Page Design System — approved implementation tokens.
 * @see docs/studio-utility-design-system.md
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
    eucalyptus: "#2e5e4e",
    eucalyptusDeep: "#2e5e4e",
    eucalyptusMuted: "#5a7a6e",
    paperCream: "#efe8de",
    sage: "#a7b89a",
    terracotta: "#c85a3d",
    charcoal: "#2b2b2b",
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
    backdrop: "/studio-utility/studio-utility-backdrop.png",
  },
} as const;

/** Pages that receive the Studio utility backdrop per placement guide. */
export const studioUtilityBackdropRoutes = new Set<string>([
  studioBoard.routes.campaignDetails,
  studioBoard.routes.helpCenter,
  studioBoard.routes.reviewRoom,
  studioBoard.routes.deliverables,
  studioBoard.routes.pastCampaigns,
  studioBoard.routes.account,
]);

export function utilityPageUsesBackdrop(navId: UtilityNavId): boolean {
  return navId !== "studio-board";
}

export function utilityPageUsesSecondaryNav(navId: UtilityNavId): boolean {
  return navId !== "studio-board";
}
