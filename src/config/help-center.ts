import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { studioPolicies } from "@/config/policies";
import { studioBoard } from "@/config/studio-board";

export type HelpCenterFrom = "campaign-details" | "studio-board" | "payment" | "route-map";

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
    campaignDetails: "Back to Project Record",
    payment: "Back to Conversation Room",
    routeMap: "Back to Conversation Room",
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
          "Begin in the Conversation Room, complete payment, then finish Intake so The Studio can prepare your work.",
        anchor: "faq-after-payment",
        learnMoreLabel: "What happens after I pay?",
      },
      {
        id: "payment",
        situation: "Payment",
        summary: "Per job. Payment is required before work can proceed. Paying alone does not start production.",
        anchor: "policy-payment-policy",
        learnMoreLabel: "Payment policy",
      },
      {
        id: "production-begins",
        situation: "Production Begins",
        summary: "Per job: payment received, Project Details complete, materials accepted, job moved into production. Then non-refundable.",
        anchor: "policy-production-policy",
        learnMoreLabel: "Production policy",
      },
      {
        id: "missing-materials",
        situation: "Missing Materials",
        summary: "48-hour reminder, then 72-hour Waiting on Client if required materials are still missing.",
        anchor: "policy-missing-materials-policy",
        learnMoreLabel: "Missing materials policy",
      },
      {
        id: "waiting-on-client",
        situation: "Waiting on Client",
        summary: "That job pauses until required information or materials are received. Timeline pauses with it.",
        anchor: "policy-waiting-on-client-policy",
        learnMoreLabel: "Waiting on Client policy",
      },
      {
        id: "review-room",
        situation: "Review Room",
        summary: "Annotate, approve, or request revisions directly on your project.",
        anchor: "policy-creative-room-policy",
        learnMoreLabel: "Review Room policy",
      },
      {
        id: "revisions",
        situation: "Revisions",
        summary: "Included revisions depend on the service you purchased. See your Project Record.",
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
        summary: "Per job. Refund may be approved before production starts. Non-refundable after production starts on that job.",
        anchor: "policy-refund-policy",
        learnMoreLabel: "Refund policy",
      },
      {
        id: "timeline",
        situation: "Timeline",
        summary: "Estimates depend on services, materials, and timely client responses.",
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
      id: "expectations",
      label: "Expectations",
      faqIds: ["results-expectations"] as const,
    },
  ] as const,
  footer: {
    campaignHint:
      "Questions about your active project? Check your Project Record for status and progress.",
    studioBoardLabel: "Studio Board",
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
      { label: "Revision policy", anchor: helpCenterAnchor("policies", "revision-policy") },
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
