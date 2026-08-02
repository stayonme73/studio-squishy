/**
 * CUSTOMER-VISIBILITY-CONTINUITY-CERT-1 — customer-facing labels for the shared
 * Studio Board project-status story (Gates #6 / #8 / #14).
 * Presentation copy only — derivation lives in lib.
 */

export const customerVisibilityContinuityV1 = {
  panelHeading: "Project status",
  sections: {
    needed: "What we need from you",
    studioWorking: "What The Studio is working on",
    nextStep: "Next step",
    whoActs: "Who acts next",
    target: "Target or checkpoint",
    risk: "Risks or blockers",
  },
  actors: {
    customer: "You",
    studio: "The Studio",
    none: "No action required right now",
  },
  empty: {
    nothingNeeded: "Nothing is required from you right now.",
    noRisk: "No risk or blocker is recorded.",
    targetNotSet: "Not set yet",
    noCampaign: "Start or resume a project to see your project status here.",
  },
  receivedPrefix: "Recorded:",
} as const;
