import type { RoutingHeadlineId } from "@/config/studio-three-package-routing-and-checkout-cert-v1";
import {
  chooseHeadline,
  chooseSomethingDifferent,
  completeStep,
  emptyRoutingSession,
  inspectTile,
  myStudioReadsJobTruth,
  payWithTestFixture,
  reopenStep,
  reviewSnapshot,
  setExtra,
  setIntake,
  setSupport,
  setSupportFacts,
  tileStates,
  type RoutingSession,
} from "./machine";

const ALL: RoutingHeadlineId[] = [
  "clip_repurposing",
  "short_form_video_editing",
  "social_and_promo_graphics",
];

function inspectAll(session: RoutingSession): RoutingSession {
  return ALL.reduce((next, id) => inspectTile(next, id), session);
}

function completeThroughReview(session: RoutingSession): RoutingSession {
  return ["your_package", "tell_us", "included_support", "studio_thank_you", "final_review"].reduce(
    (next, step) => completeStep(next, step as "your_package"),
    session,
  );
}

export function runClipRoutingJourney() {
  let s = inspectAll(emptyRoutingSession());
  s = chooseHeadline(s, "social_and_promo_graphics");
  const firstTiles = tileStates(s);
  s = setIntake(s, { businessName: "Cole & Kindred" });
  s = chooseSomethingDifferent(s);
  const reopened = tileStates(s);
  s = chooseHeadline(s, "clip_repurposing");
  const keptName = s.intake.businessName === "Cole & Kindred";
  const droppedTheme = s.intake.themeOrOffer == null;
  s = setIntake(s, {
    cta: "Book Cole & Kindred this week",
    sourceDurationMinutes: "23",
    rightsCleared: "yes",
  });
  s = setSupport(s, "ad_creative", "SELECT");
  s = setSupport(s, "reputation_customer_proof", "SKIP");
  s = setSupport(s, "email_and_text", "SKIP");
  s = setSupportFacts(s, { adOffer: "Fall consult" });
  s = setExtra(s, "flyer", "DECLINE");
  s = setExtra(s, "business_card", "DECLINE");
  s = completeThroughReview(s);
  const beforeEdit = reviewSnapshot(s);
  s = reopenStep(s, "tell_us");
  s = setIntake(s, { cta: "Visit Cole & Kindred this week" });
  s = completeStep(s, "tell_us");
  s = completeStep(s, "included_support");
  s = completeStep(s, "studio_thank_you");
  s = completeStep(s, "final_review");
  s = payWithTestFixture(s);
  const board = myStudioReadsJobTruth(s);
  return {
    inspectedAll: ALL.every((id) => s.inspected.includes(id)),
    firstOtherTilesLocked:
      firstTiles.clip_repurposing === "shaded_locked" &&
      firstTiles.short_form_video_editing === "shaded_locked",
    changeReopenedTiles: reopened.clip_repurposing === "available",
    keptSharedName: keptName,
    droppedIncompatibleFacts: droppedTheme,
    selectedSupport: reviewSnapshot(s)?.selectedSupport ?? [],
    skippedSupport: reviewSnapshot(s)?.skippedSupport ?? [],
    extras: s.extras,
    editedCta: s.intake.cta,
    priceCents: s.paidAmountCents,
    expectedPriceCents: 29900,
    hiddenCharge: beforeEdit?.hiddenCharge === false,
    paid: s.paid,
    liveMoney: s.jobTruth?.liveMoney === false,
    myStudio: board,
    lastError: s.lastError,
  };
}

export function runShortFormRoutingJourney() {
  let s = inspectAll(emptyRoutingSession());
  s = chooseHeadline(s, "clip_repurposing");
  s = setIntake(s, { businessName: "Northside Bike Repair" });
  s = chooseSomethingDifferent(s);
  s = chooseHeadline(s, "short_form_video_editing");
  s = setIntake(s, {
    cta: "Book a tune-up",
    markedClips: "3 marked clips",
    rightsCleared: "yes",
  });
  s = setSupport(s, "reputation_customer_proof", "SELECT");
  s = setSupport(s, "ad_creative", "SKIP");
  s = setSupport(s, "email_and_text", "SKIP");
  s = setSupportFacts(s, {
    testimonial: "They were gentle with my anxious rescue and she looked great after.",
    rightsConfirmed: "yes",
  });
  s = setExtra(s, "flyer", "DECLINE");
  s = setExtra(s, "business_card", "DECLINE");
  s = completeThroughReview(s);
  s = reopenStep(s, "tell_us");
  s = setIntake(s, { markedClips: "2 marked clips" });
  s = completeStep(s, "tell_us");
  s = completeStep(s, "included_support");
  s = completeStep(s, "studio_thank_you");
  s = completeStep(s, "final_review");
  s = payWithTestFixture(s);
  return {
    inspectedAll: ALL.every((id) => s.inspected.includes(id)),
    keptSharedName: s.intake.businessName === "Northside Bike Repair",
    selectedSupport: reviewSnapshot(s)?.selectedSupport ?? [],
    skippedSupport: reviewSnapshot(s)?.skippedSupport ?? [],
    extras: s.extras,
    editedMarkedClips: s.intake.markedClips,
    priceCents: s.paidAmountCents,
    expectedPriceCents: 14900,
    paid: s.paid,
    myStudio: myStudioReadsJobTruth(s),
    lastError: s.lastError,
  };
}

export function runSocialRoutingJourney() {
  let s = inspectAll(emptyRoutingSession());
  s = chooseHeadline(s, "clip_repurposing");
  s = chooseSomethingDifferent(s);
  s = chooseHeadline(s, "social_and_promo_graphics");
  s = setIntake(s, {
    businessName: "Maple & Wick",
    themeOrOffer: "Fall candle flight",
    factualWording: "Three seasonal scents. $28.",
  });
  s = setSupport(s, "ad_creative", "SELECT");
  s = setSupport(s, "email_and_text", "SKIP");
  s = setSupport(s, "reputation_customer_proof", "SKIP");
  s = setSupport(s, "menu_price_list", "SKIP");
  s = setSupport(s, "ai_local_visibility", "SKIP");
  s = setSupportFacts(s, { adOffer: "Fall candle flight" });
  s = setExtra(s, "flyer", "DECLINE");
  s = setExtra(s, "business_card", "DECLINE");
  s = completeThroughReview(s);
  s = reopenStep(s, "tell_us");
  s = setIntake(s, { themeOrOffer: "Fall candle flight this week" });
  s = completeStep(s, "tell_us");
  s = completeStep(s, "included_support");
  s = completeStep(s, "studio_thank_you");
  s = completeStep(s, "final_review");
  s = payWithTestFixture(s);
  const tilesAfterPay = tileStates(s);
  return {
    inspectedAll: ALL.every((id) => s.inspected.includes(id)),
    selectedSupport: reviewSnapshot(s)?.selectedSupport ?? [],
    skippedSupport: reviewSnapshot(s)?.skippedSupport ?? [],
    extras: s.extras,
    editedTheme: s.intake.themeOrOffer,
    priceCents: s.paidAmountCents,
    expectedPriceCents: 15920,
    paid: s.paid,
    paidLocksChange: chooseSomethingDifferent(s).lastError,
    tilesAfterPay,
    myStudio: myStudioReadsJobTruth(s),
    lastError: s.lastError,
  };
}
