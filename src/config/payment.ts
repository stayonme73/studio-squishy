import type { StudioGuidePackageId } from "@/config/studio-guide";
import { customerJourneyStepName } from "@/config/customer-journey-v1";
import { projectDetailsHref } from "@/config/project-details";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";

export const payment = {
  brand: "THE STUDIO",
  /** Customer-facing page title — not the journey step name. */
  pageTitle: "Complete Your Studio Plan",
  pageLeadLines: [
    "Your recommendations have been approved.",
    "Complete payment to begin your project.",
  ] as const,
  /** @deprecated use pageTitle */
  title: customerJourneyStepName("secure-checkout"),
  sections: {
    summary: "Your Studio Plan",
    form: "Secure Payment",
    next: "What Happens Next",
  },
  summary: {
    recommendedServicesLabel: "YOUR SELECTED SERVICES",
    oneTimeSubtotalLabel: "One-Time Subtotal",
    monthlySubtotalLabel: "Monthly Subtotal",
    amountDueTodayLabel: "Amount Due Today",
    cardProcessingDisclosureNote:
      "A credit-card processing fee may apply. Any applicable fee and your final total will be shown before payment.",
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
    acknowledgmentHeading: "Before you pay",
    acknowledgmentBody: [
      "Please confirm that you reviewed your Studio Plan, including what is included, pricing, timing, and what you are responsible for.",
      "The Studio creates the approved marketing work. Results such as sales, leads, and bookings are not guaranteed.",
    ] as const,
    termsLabel: "I reviewed my Studio Plan and agree to proceed with payment.",
    viewPlanDetailsLabel: "View your selected plan details above",
    submitLabel: "Complete Payment",
  },
  /** Local dev or NEXT_PUBLIC_PAYMENT_SANDBOX=1 (Vercel Preview only — not Production). */
  sandbox: {
    label: "Developer Sandbox",
    hint: "Simulates a successful payment for journey testing. No card is charged.",
    buttonLabel: "Test Payment",
    badge: "Test only",
  },
  whatsNext: {
    steps: [
      { label: "Payment received", marker: "check" },
      { label: "Project Details", marker: "arrow" },
      { label: "Creative Production Begins", marker: "arrow" },
      { label: "First Concepts (Within 7 Business Days)", marker: "arrow" },
      { label: "Review Room", marker: "arrow" },
      { label: "Final Delivery", marker: "arrow" },
    ] as const,
  },
  secureNote:
    "Payment is securely encrypted. After payment, you'll share the details and materials we need to complete your approved Studio Plan.",
  intakeExplanation:
    "After payment, you'll share the details and materials we need to complete your approved Studio Plan.",
  routes: {
    studioBoard: "/studio-board",
    studioGuide: "/studio-guide-prototype",
    studioGuidePrototype: "/studio-guide-prototype",
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

export function paymentIntakeHref(packageId: StudioGuidePackageId): string {
  return projectDetailsHref(packageId);
}

const PACKAGE_IDS = ["spark", "momentum", "growth"] as const;

export function paymentHref(packageId: StudioGuidePackageId): string {
  return `/payment?package=${packageId}`;
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
  if (pkg.timeline.toLowerCase().includes("7 business days")) {
    return "7 Business Days";
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
