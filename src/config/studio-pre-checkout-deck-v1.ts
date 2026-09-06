/**
 * Reversible pre-checkout deck — OWNER GO 2026-09-06.
 *
 * Let’s Get Started ↔ Voice Choice ↔ Conversation questions ↔
 * Review Together ↔ Choose Your Route ↔ Step 2 ↔ Step 3.
 *
 * Continue to Checkout is the end boundary. Checkout keeps the same
 * Lounge + frost, but does not glide as part of this deck.
 * Shortcuts (Back to Route, Change route, Edit Services) remain.
 *
 * Movement animation is not part of this pass.
 */

export const STUDIO_PRE_CHECKOUT_DECK_STATUS =
  "APPROVED_NOT_FROZEN" as const;

export const STUDIO_PRE_CHECKOUT_DECK_RESUME_KEY =
  "studio-pre-checkout-deck:resume" as const;

export const STUDIO_PRE_CHECKOUT_DECK_VOICE_CHOICE_KEY =
  "studio-pre-checkout-deck:voice-choice" as const;

export const studioPreCheckoutDeckV1 = {
  cards: [
    "lets-get-started",
    "voice-choice",
    "conversation-questions",
    "review-together",
    "choose-your-route",
    "step-2",
    "step-3",
  ] as const,
  checkoutIsDeckBoundary: true,
  shortcuts: ["Back to Route", "Change route", "Edit Services"] as const,
  doNotAddFlashySlideFirst: true,
  backToLetsGetStarted: "Back to Let’s Get Started",
  backToVoiceChoice: "Back to Voice Choice",
  backToPreviousQuestion: "Back to the previous question",
  backToReviewTogether: "Back to Review Together",
  backToChooseYourServices: "Back to Choose Your Services",
} as const;

function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* private mode */
  }
}

function consumeFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const present = window.sessionStorage.getItem(key) === "1";
    if (present) window.sessionStorage.removeItem(key);
    return present;
  } catch {
    return false;
  }
}

/** Back from Voice Choice to Let’s Get Started — do not restart. */
export function markPreCheckoutDeckResume(): void {
  writeFlag(STUDIO_PRE_CHECKOUT_DECK_RESUME_KEY);
}

export function consumePreCheckoutDeckResume(): boolean {
  return consumeFlag(STUDIO_PRE_CHECKOUT_DECK_RESUME_KEY);
}

/** Let’s Get Started after a deck back should land on Voice Choice. */
export function markPreCheckoutDeckVoiceChoice(): void {
  writeFlag(STUDIO_PRE_CHECKOUT_DECK_VOICE_CHOICE_KEY);
}

export function consumePreCheckoutDeckVoiceChoice(): boolean {
  return consumeFlag(STUDIO_PRE_CHECKOUT_DECK_VOICE_CHOICE_KEY);
}
