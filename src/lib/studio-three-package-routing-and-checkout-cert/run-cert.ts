import { studioThreePackageRoutingAndCheckoutCertV1 as pack } from "@/config/studio-three-package-routing-and-checkout-cert-v1";
import {
  chooseHeadline,
  completeStep,
  emptyRoutingSession,
  setIntake,
  setSupport,
  validateStep,
  voiceOrHelpAsk,
} from "./machine";
import {
  runClipRoutingJourney,
  runShortFormRoutingJourney,
  runSocialRoutingJourney,
} from "./journeys";

export function runThreePackageRoutingCert() {
  const clip = runClipRoutingJourney();
  const shortForm = runShortFormRoutingJourney();
  const social = runSocialRoutingJourney();

  let failClosed = emptyRoutingSession();
  failClosed = chooseHeadline(failClosed, "clip_repurposing");
  failClosed = setIntake(failClosed, {
    businessName: "Test",
    cta: "Hi",
    sourceDurationMinutes: "10",
    rightsCleared: "yes",
  });
  const shortSourceBlocked = !validateStep(failClosed, "tell_us").ok;

  let menuBlockedSession = chooseHeadline(emptyRoutingSession(), "clip_repurposing");
  menuBlockedSession = setSupport(menuBlockedSession, "menu_price_list", "SELECT");
  const menuOnClipBlocked = menuBlockedSession.lastError != null;

  const helpDoesNotMutate = (() => {
    const before = chooseHeadline(emptyRoutingSession(), "social_and_promo_graphics");
    const after = voiceOrHelpAsk(before);
    return after.selectedHeadline === before.selectedHeadline && after.intake === before.intake;
  })();

  const payBeforeReviewBlocked = !completeStep(
    chooseHeadline(emptyRoutingSession(), "social_and_promo_graphics"),
    "payment",
  ).paid;

  return {
    packageId: pack.packageId,
    classification: "B_READY_WITH_EXPLICIT_LIMITS" as const,
    liveConversationRoomUnchanged: pack.liveConversationRoomUnchanged,
    prices: pack.launchPriceCents,
    clip,
    shortForm,
    social,
    failClosed: {
      shortSourceBlocked,
      menuOnClipBlocked,
      payBeforeReviewBlocked,
    },
    voiceHelpPageLevel: helpDoesNotMutate,
    finalDeliveryUntouched: true,
    liveMoneyTouched: false,
  };
}
