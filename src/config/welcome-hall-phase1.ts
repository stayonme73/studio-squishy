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
    returningPrompt: "Already have a campaign?",
    returningLink: "Open Studio Board →",
    returningHref: "/studio-board",
  },

  /** Mobile portrait — step 1 establishing shot before kiosk focus. */
  mobileEstablish: {
    eyebrow: "Welcome",
    title: "Welcome to The Studio",
    lead:
      "You are entering Team Studio's Welcome Hall — the starting point for every campaign we create together.",
    journeyHeading: "What happens next",
    journeySteps: [
      "Tap Step Inside to enter the hall.",
      "On the kiosk, tap Let's Get Started.",
      "Choose your package — Spark, Momentum, or Growth.",
    ] as const,
    continueLabel: "Step Inside",
    continueHint: "Next: the kiosk in the Welcome Hall",
    kioskHint: "Let's Get Started",
    kioskHintDetail: "Tap the kiosk screen to continue",
    returningPrompt: "Already have a campaign?",
    returningLink: "Open Studio Board →",
  },

  /** Production intro plate — restore after Studio Guide interaction lock. */
  routeToDraftRoom: "/draft-room",
  /** Interaction validation — Welcome Hall kiosk during prototype pass. */
  routeToStudioGuidePrototype: "/studio-guide-prototype",
} as const;
