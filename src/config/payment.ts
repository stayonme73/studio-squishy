import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";

export const payment = {
  brand: "THE STUDIO",
  /** Customer-facing page title — confirm the plan, then continue to Stripe. */
  pageTitle: "Review and Confirm",
  pageLeadLines: [
    "Review your Studio Plan, then continue to secure checkout.",
    "Payment is confirmed by Stripe. Returning to this page alone does not mark your project paid.",
  ] as const,
  backToStudioPlanLabel: "← Back to Studio Plan",
  editProjectLabel: "Edit Project",
  /** @deprecated use pageTitle */
  title: customerJourneyStepName("secure-checkout"),
  sections: {
    summary: "Your Studio Plan",
    deliverables: "Selected services",
    /** Hosted Stripe Checkout — confirm plan, then redirect (no local card form). */
    confirm: "Confirm and continue",
    next: "What Happens Next",
    /** @deprecated Hosted Checkout does not collect contact/card in The Studio. */
    billing: "Contact Information",
    /** @deprecated Card entry is Stripe-hosted only. */
    payment: "Checkout details",
    /** @deprecated use confirm */
    form: "Confirm and continue",
  },
  summary: {
    recommendedServicesLabel: "Selected services",
    oneTimeSubtotalLabel: "One-Time Subtotal",
    monthlySubtotalLabel: "Monthly Subtotal",
    amountDueTodayLabel: "Estimated Investment",
    cardProcessingDisclosureNote:
      "Estimated Investment reflects your selected services. The amount charged is confirmed with Stripe.",
    investmentLabel: "Estimated Investment",
    monthlyTotalLabel: "Monthly Total",
    includesLabel: "Includes:",
    timelineLabel: "Timeline",
    notesLabel: "Studio Notes",
  },
  form: {
    /** @deprecated Not collected on hosted Checkout — Stripe collects payment details. */
    fullName: "Full Name",
    /** @deprecated Not collected on hosted Checkout. */
    businessName: "Business Name",
    /** @deprecated Not collected on hosted Checkout — optional on Stripe. */
    email: "Email",
    /** @deprecated Not collected on hosted Checkout. */
    phone: "Phone",
    /** @deprecated Forbidden on Studio hosted-checkout UI — Stripe only. */
    cardNumber: "Card Number",
    /** @deprecated Forbidden on Studio hosted-checkout UI — Stripe only. */
    expDate: "Exp Date",
    /** @deprecated Forbidden on Studio hosted-checkout UI — Stripe only. */
    cvv: "CVV",
    /** @deprecated Forbidden on Studio hosted-checkout UI — Stripe only. */
    zipCode: "ZIP Code",
    acknowledgmentHeading: "Before you continue",
    acknowledgmentBody: [
      "Please confirm that you reviewed your Studio Plan, including what is included, pricing, timing, and what you are responsible for.",
      "The Studio creates the approved marketing work. Results such as sales, leads, and bookings are not guaranteed.",
    ] as const,
    termsLabel:
      "I reviewed my Studio Plan and understand that confirming checkout and completing Project Intake are required before work can move forward.",
    viewPlanDetailsLabel: "View your selected plan details above",
    submitLabel: "Continue to secure checkout",
    paymentSecurityNote:
      "You will complete payment on Stripe’s secure checkout page. The Studio marks your project paid only after Stripe confirms the payment.",
    paymentReassurance:
      "Continue opens Stripe Checkout. Your project stays unpaid until Stripe confirms payment.",
  },
  /**
   * Developer fixture only — hidden from normal customer checkout.
   * Visible when NEXT_PUBLIC_DEV_TOOLS=1 or ?studioPaymentSandbox=1.
   */
  sandbox: {
    label: "Developer Sandbox",
    hint: "Local fixture only. Does not open Stripe Checkout.",
    buttonLabel: "Test pay with sandbox confirm",
    badge: "Dev only",
  },
  whatsNext: {
    steps: [
      { label: "Checkout confirmed", marker: "number" },
      { label: "Project Intake opens", marker: "number" },
      { label: "You provide your materials", marker: "number" },
      { label: "Required information is reviewed", marker: "number" },
      { label: "You'll review the work", marker: "number" },
      { label: "Final delivery", marker: "number" },
    ] as const,
    emailReassurance:
      "You can follow project status on your Studio Board after Project Intake. Email notices are a courtesy. Your Studio Board is the source of truth.",
  },
  secureNote:
    "Payment truth comes from Stripe confirmation. The success return page is not fulfillment by itself.",
  intakeExplanation:
    "After Stripe confirms payment, Project Intake opens so you can share the details and materials we need for your approved Studio Plan.",
  routes: {
    studioBoard: "/studio-board",
    studioGuide: legacyRouteQuarantineV1.activeFrontDoor,
    studioGuidePrototype: legacyRouteQuarantineV1.activeFrontDoor,
  },
  /** Onboarding step index on the payment page — Payment is always step 0 here. */
  workflowStepIndex: {
    payment: 0,
    intake: 1,
    teamReview: 2,
    campaignBegins: 3,
  },
} as const;

export type PaymentWorkflowStepState = "complete" | "current" | "upcoming";

export function paymentWorkflowStepState(
  stepIndex: number,
  currentStepIndex: number,
): PaymentWorkflowStepState {
  if (stepIndex < currentStepIndex) return "complete";
  if (stepIndex === currentStepIndex) return "current";
  return "upcoming";
}

export function paymentWorkflowStepIcon(state: PaymentWorkflowStepState): string {
  if (state === "complete") return "✅";
  if (state === "current") return "🔵";
  return "○";
}

export function paymentIntakeHref(_packageId: StudioGuidePackageId): string {
  return legacyRouteQuarantineV1.activeIntake;
}

const PACKAGE_IDS = ["spark", "momentum", "growth"] as const;

export function paymentHref(_packageId: StudioGuidePackageId): string {
  return legacyRouteQuarantineV1.activeFrontDoor;
}

export function parsePaymentPackageId(
  params: Record<string, string | string[] | undefined>,
): StudioGuidePackageId | undefined {
  const direct = params.package;
  if (typeof direct === "string" && PACKAGE_IDS.includes(direct as StudioGuidePackageId)) {
    return direct as StudioGuidePackageId;
  }

  for (const id of PACKAGE_IDS) {
    if (id in params) return id;
  }

  return undefined;
}

export function paymentPackageLabel(packageId: StudioGuidePackageId): string {
  return getStudioGuideV1Package(packageId)?.label ?? packageId;
}

export function paymentSummaryIncludes(packageId: StudioGuidePackageId): readonly string[] {
  const pkg = getStudioGuideV1Package(packageId);
  if (!pkg) return [];
  return pkg.deliverables.map((item) => paymentDeliverableShortLabel(item.title));
}

function paymentDeliverableShortLabel(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("strategy session")) return "Strategy";
  if (lower.includes("campaign concept")) return "Campaign Concepts";
  if (lower.includes("social")) return "Social";
  if (lower.includes("email")) return "Email";
  if (lower.includes("sms")) return "SMS";
  if (lower.includes("calendar")) return "Calendar";
  if (lower.includes("video")) return "Video Scripts";
  if (lower.includes("priority")) return "Priority Queue";
  if (lower.includes("revision")) return title;
  return title;
}

export function paymentTimelineLabel(packageId: StudioGuidePackageId): string {
  const pkg = getStudioGuideV1Package(packageId);
  if (!pkg) return "";
  if (pkg.timeline.toLowerCase().includes("production starts")) {
    return "After production starts";
  }
  return pkg.timeline;
}

export const paymentPackageAccents: Record<
  StudioGuidePackageId,
  { spine: string; check: string }
> = {
  spark: { spine: "#f9d134", check: "#d94e2b" },
  momentum: { spine: "#d94e2b", check: "#d94e2b" },
  growth: { spine: "#2c3e50", check: "#2c3e50" },
};
