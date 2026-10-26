import { studioThankYouAmount } from "@/config/studio-thank-you-discount-v1";
import {
  threePackageSupportMatrix,
  type ThreePackageSupportId,
} from "@/config/studio-three-package-architecture-reconciliation-v1";
import {
  THREE_PACKAGE_LAUNCH_PRICE_CENTS,
  THREE_PACKAGE_STEPS,
  threePackageHeadlineCopy,
  type ExtraId,
  type RoutingHeadlineId,
  type StepStatus,
  type ThreePackageStepId,
} from "@/config/studio-three-package-routing-and-checkout-cert-v1";

export type SupportChoice = "SELECT" | "SKIP";
export type ExtraChoice = "ACCEPT" | "DECLINE";
export type TileState = "available" | "selected" | "shaded_locked";

export type RoutingSession = {
  inspected: readonly RoutingHeadlineId[];
  selectedHeadline: RoutingHeadlineId | null;
  previousHeadline: RoutingHeadlineId | null;
  chooseSomethingDifferentOpen: boolean;
  openStep: ThreePackageStepId | null;
  stepStatus: Record<ThreePackageStepId, StepStatus>;
  intake: Record<string, string>;
  support: Partial<Record<ThreePackageSupportId, SupportChoice>>;
  supportFacts: Record<string, string>;
  extras: Partial<Record<ExtraId, ExtraChoice>>;
  extraFacts: Record<string, string>;
  paid: boolean;
  paidAmountCents: number | null;
  jobTruth: Record<string, unknown> | null;
  handoff: string | null;
  lastError: string | null;
};

const SHARED_INTAKE_KEYS = ["businessName"] as const;

export function emptyRoutingSession(): RoutingSession {
  return {
    inspected: [],
    selectedHeadline: null,
    previousHeadline: null,
    chooseSomethingDifferentOpen: false,
    openStep: null,
    stepStatus: {
      your_package: "NOT_STARTED",
      tell_us: "NOT_STARTED",
      included_support: "NOT_STARTED",
      studio_thank_you: "NOT_STARTED",
      final_review: "NOT_STARTED",
      payment: "NOT_STARTED",
    },
    intake: {},
    support: {},
    supportFacts: {},
    extras: {},
    extraFacts: {},
    paid: false,
    paidAmountCents: null,
    jobTruth: null,
    handoff: null,
    lastError: null,
  };
}

export function inspectTile(session: RoutingSession, id: RoutingHeadlineId): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  const inspected = session.inspected.includes(id) ? session.inspected : [...session.inspected, id];
  return { ...session, inspected, lastError: null };
}

export function tileStates(session: RoutingSession): Record<RoutingHeadlineId, TileState> {
  const ids: RoutingHeadlineId[] = [
    "clip_repurposing",
    "short_form_video_editing",
    "social_and_promo_graphics",
  ];
  const out = {} as Record<RoutingHeadlineId, TileState>;
  for (const id of ids) {
    if (!session.selectedHeadline || session.chooseSomethingDifferentOpen) {
      out[id] = session.selectedHeadline === id ? "selected" : "available";
    } else if (session.selectedHeadline === id) {
      out[id] = "selected";
    } else {
      out[id] = "shaded_locked";
    }
  }
  return out;
}

export function visibleSupport(headline: RoutingHeadlineId): ThreePackageSupportId[] {
  const row = threePackageSupportMatrix[headline];
  return (Object.entries(row) as [ThreePackageSupportId, string][])
    .filter(([, fit]) => fit !== "NOT_APPROPRIATE")
    .map(([id]) => id);
}

export function requiredIntakeKeys(headline: RoutingHeadlineId): readonly string[] {
  if (headline === "clip_repurposing") {
    return ["businessName", "cta", "sourceDurationMinutes", "rightsCleared"];
  }
  if (headline === "short_form_video_editing") {
    return ["businessName", "cta", "markedClips", "rightsCleared"];
  }
  return ["businessName", "themeOrOffer", "factualWording"];
}

function keepSharedFacts(intake: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const key of SHARED_INTAKE_KEYS) {
    if (intake[key]) next[key] = intake[key]!;
  }
  return next;
}

export function chooseHeadline(
  session: RoutingSession,
  id: RoutingHeadlineId,
): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  const previousHeadline = session.selectedHeadline;
  const intake =
    previousHeadline && previousHeadline !== id ? keepSharedFacts(session.intake) : session.intake;
  return {
    ...session,
    selectedHeadline: id,
    previousHeadline,
    chooseSomethingDifferentOpen: false,
    openStep: "your_package",
    stepStatus: {
      your_package: "IN_PROGRESS",
      tell_us: "NOT_STARTED",
      included_support: "NOT_STARTED",
      studio_thank_you: "NOT_STARTED",
      final_review: "NOT_STARTED",
      payment: "NOT_STARTED",
    },
    intake,
    support: {},
    supportFacts: {},
    lastError: null,
  };
}

export function chooseSomethingDifferent(session: RoutingSession): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  if (!session.selectedHeadline) return { ...session, lastError: "Choose a package first." };
  return { ...session, chooseSomethingDifferentOpen: true, lastError: null };
}

export function completeStep(
  session: RoutingSession,
  step: ThreePackageStepId,
): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  if (!session.selectedHeadline) return { ...session, lastError: "Choose a package first." };
  const gate = validateStep(session, step);
  if (!gate.ok) {
    return {
      ...session,
      stepStatus: { ...session.stepStatus, [step]: "ACTION_NEEDED" },
      lastError: gate.message,
    };
  }
  const index = THREE_PACKAGE_STEPS.indexOf(step);
  const next = THREE_PACKAGE_STEPS[index + 1] ?? null;
  return {
    ...session,
    stepStatus: {
      ...session.stepStatus,
      [step]: "COMPLETE",
      ...(next ? { [next]: "IN_PROGRESS" as const } : {}),
    },
    openStep: next,
    lastError: null,
  };
}

export function reopenStep(session: RoutingSession, step: ThreePackageStepId): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  if (session.stepStatus[step] === "NOT_STARTED") {
    return { ...session, lastError: "Finish the current step first." };
  }
  return {
    ...session,
    openStep: step,
    stepStatus: { ...session.stepStatus, [step]: "IN_PROGRESS" },
    lastError: null,
  };
}

export function setIntake(
  session: RoutingSession,
  facts: Record<string, string>,
): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  return { ...session, intake: { ...session.intake, ...facts }, lastError: null };
}

export function setSupport(
  session: RoutingSession,
  id: ThreePackageSupportId,
  choice: SupportChoice,
): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  if (!session.selectedHeadline) return { ...session, lastError: "Choose a package first." };
  if (!visibleSupport(session.selectedHeadline).includes(id)) {
    return { ...session, lastError: "That support option is not available on this package." };
  }
  return { ...session, support: { ...session.support, [id]: choice }, lastError: null };
}

export function setSupportFacts(
  session: RoutingSession,
  facts: Record<string, string>,
): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  return { ...session, supportFacts: { ...session.supportFacts, ...facts }, lastError: null };
}

export function setExtra(session: RoutingSession, id: ExtraId, choice: ExtraChoice): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  if (choice === "ACCEPT") {
    return {
      ...session,
      lastError: "Flyer and Business Card thank-you extras are retired.",
    };
  }
  return { ...session, extras: { ...session.extras, [id]: choice }, lastError: null };
}

export function setExtraFacts(
  session: RoutingSession,
  facts: Record<string, string>,
): RoutingSession {
  if (session.paid) return { ...session, lastError: "Purchased configuration is locked." };
  return { ...session, extraFacts: { ...session.extraFacts, ...facts }, lastError: null };
}

export function totalDueCents(headline: RoutingHeadlineId): number {
  return studioThankYouAmount(THREE_PACKAGE_LAUNCH_PRICE_CENTS[headline]).amountDueCents;
}

export function reviewSnapshot(session: RoutingSession) {
  if (!session.selectedHeadline) return null;
  const copy = threePackageHeadlineCopy[session.selectedHeadline];
  const visible = visibleSupport(session.selectedHeadline);
  return {
    packageName: copy.name,
    priceUsd: copy.priceUsd,
    priceCents: totalDueCents(session.selectedHeadline),
    description: copy.description,
    limits: copy.limits,
    revision: copy.revision,
    intake: session.intake,
    selectedSupport: visible.filter((id) => session.support[id] === "SELECT"),
    skippedSupport: visible.filter((id) => session.support[id] === "SKIP"),
    extras: session.extras,
    totalDueCents: totalDueCents(session.selectedHeadline),
    hiddenCharge: false,
  };
}

export function voiceOrHelpAsk(session: RoutingSession): RoutingSession {
  return { ...session, lastError: null };
}

function clipDurationOk(value: string): boolean {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 15 && minutes <= 60;
}

export function validateStep(
  session: RoutingSession,
  step: ThreePackageStepId,
): { ok: true } | { ok: false; message: string } {
  const headline = session.selectedHeadline;
  if (!headline) return { ok: false, message: "Choose a package first." };
  if (step === "your_package") return { ok: true };
  if (step === "tell_us") {
    for (const key of requiredIntakeKeys(headline)) {
      if (!session.intake[key]?.trim()) {
        return { ok: false, message: "Please answer the questions for this package." };
      }
    }
    if (headline === "clip_repurposing" && !clipDurationOk(session.intake.sourceDurationMinutes ?? "")) {
      return { ok: false, message: "The video needs to be 15 to 60 minutes." };
    }
    if (session.intake.accountAccess === "yes") {
      return { ok: false, message: "The Studio does not take account access." };
    }
    return { ok: true };
  }
  if (step === "included_support") {
    const visible = visibleSupport(headline);
    for (const id of visible) {
      if (!session.support[id]) {
        return { ok: false, message: "Choose SELECT or SKIP for each included option." };
      }
    }
    if (session.support.reputation_customer_proof === "SELECT") {
      if (!session.supportFacts.testimonial?.trim() || session.supportFacts.rightsConfirmed !== "yes") {
        return { ok: false, message: "Reputation needs a real customer quote and your permission to use it." };
      }
    }
    if (session.support.ad_creative === "SELECT" && !session.supportFacts.adOffer?.trim()) {
      return { ok: false, message: "Ad Creative needs one offer." };
    }
    if (session.support.email_and_text === "SELECT" && !session.supportFacts.emailCampaign?.trim()) {
      return { ok: false, message: "Email & Text needs a separate campaign, not a second review request." };
    }
    if (
      session.support.reputation_customer_proof === "SELECT" &&
      session.support.email_and_text === "SELECT" &&
      session.supportFacts.emailCampaign === "review-request"
    ) {
      return { ok: false, message: "Skip the extra review-request. Reputation already includes that wording." };
    }
    if (session.support.menu_price_list === "SELECT" && !session.supportFacts.menuItems?.trim()) {
      return { ok: false, message: "Menu / Price List needs your items and prices." };
    }
    if (session.support.ai_local_visibility === "SELECT") {
      if (!session.supportFacts.city?.trim() || !session.supportFacts.services?.trim()) {
        return { ok: false, message: "Local Visibility needs your city and real services." };
      }
      if (session.supportFacts.fetchWebsite === "yes") {
        return { ok: false, message: "The Studio does not look up or scrape your website." };
      }
    }
    return { ok: true };
  }
  if (step === "studio_thank_you") {
    if (session.extras.flyer === "ACCEPT" || session.extras.business_card === "ACCEPT") {
      return { ok: false, message: "Flyer and Business Card thank-you extras are retired." };
    }
    if (session.extras.flyer !== "DECLINE" || session.extras.business_card !== "DECLINE") {
      return { ok: false, message: "Flyer and Business Card thank-you extras are retired." };
    }
    return { ok: true };
  }
  if (step === "final_review") {
    const snap = reviewSnapshot(session);
    if (!snap || snap.priceCents !== totalDueCents(headline) || snap.hiddenCharge) {
      return { ok: false, message: "The review does not match the package price." };
    }
    return { ok: true };
  }
  if (step === "payment") {
    return { ok: false, message: "Use the test payment step. Live customer money is not used here." };
  }
  return { ok: true };
}

export function payWithTestFixture(session: RoutingSession): RoutingSession {
  if (session.paid) return { ...session, lastError: "Already paid." };
  const review = validateStep(session, "final_review");
  if (!review.ok) return { ...session, lastError: review.message, stepStatus: { ...session.stepStatus, final_review: "ACTION_NEEDED" } };
  if (session.openStep !== "payment" && session.stepStatus.final_review !== "COMPLETE") {
    return { ...session, lastError: "Finish Final Review before payment." };
  }
  const headline = session.selectedHeadline!;
  const amount = totalDueCents(headline);
  const snap = reviewSnapshot(session)!;
  return {
    ...session,
    paid: true,
    paidAmountCents: amount,
    openStep: null,
    stepStatus: { ...session.stepStatus, final_review: "COMPLETE", payment: "COMPLETE" },
    jobTruth: {
      headline,
      amountCents: amount,
      selectedSupport: snap.selectedSupport,
      skippedSupport: snap.skippedSupport,
      extras: session.extras,
      intake: session.intake,
      supportFacts: session.supportFacts,
      extraFacts: session.extraFacts,
      locked: true,
      liveMoney: false,
      fixture: "test_fixture",
    },
    handoff: "/studio-board",
    lastError: null,
  };
}

export function myStudioReadsJobTruth(session: RoutingSession): {
  ok: boolean;
  amountCents: number | null;
  headline: RoutingHeadlineId | null;
} {
  if (!session.paid || !session.jobTruth) return { ok: false, amountCents: null, headline: null };
  return {
    ok: session.handoff === "/studio-board" && session.jobTruth.locked === true,
    amountCents: session.paidAmountCents,
    headline: session.selectedHeadline,
  };
}
