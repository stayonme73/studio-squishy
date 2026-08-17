/**
 * Build Your Project — customer-facing copy and routes for the Project Builder workspace.
 * Internal modules may use ProjectBuilder naming.
 * UX reference: Customer Experience North Star board (interaction model + composition).
 */

import { customerJourneyStepName, customerJourneyStepRoute } from "@/config/customer-journey-v1";

export const PROJECT_BUILDER_V1 = {
  pageTitle: customerJourneyStepName("build-your-project"),
  pageLead: "Browse the services on your route. Learn what each includes, then add what fits your project.",
  deliverablesHeading: "Services on your route",
  summaryHeading: "Project Summary",
  selectedCountLabel: "Services",
  totalLabel: "Estimated Investment",
  timelineNote: "Timeline reviewed before checkout",
  reviewStudioPlanCta: "Review Your Studio Plan",
  continueToCheckoutCta: "Continue to Checkout",
  backToBuilderLabel: "Back to services",
  backToRouteMapLabel: "Back to Route Map",
  routeContextEyebrow: "Your route",
  checkoutNotLiveNote:
    "Continue to checkout to review your Studio Plan and pay on Stripe’s secure checkout page. The Studio marks your project paid only after Stripe confirms payment.",
  emptySelectionHint:
    "Select at least one service to review your Studio Plan. Timeline is reviewed before checkout.",
  reviewStudioPlanReadyHint:
    "Ready to continue? Review your selected services and project total.",
  squishyLabel: "Squishy",
  customerLabel: "Example customer",
  studioConversationLabel: "Example conversation",
  exampleConversationEyebrow: "Example only — not your conversation",
  squishyWelcome:
    "Open any service below to see exactly what's included. Add what fits — your Project Summary updates as you go.",
  learnMoreCta: "Learn More",
  addToProjectCta: "+ Add to Project",
  removeFromProjectCta: "Remove",
  inProjectBadge: "✓ In Project",
  closeDetailsCta: "Close",
  addToProjectDrawerCta: "+ Add to Project",
  alreadyInProjectDrawerCta: "In Project",
  bestForLabel: "Best For",
  serviceTimingNote: "Estimated timing for this service",
  studioPlanHeading: "Review Your Studio Plan",
  studioPlanIntro:
    "Review your selected services before continuing to Checkout. You'll provide your project materials after checkout confirmation.",
  editProjectCta: "Edit Project",
  viewScopeCta: "View Scope",
  planDeliverablesHeading: "Selected services",
  planTimelineHeading: "Estimated Timeline",
  planTimelineOverallLabel: "Overall project estimate",
  planTimelineDeliverablesLabel: "Individual services",
  planRevisionHeading: "Revision Policy",
  planRevisionSummary: [
    "One revision round is included for each service.",
    "Studio mistakes are corrected at no charge.",
    "Additional requested work follows the Project Change process.",
  ] as const,
  viewRevisionPolicyCta: "View complete revision policy",
  hideRevisionPolicyCta: "Hide complete revision policy",
  planResponsibilitiesHeading: "We'll Need",
  planResponsibilitiesIntro:
    "You'll provide these after Checkout during Project Intake.",
  planResponsibilitiesEmpty: "Requirements depend on the services you select.",
} as const;

export type ProjectBuilderConversationSpeaker = "squishy" | "customer";

export type ProjectBuilderConversationTurn = {
  speaker: ProjectBuilderConversationSpeaker;
  text: string;
};

/** Static example thread for layout — not a live customer conversation. */
export const PROJECT_BUILDER_CONVERSATION_DEMO: readonly ProjectBuilderConversationTurn[] = [
  {
    speaker: "squishy",
    text: "Hi! Tell me what you're trying to accomplish and I'll help you build the right starting point.",
  },
  {
    speaker: "customer",
    text: "I just need people to know about my grand opening.",
  },
  {
    speaker: "squishy",
    text: "Got it — I'd start with Make Me a Flyer and Make My Social Media Posts. One clear message, then visibility.",
  },
  {
    speaker: "customer",
    text: "Can I add both to my project?",
  },
] as const;

export const PROJECT_BUILDER_HREF = customerJourneyStepRoute("build-your-project");

export function projectBuilderHref(roadId?: string): string {
  if (!roadId) return PROJECT_BUILDER_HREF;
  return `${PROJECT_BUILDER_HREF}?road=${encodeURIComponent(roadId)}`;
}
