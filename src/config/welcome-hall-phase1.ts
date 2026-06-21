/**
 * Welcome Hall Phase 1 — V2 (kiosk → Draft Room intake).
 * @see docs/illustration/welcome-hall-locked.md
 */

export const welcomeHallPhase1 = {
  status: "v2" as const,
  jobs: ["welcome", "impress", "reassure", "curiosity"] as const,
  journey: ["welcome-hall", "kiosk", "draft-room"] as const,

  cta: {
    /** Primary — kiosk only. Screen overlay shows LET'S GET STARTED until V2 plate ships. */
    kioskLabel: "Let's get started — begin your draft in the Draft Room",
    kioskHeadline: "LET'S GET STARTED",
  },

  /** Production intro plate — restore after Studio Guide interaction lock. */
  routeToDraftRoom: "/draft-room",
  /** Interaction validation — Welcome Hall kiosk during prototype pass. */
  routeToStudioGuidePrototype: "/studio-guide-prototype",
} as const;
