import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { studioPolicies } from "@/config/policies";
import { studioBoard } from "@/config/studio-board";

export type HelpCenterFrom = "campaign-details" | "studio-board" | "payment";

export function helpCenterAnchor(
  section: "philosophy" | "faq" | "policies",
  id?: string,
) {
  if (section === "philosophy") return "philosophy";
  if (section === "faq") return id ? `faq-${id}` : "faq";
  return id ? `policy-${id}` : "policies";
}

export function helpCenterHref(anchor?: string, from?: HelpCenterFrom) {
  const params = from ? `?from=${from}` : "";
  const hash = anchor ? `#${anchor}` : "";
  return `${studioBoard.routes.helpCenter}${params}${hash}`;
}

export const helpCenter = {
  pageTitle: customerJourneyStepName("help-center"),
  eyebrow: "Studio Help",
  lead: "Studio rules, policies, and answers — your reference desk for how The Studio works.",
  routes: {
    home: studioBoard.routes.helpCenter,
    studioBoard: studioBoard.routes.studioBoard,
    campaignDetails: studioBoard.routes.campaignDetails,
  },
  backLabels: {
    studioBoard: "Back to Studio Board",
    campaignDetails: "Back to Campaign Details",
    payment: `Back to ${customerJourneyStepName("secure-checkout")}`,
  },
  toc: {
    title: "On this page",
    items: [
      { id: "about", label: "About The Studio" },
      { id: "packages", label: "Compare Packages" },
      { id: "philosophy", label: "Studio Philosophy" },
      { id: "faq", label: studioPolicies.faq.title },
      { id: "policies", label: studioPolicies.policies.title },
    ] as const,
  },
  sections: {
    about: studioPolicies.aboutTheStudio.title,
    packages: "Compare Packages",
    philosophy: "Studio Philosophy",
    faq: studioPolicies.faq.title,
    policies: studioPolicies.policies.title,
  },
  faqGroups: [
    {
      id: "getting-started",
      label: "Getting started",
      faqIds: ["after-payment", "campaign-timeline", "email-notifications"] as const,
    },
    {
      id: "payments-packages",
      label: "Payments & packages",
      faqIds: ["payments-non-refundable", "switch-packages-after-payment"] as const,
    },
    {
      id: "vision-revisions",
      label: "Vision, revisions & Creative Room",
      faqIds: [
        "change-mind-after-intake",
        "revision-definition",
        "revision-count",
        "creative-room-ideas",
      ] as const,
    },
    {
      id: "expectations",
      label: "Expectations",
      faqIds: ["results-expectations"] as const,
    },
  ] as const,
  footer: {
    campaignHint:
      "Questions about your active campaign? Check your Campaign Details for status and progress.",
    studioBoardLabel: "Studio Board",
    campaignDetailsLabel: customerJourneyStepName("project-record"),
    helpCenterLabel: customerJourneyStepName("help-center"),
  },
  /** Contextual links from Campaign Details — href built at render time */
  campaignLinks: {
    overviewAwaitingPayment: [
      { label: "Payment policy", anchor: helpCenterAnchor("policies", "payment-policy") },
      {
        label: "Why are payments non-refundable?",
        anchor: helpCenterAnchor("faq", "payments-non-refundable"),
      },
    ],
    visionSummary: [
      {
        label: "Vision responsibility policy",
        anchor: helpCenterAnchor("policies", "vision-responsibility-policy"),
      },
    ],
    revisionTracker: [
      {
        label: "Questions about revisions?",
        anchor: helpCenterAnchor("faq", "revision-definition"),
      },
      { label: "Revision policy", anchor: helpCenterAnchor("policies", "revision-policy") },
    ],
    packageIncludes: [
      {
        label: "Can I switch packages?",
        anchor: helpCenterAnchor("faq", "switch-packages-after-payment"),
      },
      {
        label: "Package lock policy",
        anchor: helpCenterAnchor("policies", "package-lock-policy"),
      },
    ],
    timeline: [
      {
        label: "How long will my campaign take?",
        anchor: helpCenterAnchor("faq", "campaign-timeline"),
      },
      { label: "Timeline policy", anchor: helpCenterAnchor("policies", "timeline-policy") },
    ],
    deliverables: [
      {
        label: "What results should I expect?",
        anchor: helpCenterAnchor("faq", "results-expectations"),
      },
    ],
    pageFooter: [
      { label: "Studio Help Center", anchor: undefined },
    ],
  },
  boardLinks: {
    sidebar: "Help Center",
    awaitingPayment: {
      label: "Payment & package policies",
      anchor: helpCenterAnchor("policies"),
    },
    packageComparison: {
      label: "Compare SPARK, MOMENTUM & GROWTH",
      anchor: "packages",
    },
  },
} as const;
