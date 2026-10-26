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
    risk: "Anything in the way",
  },
  actors: {
    customer: "You",
    studio: "The Studio",
    none: "No action required right now",
  },
  empty: {
    nothingNeeded: "Nothing is required from you right now.",
    noRisk: "Nothing is holding this up.",
    targetNotSet: "Not set yet",
    noCampaign: "Start or resume a project to see your project status here.",
  },
  receivedPrefix: "Recorded:",
} as const;
