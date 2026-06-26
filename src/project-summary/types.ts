/**
 * Project Summary — view-model types.
 * Customer-facing bridge after Project Discovery — presentation only.
 *
 * Copy structure locked: docs/recommendation-not-direction-v1-locked.md
 */

export const PROJECT_SUMMARY_LABELS = {
  pageTitle: "Project Summary",
  pageLead:
    "The Studio reviewed your discovery answers. Confirm your plan before production begins.",
  heardTitle: "Here's what we heard",
  heardEmpty: "No discovery answers saved yet.",
  recommendTitle: "Our Recommendation",
  recommendLead: "Based on what you shared, we recommend starting with:",
  recommendWhyLabel: "Why?",
  changesTitle: "Customize Your Studio Plan",
  changesLead: "These are recommendations, not requirements.",
  changesPowersIntro: "You can:",
  changesPowers: [
    "Keep our recommendations",
    "Remove a recommended service",
    "Substitute an equivalent service",
    "Add additional Studio Services",
  ],
  changesAutoUpdate: "Your Studio Plan will update automatically as you make changes.",
  editDiscovery: "Edit discovery answers",
  confirmPlan: "Confirm and continue",
} as const;

/** Placeholder services + rationale until Discovery Mapping wires collective Why? copy. */
export const PROJECT_SUMMARY_MOCK = {
  services: [
    "Brand Identity Refresh",
    "Brand Messaging",
    "Marketing Campaign",
    "Social Media Marketing",
  ],
  whyRationale:
    "You're building your business from the ground up. These services create a strong foundation before expanding into additional marketing efforts.",
} as const;

export type DiscoveryAnswerHeardItem = {
  label: string;
  value: string;
};

/**
 * Split-panel right-column phases in Project Discovery post-submit workspace.
 * `checkout` is reserved for future slide-out Secure Checkout — not wired yet.
 * CSS: `--bds-panel-phase: reviewing | summary | checkout`
 */
export type PanelPhase = "reviewing" | "summary" | "checkout";
