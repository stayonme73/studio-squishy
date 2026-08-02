/**
 * Welcome Hall Phase 1 — Studio Lobby (Room 1).
 * 🔒 LOBBY LOCKED · CLOSED — Tagia 2026-07-17 · docs/studio-lobby-v1-locked.md
 * No redesign. Next: Conversation Room.
 */

import { helpCenterAnchor } from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";

export const welcomeHallPhase1 = {
  status: "v2" as const,
  jobs: ["welcome", "impress", "reassure", "curiosity"] as const,
  journey: ["welcome-hall", "kiosk", "draft-room"] as const,

  cta: {
  /** Primary — entire kiosk routes to Studio Conversation Room. */
  kioskLabel: "Let's get started — open the Studio Conversation Room.",
    kioskHeadline: "LET'S GET STARTED",
    kioskScreenLabel: "HOW CAN WE HELP?",
  },

  /**
   * Lobby / mobile greeting — aligns with locked podium screen copy (2026-07-18).
   * Podium bakes the full message; mobile dock uses the same lines (CTA separate).
   */
  squishyGreeting: "Welcome! Your creative journey begins here.",

  /** Mobile portrait — single screen: heading, greeting, CTA. */
  mobileEstablish: {
    heading: "THE STUDIO",
    /**
     * Matches podium screen — one sentence per line.
     * Must stay identical to `squishyGreeting` (space-joined).
     */
    taglineLines: ["Welcome!", "Your creative journey begins here."] as const,
    ctaLabel: "LET'S GET STARTED",
  },

  /** Mobile portrait — secondary links in gray dock below hero card. */
  mobileStudioNav: {
    ariaLabel: "Studio navigation",
    heading: "Need Something Else?",
    items: [
      {
        label: "Our Services",
        href: `${studioBoard.routes.helpCenter}#quick-guide`,
      },
      {
        label: "FAQ",
        href: `${studioBoard.routes.helpCenter}#${helpCenterAnchor("faq")}`,
      },
      {
        label: "Contact The Studio",
        href: `${studioBoard.routes.helpCenter}#about`,
      },
    ],
  },

  /** Welcome Hall kiosk -> Studio Conversation Room front door. */
  routeToRouteMap: "/studio-conversation-room",
  /** @deprecated use routeToRouteMap — legacy discovery direct link preserved for deep links */
  routeToBusinessDiscoveryStudio: "/studio-conversation-room",
  /** @deprecated use routeToRouteMap — legacy URL redirects */
  routeToDraftRoom: "/studio-conversation-room?stage=intake",
  /** @deprecated use routeToRouteMap */
  routeToStudioGuidePrototype: "/studio-conversation-room",
} as const;
