/**
 * Welcome Hall Phase 1 — V2 (kiosk → Draft Room intake).
 * 🔒 Studio Lobby Complete — no redesign without explicit approval
 * @see docs/illustration/welcome-hall-locked.md
 */

import { helpCenterAnchor } from "@/config/help-center";
import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { studioBoard } from "@/config/studio-board";

export const welcomeHallPhase1 = {
  status: "v2" as const,
  jobs: ["welcome", "impress", "reassure", "curiosity"] as const,
  journey: ["welcome-hall", "kiosk", "draft-room"] as const,

  cta: {
    /** Primary — entire kiosk routes to Business Discovery Studio. */
    kioskLabel: `Let's get started — enter ${customerJourneyStepName("project-discovery")}.`,
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
        label: "Client Login",
        href: studioBoard.routes.account,
        title:
          "Access your Studio Board, projects, reviews, and deliverables.",
      },
      {
        label: "Our Services",
        href: `${studioBoard.routes.helpCenter}#packages`,
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

  /** Welcome Hall kiosk → Business Discovery Studio (package discovery). */
  routeToBusinessDiscoveryStudio: "/business-discovery-studio",
  /** @deprecated use routeToBusinessDiscoveryStudio */
  routeToDraftRoom: "/draft-room",
  /** @deprecated use routeToBusinessDiscoveryStudio */
  routeToStudioGuidePrototype: "/business-discovery-studio",
} as const;
