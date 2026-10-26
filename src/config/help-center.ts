import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { studioPolicies } from "@/config/policies";
import { studioBoard } from "@/config/studio-board";
import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";

/** Known safe Help return origins — never accept an arbitrary `from=` path. */
export const HELP_CENTER_FROM_WHITELIST = [
  "studio-lobby",
  "route-map",
  "conversation-room",
  "payment",
  "package-detail",
  "short-form-package-detail",
  "social-package-detail",
  "creative-qa-package-detail",
  "campaign-launch-package-detail",
  "project-builder",
  "checkout",
  "studio-board",
  "campaign-details",
  "review-room",
  "deliverables",
  "final-delivery-room",
] as const;

export type HelpCenterFrom = (typeof HELP_CENTER_FROM_WHITELIST)[number];

export function isHelpCenterFrom(value: string | null | undefined): value is HelpCenterFrom {
  return Boolean(value && (HELP_CENTER_FROM_WHITELIST as readonly string[]).includes(value));
}

export function helpCenterAnchor(
  section: "philosophy" | "faq" | "policies",
  id?: string,
) {
  if (section === "philosophy") return "philosophy";
  if (section === "faq") return id ? `faq-${id}` : "faq";
  return id ? `policy-${id}` : "policies";
}

export function helpCenterHref(anchor?: string, from?: HelpCenterFrom) {
  const params = from && isHelpCenterFrom(from) ? `?from=${from}` : "";
  const hash = anchor ? `#${anchor}` : "";
  return `${studioBoard.routes.helpCenter}${params}${hash}`;
}

export const helpCenter = {
  pageTitle: customerJourneyStepName("help-center"),
  eyebrow: "Studio Help",
  lead: "Studio rules, policies, and answers — your reference desk for how The Studio works.",
  routes: {
    home: studioBoard.routes.helpCenter,
    studioLobby: studioBoard.routes.studioLobby,
    studioBoard: studioBoard.routes.studioBoard,
    campaignDetails: studioBoard.routes.campaignDetails,
    conversationRoom: studioBoard.routes.studioGuide,
    packageDetail: "/package/clip-repurposing",
    shortFormPackageDetail: "/package/short-form-video-editing",
    socialPackageDetail: "/package/social-promo-graphics",
    creativeQaPackageDetail: "/package/creative-qa-finish",
    campaignLaunchPackageDetail: "/package/campaign-launch-kit",
    projectBuilder: "/project-builder",
    checkout: "/checkout",
    reviewRoom: studioBoard.routes.feedbackStudio,
    deliverables: studioBoard.routes.deliverables,
    finalDeliveryRoom: "/final-delivery-room",
  },
  backLabels: {
    studioLobby: "Back to Home",
    studioBoard: "Back to My Studio",
    campaignDetails: "Back to Project Record",
    conversationRoom: "Back to Conversation Room",
    payment: "Back to Conversation Room",
    routeMap: "Back to Conversation Room",
    packageDetail: "Back to Package Detail",
    projectBuilder: "Back to Build Your Project",
    checkout: "Back to Review & Pay",
    reviewRoom: "Back to Review Room",
    deliverables: "Back to Final Delivery",
    finalDeliveryRoom: "Back to Final Delivery",
  },
  toc: {
    title: "On this page",
    items: [
      { id: "quick-guide", label: "Quick Policy Guide" },
      { id: "about", label: "About The Studio" },
      { id: "philosophy", label: "Studio Philosophy" },
      { id: "faq", label: studioPolicies.faq.title },
      { id: "policies", label: studioPolicies.policies.title },
    ] as const,
  },
  sections: {
    about: studioPolicies.aboutTheStudio.title,
    quickGuide: "Quick Policy Guide",
    philosophy: "Studio Philosophy",
    faq: studioPolicies.faq.title,
    policies: studioPolicies.policies.title,
  },
  quickPolicyGuide: {
    title: "Quick Policy Guide",
    lead: "Scan the situation, see what happens next, then open the detailed policy below.",
    rows: [
      {
        id: "starting-project",
        situation: "Starting a Project",
        summary:
          "Start on the Home page, choose a package, complete Build Your Project, then pay. Card entry is on Stripe. After payment is confirmed, complete Project Intake and add your files in My Studio.",
        anchor: "faq-after-payment",
        learnMoreLabel: "What happens after I pay?",
      },
      {
        id: "payment",
        situation: "Payment",
        summary: "Per service. Payment is required before work can proceed. Paying alone does not start production.",
        anchor: "policy-payment-policy",
        learnMoreLabel: "Payment policy",
      },
      {
        id: "production-begins",
        situation: "Production Begins",
        summary:
          "Per service: payment received, Project Intake complete, required materials reviewed and accepted, and the service moved into production. Adding a file does not start production by itself. Then non-refundable.",
        anchor: "policy-production-policy",
        learnMoreLabel: "Production policy",
      },
      {
        id: "missing-materials",
        situation: "Missing Materials",
        summary: "If required materials are still missing, that part of the project waits. My Studio shows what is still needed.",
        anchor: "policy-missing-materials-policy",
        learnMoreLabel: "Missing materials policy",
      },
      {
        id: "waiting-on-client",
        situation: "Waiting on Client",
        summary: "That service waits until the required information or materials are received.",
        anchor: "policy-waiting-on-client-policy",
        learnMoreLabel: "Waiting on Client policy",
      },
      {
        id: "review-room",
        situation: "Review Room",
        summary:
          "Open Review Room to see the work, leave feedback, approve, or request a revision.",
        anchor: "policy-creative-room-policy",
        learnMoreLabel: "Review Room policy",
      },
      {
        id: "revisions",
        situation: "Revisions",
        summary: `${STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packageCount} ${STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.oneRound}`,
        anchor: "policy-revision-policy",
        learnMoreLabel: "Revision policy",
      },
      {
        id: "final-delivery",
        situation: "Final Delivery",
        summary: "Approved files for the services you purchased, ready to download.",
        anchor: "policy-final-delivery-policy",
        learnMoreLabel: "Final delivery policy",
      },
      {
        id: "refunds",
        situation: "Refunds",
        summary: "Per service. Refund may be approved before production starts. Non-refundable after production starts on that service.",
        anchor: "policy-refund-policy",
        learnMoreLabel: "Refund policy",
      },
      {
        id: "timeline",
        situation: "Timeline",
        summary:
          "The Studio does not promise a delivery date. Timing depends on the package, required materials, and your responses.",
        anchor: "policy-timeline-policy",
        learnMoreLabel: "Timeline policy",
      },
    ] as const,
  },
  faqGroups: [
    {
      id: "getting-started",
      label: "Getting started",
      faqIds: [
        "monthly-subscription",
        "multiple-services",
        "how-studio-creates-project",
        "after-payment",
        "campaign-timeline",
        "email-notifications",
        "current-packages",
        "passwords",
      ] as const,
    },
    {
      id: "payments-refunds",
      label: "Payments & refunds",
      faqIds: ["payments-refund-eligibility", "deliverable-ownership"] as const,
    },
    {
      id: "vision-revisions",
      label: "Project details, revisions & Review Room",
      faqIds: [
        "change-mind-after-intake",
        "revision-definition",
        "revision-count",
        "creative-room-ideas",
      ] as const,
    },
    {
      id: "short-form-content-pack",
      label: "Short-Form Video Editing",
      faqIds: [
        "short-form-content-pack-difference",
        "short-form-content-pack-four-minute",
        "short-form-content-pack-contract",
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
      "Questions about your active project? Check your Project Record for status and progress.",
    studioBoardLabel: "My Studio",
    campaignDetailsLabel: customerJourneyStepName("project-record"),
    helpCenterLabel: customerJourneyStepName("help-center"),
  },
  campaignLinks: {
    overviewAwaitingPayment: [
      { label: "Payment policy", anchor: helpCenterAnchor("policies", "payment-policy") },
      {
        label: "When can I request a refund?",
        anchor: helpCenterAnchor("faq", "payments-refund-eligibility"),
      },
    ],
    visionSummary: [
      {
        label: "Project responsibility policy",
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
        label: "What counts as a revision?",
        anchor: helpCenterAnchor("faq", "revision-definition"),
      },
    ],
    timeline: [
      {
        label: "How long will my project take?",
        anchor: helpCenterAnchor("faq", "campaign-timeline"),
      },
      { label: "Timeline policy", anchor: helpCenterAnchor("policies", "timeline-policy") },
      {
        label: "Missing materials policy",
        anchor: helpCenterAnchor("policies", "missing-materials-policy"),
      },
    ],
    deliverables: [
      {
        label: "What results should I expect?",
        anchor: helpCenterAnchor("faq", "results-expectations"),
      },
      {
        label: "Final delivery policy",
        anchor: helpCenterAnchor("policies", "final-delivery-policy"),
      },
    ],
    pageFooter: [{ label: "Studio Help Center", anchor: undefined }],
  },
  boardLinks: {
    sidebar: "Help Center",
    awaitingPayment: {
      label: "Payment & refund policies",
      anchor: helpCenterAnchor("policies"),
    },
    quickGuide: {
      label: "Quick Policy Guide",
      anchor: "quick-guide",
    },
  },
} as const;
