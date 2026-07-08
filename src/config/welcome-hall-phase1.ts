/**
 * Welcome Hall Phase 1 — V2 (kiosk → Draft Room intake).
 * 🔒 Studio Lobby Complete — no redesign without explicit approval
 * @see docs/illustration/welcome-hall-locked.md
 */

import { helpCenterAnchor } from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";

export const welcomeHallPhase1 = {
  status: "v2" as const,
  jobs: ["welcome", "impress", "reassure", "curiosity"] as const,
  journey: ["welcome-hall", "kiosk", "draft-room"] as const,

  cta: {
  /** Primary — entire kiosk routes to Studio Route Map. */
  kioskLabel: "Let's get started — choose your route on the Studio Route Map.",
    kioskHeadline: "LET'S GET STARTED",
    kioskScreenLabel: "HOW CAN WE HELP?",
  },

  /** Mobile portrait — single screen: heading, tagline, CTA. */
  mobileEstablish: {
    heading: "THE STUDIO",
    tagline:
      "Tell us about your business. Together, we'll build what's next.",
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

  /** Welcome Hall kiosk → Studio Route Map V1 front door. */
  routeToRouteMap: "/route-map",
  /** @deprecated use routeToRouteMap — legacy discovery direct link preserved for deep links */
  routeToBusinessDiscoveryStudio: "/route-map",
  /** @deprecated use routeToRouteMap — legacy URL redirects */
  routeToDraftRoom: "/route-map",
  /** @deprecated use routeToRouteMap */
  routeToStudioGuidePrototype: "/route-map",
} as const;
