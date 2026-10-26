/**
 * Step 3B — Studio Voice launch-blocker hardening.
 * Authority: AUTHORIZE STEP 3B — STUDIO VOICE LAUNCH-BLOCKER HARDENING
 *
 * Scripted Voice only. Package 4 Voice Host remains discontinued.
 * No invented SKUs, dates, queue position, refunds, or policy outcomes.
 */

export const STUDIO_VOICE_LAUNCH_BLOCKER_HARDENING_PACKAGE_ID =
  "STUDIO-OPERATING-STUDIO-VOICE-LAUNCH-BLOCKER-HARDENING-1" as const;

export const studioVoiceLaunchBlockerHardeningV1 = {
  packageId: STUDIO_VOICE_LAUNCH_BLOCKER_HARDENING_PACKAGE_ID,
  authorizedAt: "2026-09-26" as const,
  package4VoiceHost: "discontinued_not_rebuilt" as const,
  doNotStartWebsite: true as const,
  doNotStartBeta: true as const,
  doNotStartMarketing: true as const,
  doNotInventSkus: true as const,
  doNotInventDates: true as const,
  doNotGrantRefunds: true as const,
  doNotDenyRefunds: true as const,

  lobbySpokenLine:
    "Welcome to The Studio. I'm Studio Voice. I'll help you start a project and choose from the services The Studio currently offers. I answer from the Studio record — I will not guess. Whenever you're ready, select Let's Get Started on the podium.",
  lobbyHesitationBody:
    'I\'m Studio Voice. I\'ll help you start a project and choose from the services The Studio currently offers. I answer from the Studio record — I will not guess. Whenever you\'re ready, select "Let\'s Get Started" on the podium.',

  helpOverlayVoice:
    "I can open the Help Center. For your project, ask me here and I will answer from the Studio record when I have it. I will not guess.",

  unknownPrePay:
    "I do not have that on the project record yet, so I will not guess. We can keep building your plan here, or I can answer from the services The Studio currently offers.",
  unknownSignedOutNoProject:
    "I do not have a saved Studio project to look up yet. I can still answer from the services The Studio currently offers, or you can sign in if you already have an account.",
  sessionRequiredForSavedProject:
    "I can answer from the services The Studio currently offers, and from the plan on this screen. Sign in if you want me to look up a saved project. I will not treat a sign-in prompt as a missing project.",

  materialsLaterPrePay:
    "If you do not have materials yet, you can still finish your plan. After checkout you can mark missing items for later. Missing materials do not invent a purchase, and they do not erase one.",

  serviceFitUnmatched:
    "I will not guess which service you need. The Studio currently offers these published services. We choose together in the Conversation Room.",
  serviceFitMatchedPrefix:
    "From the published Studio shelf, this may fit what you described. You still choose.",
  pricingUnspecified:
    "Each published service has a listed price on Launch Now and in the Conversation Room. Tell me which service you mean, or open your Studio Plan for the current total. I will not invent a price.",
  pricingPlanPrefix: "Your current Studio Plan lists",
  scopeUnspecified:
    "Scope is listed on each published service in the Conversation Room. Tell me which service you mean, or open your Studio Plan. I will not invent inclusions.",
  scopePlanPrefix: "Your current Studio Plan includes",

  sourceQualityPass:
    "Your source recording is acceptable for production.",
  sourceQualityReplacement:
    "This recording cannot be used as-is. Please upload a clearer talking-head before we continue. The Studio will not reconstruct broken speech.",
  sourceQualityUnknown:
    "The Studio record does not show a source-audio check yet, so I will not guess.",

  dissatisfactionAck:
    "I heard that this is not what you wanted. I have recorded that. If Review is open, you can ask for a revision there. If this needs Owner judgment, the Owner will decide. I will not invent an outcome.",
  complaintAck:
    "I have recorded your complaint. The Owner will review it and make the judgment. I will not decide this myself, and you do not need Tagia to carry the message.",
  refundAck:
    "I have recorded your refund request. The Owner will make the judgment. I will not grant a refund, deny a refund, or invent policy.",
  ownerJudgmentNoProject:
    "I have heard you. Once this is attached to a Studio project, the Owner will make the judgment. I will not grant or deny a refund, and I will not invent policy.",

  checkoutPaymentFailedVoice:
    "Payment was not completed. No order was activated. Your project plan is still saved — you can try payment again when ready.",
  checkoutPaymentCancelledVoice:
    "Checkout was cancelled. Payment did not complete, so no order was activated. Your project plan is still saved — you can try payment again when ready.",

  returningSignedOut:
    "Sign in so I can look up your saved project. I will not guess what is on an account I cannot see.",
  returningNoOpenProject:
    "You are signed in, and I do not have an open Studio project on this account yet. I will not invent one.",
  returningWelcomePrefix: "Welcome back.",
} as const;
