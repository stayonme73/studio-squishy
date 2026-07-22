/**
 * Conversation Room — Studio Guide sequence (proven Lobby Guide wording).
 * Bubbles + speak + type. One tablet only.
 * @see docs/lobby-guide-conversation-v1-locked.md
 * @see src/config/studio-guide-conversation-v1.ts
 */

import { studioPlanPreCheckoutFlexibilityV1 } from "@/config/studio-plan-pre-checkout-flexibility-v1";
import type { GuideConversationStep } from "@/config/studio-guide-conversation-v1";
import { studioGuideConversationV1 } from "@/config/studio-guide-conversation-v1";

export type GuideBubbleMode = "single" | "multi";

export type ConversationRoomGuideQuestion = {
  step: GuideConversationStep;
  question: string;
  canSkip: boolean;
  bubbles: readonly string[];
  bubbleMode: GuideBubbleMode;
  /** When selected, show the free-date field (deadline step). */
  opensDateFieldBubble?: string;
  placeholder: string;
};

/** Shared focus target for Type / Ask controls in the Studio control strip. */
export const STUDIO_GUIDE_TYPE_FIELD_ID = "studio-guide-type-field" as const;

export const conversationRoomGuideV1 = {
  eyebrow: studioGuideConversationV1.guideRoleLabel,
  continueLabel: studioGuideConversationV1.continueLabel,
  skipLabel: studioGuideConversationV1.skipLabel,
  correctLabel: studioGuideConversationV1.correctLabel,
  confirmLabel: studioGuideConversationV1.confirmLabel,
  confirmedTitle: studioGuideConversationV1.confirmedTitle,
  confirmedSavedBadge: studioGuideConversationV1.confirmedSavedBadge,
  confirmedBody: studioGuideConversationV1.confirmedBody,
  summaryIntro: studioGuideConversationV1.summaryIntro,
  confirmedSummaryIntro: studioGuideConversationV1.confirmedSummaryIntro,
  startNewLabel: studioGuideConversationV1.startNewConversationLabel,
  saveForNowLabel: studioGuideConversationV1.saveForNowLabel,
  closeLabel: studioGuideConversationV1.closeLabel,
  changeAnswerLabel: "Change an answer",
  reviewAnswersLabel: "Review Answers",
  reviewPanelTitle: studioGuideConversationV1.reviewPanelTitle,
  reviewPanelIntro: studioGuideConversationV1.reviewPanelIntro,
  looksGoodLabel: studioGuideConversationV1.looksGoodLabel,
  /**
   * Activity Panel — Route Recommendation (Choose Your Route).
   * One panel, content swaps. Keep Voice short.
   */
  routePanelTitle: "Choose Your Route",
  routePanelLead:
    "Based on what you said you’re working on, this may be a good place to start. You can choose a different path.",
  routeRecommendedBadge: "Suggested starting point",
  routeConfirmCtaPrefix: "Continue with",
  routeConfirmCtaFallback: "Confirm your route",
  routeHelpPrompt: "Not sure where to start?",
  routeHelpCta:
    "Based on what you said you’re working on, this may be a good place to start. You can choose a different path.",
  /** Activity Panel — peek at a route before confirming on the tablet. */
  routePeekEyebrow: "Route details",
  routePeekJobsHeading: "Services on this route",
  routePeekJobsHint:
    "Open any service for purpose, what’s included, what we don’t offer, revisions, and timing.",
  routePeekShowDetails: "Show full details",
  routePeekHideDetails: "Hide details",
  routePeekEmptyJobs: "This route opens the job shelf so you can pick what you need.",
  routePeekConfirmPrefix: "Continue with",
  /**
   * Spoken once when the route panel opens after Review — not ambient.
   * Prefer `routeVoiceBridge(preferredName)` so the name is used once, not every line.
   */
  routeVoiceIntro:
    "Thank you. Now let’s choose a route for your project. You can pick any path that fits.",
  voiceNiceToMeetPrefix: "Nice to meet you,",
  /** Conversation Room display override — avoid Squishy name on Direct Route. */
  routeDirectTagline:
    "Opens the job shelf directly — ask if you are unsure.",
  servicesPanelTitle: "Build Your Project",
  /**
   * Guidance Pass v1 — decision help, not browse-yourself.
   * Logo is not a shelf SKU today; guidance names services that exist.
   * @see docs/studio-voice-guidance-map-v1.md (Logo catalog gap)
   */
  servicesPanelLead:
    "You do not need everything here. Many new businesses begin with business cards and one promotional piece. You can add or remove services before checkout.",
  /**
   * After the first add confirmation, suppress further spoken confirms during this window
   * so rapid taps update the project visually without stacking Voice lines.
   */
  servicesAddSpeakCooldownMs: 4500,
  /** Tablet status — do not duplicate the panel’s “Build Your Project” heading. */
  servicesTabletTitle: "Your project so far",
  servicesTabletOpenPanelCta: "Open service list",
  /** Always available on the services tablet — do not bury route change in the panel only. */
  servicesChangeRouteCta: "Change route",
  servicesBackToRoutesLabel: "Back to routes",
  servicesShowFullDetails: "Show full details",
  servicesHideFullDetails: "Hide details",
  servicesReviewPlanCta: "Review Studio Plan",
  learnMoreBackLabel: "Back to services",
  learnMoreVoiceOffer: "Would you like to learn more, or add it to your project?",
  /** Activity Panel — Studio Plan (short summary first; View Details expands). */
  studioPlanTitle: "Studio Plan",
  studioPlanLead:
    "Here's your Studio Plan. Review the services, price, and timeline. You can still make changes before checkout.",
  /**
   * Spoken once when Plan opens — brief orientation, not a full read-aloud.
   * Facts stay on the tablet for the customer to scan.
   */
  studioPlanVoiceOrient:
    "Here's your Studio Plan. Review the services, price, and timeline. You can still make changes before checkout.",
  studioPlanRouteLabel: "Route",
  studioPlanServicesLabel: "Services",
  studioPlanServicesSelectedSuffix: "selected",
  studioPlanTimelineLabel: "Estimated Timeline",
  studioPlanTimelineAsteriskNote:
    "This timeline begins after we receive the required project materials.",
  /** Visible Voice callout on Studio Plan — spoken with the brief orientation. */
  studioVoiceSaysLabel: "Studio Voice says:",
  studioPlanVoiceConfirmAsk: "Is this correct?",
  /** Primary Plan action — one steering wheel. */
  studioPlanConfirmCta: "Continue to Checkout",
  studioPlanViewDetailsLabel: "View Details",
  studioPlanHideDetailsLabel: "Hide Details",
  /** Opens Activity Panel — Revision Policy, We'll Need, View Scope (readable size). */
  studioPlanMoreDetailsCta: "Revisions, materials & scope",
  studioPlanExtrasHint:
    "Revisions and materials details open beside you when you need them.",
  studioPlanExtraDetailsTitle: "Plan details",
  studioPlanExtraDetailsLead:
    "Revision policy, what you'll need after checkout, and View Scope for each service.",
  studioPlanEditLabel: "Edit Plan",
  /** Change the highway without hunting through Edit Plan → Back to routes. */
  studioPlanChangeRouteLabel: "Change route",
  /** @deprecated Prefer studioPlanConfirmCta — kept for Host/legacy callers. */
  studioPlanLooksGoodLabel: "Looks Good, Continue",
  studioPlanBackLabel: "Back to Studio Plan",
  /** Pre-checkout freedom — locked principle (checklist source). */
  studioPlanVoiceBeforeCheckoutFreedom:
    studioPlanPreCheckoutFlexibilityV1.voiceBeforeCheckoutFreedom,
  studioPlanBeforeCheckoutHeading:
    studioPlanPreCheckoutFlexibilityV1.beforeCheckoutHeading,
  studioPlanBeforeCheckoutItems:
    studioPlanPreCheckoutFlexibilityV1.beforeCheckoutItems,
  /**
   * Spoken when Studio Plan is confirmed and Checkout opens in the Activity Panel.
   * Scope is locked after confirmed payment — matches Project Change post-purchase behavior.
   */
  checkoutVoiceBridge:
    "Before you pay, confirm your services and total. This is your last chance to edit before the purchased scope is fixed.",
  /** @deprecated Prefer checkoutVoiceBridge — kept for older narration callers. */
  studioPlanVoiceCheckout:
    studioPlanPreCheckoutFlexibilityV1.voiceCheckoutTransition,
  checkoutTitle: "Ready to check out",
  checkoutLead:
    "Confirm your services and total below. After payment, the purchased scope is fixed and later changes follow the Project Change process.",
  checkoutScopeDisclosure:
    "Checkout confirms the selected project scope. After payment, the purchased scope is fixed. Later changes are handled through the Project Change process.",
  checkoutBackToPlanLabel: "Back to Studio Plan",
  checkoutCompleteCta: "Complete Checkout",
  /** Tablet status during checkout — guidance + facts, not a second pay button. */
  checkoutTabletTitle: "Checkout",
  checkoutTabletLead:
    "Before you pay, confirm your services and total. After payment, the purchased scope is fixed — later changes follow the Project Change process. Intake comes next after payment.",
  checkoutOpenPanelCta: "Show payment form",
  checkoutTaxesFeesNote:
    "Estimated Investment reflects your selected services. Taxes and live card processing are not applied in this build.",
  /**
   * Spoken only after payment is confirmed (markPaymentReceived path).
   * Do not use for optimistic or pending payment states.
   */
  checkoutPaymentSuccessVoice:
    "Payment is complete. Next, I'll collect the project details and materials the Studio needs to begin.",
  /** Spoken when Checkout succeeds and Project Intake opens — same confirmed-success line. */
  intakeVoiceBridge:
    "Payment is complete. Next, I'll collect the project details and materials the Studio needs to begin.",
  intakeTitle: "Project Intake",
  intakeLead:
    "These details help the Studio begin production on your purchased services. Required items unlock the next step; optional items can wait.",
  intakeMaterialsDeadlineNote:
    "Your project is saved, but production will begin after the required materials are received and reviewed.",
  /** Visible tip near materials — not spoken as a form tour. */
  intakeLaterMaterialsTip:
    "If you don't have something yet, choose that option where available. Missing items do not erase your purchase — they only delay production start.",
  /** Tablet — production status, not a pointer at the panel. */
  intakeTabletTitle: "Preparing your project for production",
  intakeTabletCompletedHeading: "Completed",
  intakeTabletPaymentReceivedLabel: "Payment received",
  intakeTabletServicesConfirmedLabel: "Services confirmed",
  intakeTabletStillNeededHeading: "Still needed",
  intakeTabletStillNeededNoneLabel:
    "None — all required items are complete.",
  intakeTabletNextHeading: "Next",
  /** When required fields remain unresolved. */
  intakeTabletNextRequiredRemaining:
    "Complete the remaining required items.",
  /** Signed out — ready to submit. */
  intakeTabletNextReadySignedOut:
    "Review and continue to Sign In to open your Studio Board.",
  intakeTabletNextReadyMaterialsLaterSignedOut:
    "You marked materials for later. That does not erase your purchase — production starts after they arrive. Review and continue to Sign In to open your Studio Board.",
  /** Signed in — ready to submit. */
  intakeTabletNextReadySignedIn: "Review and continue to your Studio Board.",
  intakeTabletNextReadyMaterialsLaterSignedIn:
    "You marked materials for later. That does not erase your purchase — production starts after they arrive. Review and continue to your Studio Board.",
  /** @deprecated Prefer auth-specific Next copy — defaults to signed-out truth. */
  intakeTabletNextReady:
    "Review and continue to Sign In to open your Studio Board.",
  intakeTabletNextReadyMaterialsLater:
    "You marked materials for later. That does not erase your purchase — production starts after they arrive. Review and continue to Sign In to open your Studio Board.",
  intakeTabletLead:
    "Now I'll collect the information our production team needs. Required fields are marked; optional ones can wait.",
  intakeOpenPanelCta: "Continue intake",
  intakeHostFallbackCta: "Open Host Project Intake",
  /** Form primary CTA — must match real next destination. */
  intakeSubmitCtaSignedOut: "SAVE & CONTINUE TO SIGN IN",
  intakeSubmitCtaSignedIn: "SAVE & CONTINUE TO STUDIO BOARD",
  intakeNextStepBlurbSignedOut:
    "Complete every required section for all purchased services, then continue to Sign In.",
  intakeNextStepBlurbSignedIn:
    "Complete every required section for all purchased services, then continue to Studio Board.",
  /**
   * Spoken on Intake submit when the customer must Sign In first.
   */
  intakeSubmitSuccessVoiceSignedOut:
    "Everything required to begin has been collected. Your project has been created. The next step is signing in so you can access your Studio Board, track progress, communicate with the Studio, and receive updates.",
  /**
   * Spoken on Intake submit when already signed in — Board next, no Sign In language.
   */
  intakeSubmitSuccessVoiceSignedIn:
    "Everything required to begin has been collected. Your project has been created. Opening your Studio Board so you can track progress, communicate with the Studio, and receive updates.",
  /** @deprecated Prefer auth-specific Voice — defaults to signed-out truth. */
  intakeSubmitSuccessVoice:
    "Everything required to begin has been collected. Your project has been created. The next step is signing in so you can access your Studio Board, track progress, communicate with the Studio, and receive updates.",
  /** Sign-in banner when Voice hands off after Intake (visual; speech already played). */
  boardHandoffSignInLead:
    "Your project has been created. Sign in to open your Studio Board, track progress, communicate with the Studio, and receive updates.",
  /** Spoken once on first Board arrival after Voice handoff. */
  boardArrivalWelcomeVoice:
    "You're all set. From here you can follow your project's progress, communicate with the Studio, upload additional materials, and review updates.",
  studioPlanBridgeError:
    "I couldn't open checkout yet. Please try again, or edit your plan and review once more.",
  /** Quiet confirmation — not a spoken “Got it.” every turn. */
  savedCue: "Saved",
  speakHint: "Tap the mic to speak",
  speakSubhint: "or start typing below",
  typeLabel: "Type your answer",
  /** Shown on required guide answers (preferred name cannot be skipped). */
  answerRequiredLabel: "Required",
  typeRequiredEmptyHint: "This answer is required.",
  /** Always-on strip — customer can ask or speak even after guide questions end. */
  communicationLabel: "Talk with the Studio",
  askAnythingPlaceholder: "Ask a question or tell the Studio something",
  sendMessageLabel: "Send",
  /**
   * Studio Voice — conversational, not ambient.
   * Never speak on bare page load. Only after a customer trigger.
   */
  voiceBriefThanks: "Thank you.",
  voiceWelcomeBack: "Welcome back. We can continue where we left off.",
  voiceHelpOpen: "Sure, let's look at that.",
  privacyNote: studioGuideConversationV1.voice.privacyNote,
  deadlineFormatHint: studioGuideConversationV1.deadlineFormatHint,
  deadlineFormatError: studioGuideConversationV1.deadlineFormatError,
  deadlineUnconfirmedNote: studioGuideConversationV1.deadlineUnconfirmedNote,
  fieldLabels: studioGuideConversationV1.fieldLabels,
  correctionPrompt: "Which section do you want to change?",
  correctionTargets: [
    { step: "ask_preferred_name" as const, label: "What to call you" },
    { step: "ask_project_need" as const, label: "Project need" },
    { step: "ask_business_name" as const, label: "Business name" },
    { step: "ask_deadline" as const, label: "Deadline" },
    { step: "ask_materials" as const, label: "Existing materials" },
  ],

  questions: [
    {
      step: "ask_preferred_name",
      question: studioGuideConversationV1.questions.preferredName,
      canSkip: false,
      bubbleMode: "single",
      bubbles: [],
      placeholder: "Type the name you’d like me to use",
    },
    {
      step: "ask_project_need",
      question: studioGuideConversationV1.questions.projectNeed,
      canSkip: false,
      bubbleMode: "single",
      bubbles: [
        "Branding or logo",
        "Website",
        "Social media graphics",
        "Marketing materials",
        "Presentation or document",
        "Business setup",
        "Update something existing",
        "Not sure yet",
        "Something else",
      ],
      placeholder: studioGuideConversationV1.inputPlaceholder,
    },
    {
      step: "ask_business_name",
      question: studioGuideConversationV1.questions.businessName,
      canSkip: true,
      bubbleMode: "single",
      bubbles: [
        "I don’t have one yet",
        "Personal project",
        "I’m still deciding",
        "Skip for now",
      ],
      placeholder: "Type your business name",
    },
    {
      step: "ask_deadline",
      question: studioGuideConversationV1.questions.deadline,
      canSkip: true,
      bubbleMode: "single",
      opensDateFieldBubble: "I have a specific date",
      bubbles: [
        "As soon as possible",
        "Within 1 week",
        "Within 2 weeks",
        "Within 1 month",
        "More than 1 month",
        "I have a specific date",
        "No deadline yet",
        "Skip for now",
      ],
      placeholder: studioGuideConversationV1.deadlinePlaceholder,
    },
    {
      step: "ask_materials",
      question: studioGuideConversationV1.questions.materials,
      canSkip: true,
      bubbleMode: "multi",
      bubbles: [
        "Logo",
        "Brand colors",
        "Photos",
        "Written copy",
        "Existing design",
        "Website link",
        "Reference examples",
        "Documents",
        "Nothing yet",
        "Something else",
        "Skip for now",
      ],
      placeholder: "Add any details about your materials",
    },
  ] as const satisfies readonly ConversationRoomGuideQuestion[],
} as const;

/** One-time acknowledgment after the customer shares a preferred name. */
export function voiceNiceToMeet(preferredName: string): string {
  const name = preferredName.trim();
  if (!name) return conversationRoomGuideV1.voiceBriefThanks;
  return `${conversationRoomGuideV1.voiceNiceToMeetPrefix} ${name}.`;
}

/**
 * Review → Route bridge. Uses the preferred name once, then stops repeating it.
 * When a project-need keyword match exists, offer a suggested starting point only —
 * not a full recommendation (Tagia launch honesty pass 2026-07-21).
 */
export function routeVoiceBridge(
  preferredName: string | null | undefined,
  recommendedCustomerLabel?: string | null,
): string {
  const name = preferredName?.trim();
  const thanks = name
    ? `Thank you, ${name}.`
    : conversationRoomGuideV1.voiceBriefThanks;
  const label = recommendedCustomerLabel?.trim();
  if (label) {
    return `${thanks} Based on what you said you’re working on, ${label} may be a good place to start. You can choose any path that fits better.`;
  }
  return name
    ? `Thank you, ${name}. Now let’s choose a route for your project. You can pick any path that fits.`
    : conversationRoomGuideV1.routeVoiceIntro;
}

/** Spoken once when Build Your Project opens after a confirmed route. */
export function servicesVoiceIntro(routeCustomerLabel: string): string {
  const route = routeCustomerLabel.trim() || "your route";
  return `You're on ${route}. ${conversationRoomGuideV1.servicesPanelLead}`;
}

/**
 * Short confirmation after a service is added — one sentence, not a speech.
 */
export function servicesAddedConfirmation(serviceCustomerName: string): string {
  const name = serviceCustomerName.trim() || "That service";
  return `${name} has been added to your Studio Plan. You can keep building or review your selections whenever you're ready.`;
}

/** Facts Voice may reference on Studio Plan — customer labels only (no highway codes). */
export type StudioPlanVoiceFacts = {
  /** e.g. "Get My Business Started" — not "I-75". */
  routeCustomerLabel: string;
  services: readonly { title: string; priceDisplay: string }[];
  totalDisplay: string;
  overallTimelineDisplay: string | null;
};

/**
 * Builder → Studio Plan orientation.
 * Brief spoken help; the tablet carries services, price, and timeline for scanning.
 */
export function studioPlanVoiceNarration(
  preferredName: string | null | undefined,
  _facts?: StudioPlanVoiceFacts,
): string {
  const orient = conversationRoomGuideV1.studioPlanVoiceOrient;
  const name = preferredName?.trim();
  if (!name) return orient;
  return `${name}, ${orient.charAt(0).toLowerCase()}${orient.slice(1)}`;
}

export function getConversationRoomGuideQuestion(
  step: GuideConversationStep,
): ConversationRoomGuideQuestion | null {
  return (
    conversationRoomGuideV1.questions.find((q) => q.step === step) ?? null
  );
}

/** Relative deadline wording — stored honestly, never treated as a promised date. */
export const GUIDE_RELATIVE_DEADLINE_CHOICES = [
  "As soon as possible",
  "Within 1 week",
  "Within 2 weeks",
  "Within 1 month",
  "More than 1 month",
  "No deadline yet",
] as const;

export function isGuideRelativeDeadlineChoice(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return GUIDE_RELATIVE_DEADLINE_CHOICES.some(
    (choice) => choice.toLowerCase() === trimmed,
  );
}
