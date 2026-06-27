/**
 * Project Summary — view-model types.
 * Customer-facing bridge after Project Discovery — presentation only.
 *
 * Copy structure locked: docs/recommendation-engine-philosophy-v1-locked.md
 * Customer choice locked: docs/recommendation-not-direction-v1-locked.md
 * Visual language: docs/decision-page-visual-language-v1.md (proposal, not Discovery corkboard)
 */

/**
 * Discovery split-panel preview — teaser only ("Here's what we prepared.").
 * Full Why?, packages, customize, pricing, disclaimer, and approve live on Project Summary.
 * Locked: docs/discovery-split-preview-v1-locked.md
 */
export const DISCOVERY_SPLIT_PREVIEW_LABELS = {
  eyebrow: "Your Studio Plan",
  title: "Studio Plan Preview",
  introBody:
    "We've reviewed your Discovery and prepared a personalized Studio Plan based on what you shared.",
  servicesTitle: "Recommended Services",
  nextStepTitle: "Next Step",
  nextStepLead: "Review your complete Studio Plan to:",
  nextStepBullets: [
    "See why each service was recommended",
    "Adjust your Studio Plan",
    "View pricing and your estimated investment",
    "Approve your Studio Plan before payment",
  ],
  cta: "Review My Studio Plan →",
} as const;

export const PROJECT_SUMMARY_LABELS = {
  pageTitle: "Project Summary",
  pageLeadLines: [
    "The Studio reviewed your Discovery answers.",
    "Review your personalized Studio Plan before continuing.",
  ],
  heardTitle: "Here's what we heard",
  heardEmpty: "No discovery answers saved yet.",
  recommendTitle: "Our Recommendation",
  recommendLead: "Based on what you shared, we recommend starting with:",
  recommendWhyLabel: "Why?",
  packagesTitle: "Prefer a bundled option?",
  packagesLead:
    "If you'd rather start from a pre-built bundle, choose one below. You can still customize your plan afterward.",
  packagesSelectLabel: "Select bundle",
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
  disclaimerTitle: "Before you approve",
  disclaimerBody:
    "Our recommendations are based entirely on the information you shared during Discovery. They are intended to help you make informed decisions, not to guarantee business results. You're free to adjust your Studio Plan before approving it.",
  totalInvestmentLabel: "Estimated total investment",
  totalInvestmentPlaceholder: "Total updates as you customize your plan.",
  editDiscovery: "Edit discovery answers",
  confirmPlan: "Approve and continue to checkout",
} as const;

export type ProjectSummaryMockService = {
  name: string;
  why: string;
};

export type ProjectSummaryMockPackage = {
  id: "spark" | "momentum" | "growth";
  name: string;
  tagline: string;
  priceLabel: string;
};

/** Placeholder services + per-service Why? until Discovery Mapping wires traceable copy. */
export const PROJECT_SUMMARY_MOCK = {
  services: [
    {
      name: "Brand Identity Refresh",
      why: "You told us you're building your brand from the ground up — a refreshed identity gives you a consistent look before anything goes live.",
    },
    {
      name: "Brand Messaging",
      why: "You selected Better Branding — clear messaging helps customers understand what you offer from day one.",
    },
    {
      name: "Marketing Campaign",
      why: "You want to get more customers — a structured campaign turns your new brand into outreach that drives awareness.",
    },
    {
      name: "Social Media Marketing",
      why: "You selected Get More Customers — social channels are where many of your prospects already spend time.",
    },
  ] satisfies readonly ProjectSummaryMockService[],
  packages: [
    {
      id: "spark",
      name: "Spark",
      tagline: "A focused start — ideal for a single campaign or launch.",
      priceLabel: "From $150",
    },
    {
      id: "momentum",
      name: "Momentum",
      tagline: "Ongoing creative support to keep your marketing moving.",
      priceLabel: "From $350/mo",
    },
    {
      id: "growth",
      name: "Growth",
      tagline: "Full partnership for brands ready to scale.",
      priceLabel: "From $650/mo",
    },
  ] satisfies readonly ProjectSummaryMockPackage[],
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
