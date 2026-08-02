import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";

export const payment = {
  brand: "THE STUDIO",
  /** Customer-facing page title — honest for non-live card processing. */
  pageTitle: "Review and Confirm",
  pageLeadLines: [
    "Review your Studio Plan, then confirm to continue.",
    "This build records your plan locally so Project Intake can open next. Card payment processing is not connected yet.",
  ] as const,
  backToStudioPlanLabel: "← Back to Studio Plan",
  editProjectLabel: "Edit Project",
  /** @deprecated use pageTitle */
  title: customerJourneyStepName("secure-checkout"),
  sections: {
    summary: "Your Studio Plan",
    deliverables: "Selected services",
    billing: "Contact Information",
    payment: "Checkout details",
    next: "What Happens Next",
    /** @deprecated use billing + payment */
    form: "Checkout",
  },
  summary: {
    recommendedServicesLabel: "Selected services",
    oneTimeSubtotalLabel: "One-Time Subtotal",
    monthlySubtotalLabel: "Monthly Subtotal",
    amountDueTodayLabel: "Estimated Investment",
    cardProcessingDisclosureNote:
      "Estimated Investment reflects your selected services. Live card processing is not connected in this build.",
    investmentLabel: "Estimated Investment",
    monthlyTotalLabel: "Monthly Total",
    includesLabel: "Includes:",
    timelineLabel: "Timeline",
    notesLabel: "Studio Notes",
  },
  form: {
    fullName: "Full Name",
    businessName: "Business Name",
    email: "Email",
    phone: "Phone",
    cardNumber: "Card Number",
    expDate: "Exp Date",
    cvv: "CVV",
    zipCode: "ZIP Code",
    acknowledgmentHeading: "Before you continue",
    acknowledgmentBody: [
      "Please confirm that you reviewed your Studio Plan, including what is included, pricing, timing, and what you are responsible for.",
      "The Studio creates the approved marketing work. Results such as sales, leads, and bookings are not guaranteed.",
    ] as const,
    termsLabel:
      "I reviewed my Studio Plan and understand that confirming checkout and completing Project Intake are required before work can move forward.",
    viewPlanDetailsLabel: "View your selected plan details above",
    submitLabel: "Confirm and continue to Project Intake",
    paymentSecurityNote:
      "This checkout step records your Studio Plan on this device so you can continue to Project Intake. Card payment processing is not connected in this build.",
    paymentReassurance:
      "Card payment processing is not connected in this build. Confirming continues you to Project Intake.",
  },
  /** Local dev or NEXT_PUBLIC_PAYMENT_SANDBOX=1 (Vercel Preview only — not Production). */
  sandbox: {
    label: "Developer Sandbox",
    hint: "Simulates a successful checkout for journey testing. No card is charged.",
    buttonLabel: "Test continue to Project Intake",
    badge: "Test only",
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
      "You can follow project status on your Studio Board after Project Intake. Automated stage emails are not sent in this build.",
  },
  secureNote:
    "This checkout step records your Studio Plan locally so you can continue to Project Intake. Card payment processing is not connected in this build.",
  intakeExplanation:
    "After you confirm checkout, Project Intake opens so you can share the details and materials we need for your approved Studio Plan.",
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
