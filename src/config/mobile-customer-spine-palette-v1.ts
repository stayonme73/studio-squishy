/**
 * Mobile customer-spine visual master — locked from the owner-approved
 * Samsung Welcome screenshot. Do not reinterpret.
 *
 * Does not replace studio-design-system, studio-palette, or board-family.
 * Desktop Board / Final Delivery tokens stay on those global roots.
 *
 * Hierarchy: Lounge → Ivory/Cream frost → Denim / Eucalyptus / Ivory type.
 */
export const mobileCustomerSpinePaletteV1 = {
  cream: "#EBE2D4",
  ivory: "#F7F4EE",
  denim: "#547C92",
  eucalyptus: "#456B5A",
  coral: "#D94E2B",
  yellow: "#F7C900",
  terracotta: "#B96D40",
  ink: "#2E2B28",
} as const;

/** Exact Welcome recipe. Propagate; do not invent a second glass. */
export const MOBILE_VISUAL_MASTER = {
  loungeSrc: "/welcome-hall/studio-lobby-lounge.png",
  phoneCropX: "16%",
  phoneCropY: "42%",
  veilInkOpacityPct: 18,
  glassIvoryPct: 68,
  glassCreamPct: 32,
  glassOpacityPct: 46,
  glassStrongOpacityPct: 58,
  /** Historical Samsung frost recipe. Visual System V2 last-paint disables blur. */
  glassFilterLiteral: "blur(14px) saturate(1.04) brightness(1.1)",
  glassBorderDenimPct: 32,
  denim: "#547C92",
  eucalyptus: "#456B5A",
  ivory: "#F7F4EE",
  cream: "#EBE2D4",
  ink: "#2E2B28",
} as const;

/**
 * Owner-accepted Voice Choice (Samsung 2026-08-29). Implementation of
 * MOBILE_VISUAL_MASTER — not a second master. Panel / glass / Lounge crop
 * stay frozen. Buttons reuse Let’s Get Started `.lobby-entry-film__cta`.
 * Fill it out myself selects first. Continue commits. Do not start the microphone.
 */
export const MOBILE_VOICE_CHOICE_OWNER_ACCEPTED = {
  status: "OWNER_ACCEPTED" as const,
  acceptedAt: "2026-08-29" as const,
  buttonHierarchyCorrectedAt: "2026-09-06" as const,
  buttonSystemStatus: "FUNCTION_PASS" as const,
  samsungFillItOutMyselfStatus: "PASS" as const,
  samsungFillItOutMyselfOwnerAcceptedAt: "2026-09-06" as const,
  selectedColorVisualStatus: "WELCOME_CTA_FAMILY" as const,
  doNotAddInspectionDelay: true as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  heading: "How would you like to continue?",
  unselectedChoiceClass: "lobby-entry-film__cta" as const,
  selectedChoiceClass: "lobby-entry-film__cta" as const,
  proofPng:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/26-voice-choice-owner-accepted-360.png",
  freezeFiles: [
    "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
    "src/components/studio-conversation-room/voice-choice-film.module.css",
  ],
} as const;

/**
 * Owner-accepted name question (Samsung 2026-08-29). Implementation of
 * MOBILE_VISUAL_MASTER — not a second master. Do not redesign.
 */
export const MOBILE_NAME_QUESTION_OWNER_ACCEPTED = {
  status: "OWNER_ACCEPTED" as const,
  acceptedAt: "2026-08-29" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  step: "ask_preferred_name" as const,
  proofPng:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/27-before-we-begin-360.png",
} as const;

/**
 * Owner-accepted project-need question (Samsung 2026-08-29).
 * Long screen by choice count — do not compress to fit one viewport.
 */
export const MOBILE_PROJECT_NEED_OWNER_ACCEPTED = {
  status: "OWNER_ACCEPTED" as const,
  acceptedAt: "2026-08-29" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  step: "ask_project_need" as const,
  proofPng:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/28-project-need-360.png",
} as const;

/**
 * Owner-accepted business-name question visual system (Samsung 2026-08-29).
 * Functionally PASS. Safe-area clearance on Studio Review is the only
 * authorized follow-up — not a restyle.
 */
export const MOBILE_BUSINESS_NAME_OWNER_ACCEPTED = {
  status: "OWNER_ACCEPTED" as const,
  acceptedAt: "2026-08-29" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  step: "ask_business_name" as const,
  proofPng:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/30-business-name-360.png",
} as const;

/**
 * Five-screen Mobile visual system. Layout may adapt per screen.
 * Visual identity may not. Later Conversation Room screens reuse these
 * locked components — they do not invent a new Studio.
 */
export const MOBILE_VISUAL_SYSTEM_CHECKPOINT = {
  lockedAt: "2026-08-29" as const,
  welcome: "OWNER_ACCEPTED" as const,
  voiceChoice: "OWNER_ACCEPTED" as const,
  nameQuestion: "OWNER_ACCEPTED" as const,
  projectNeed: "OWNER_ACCEPTED" as const,
  businessName: "OWNER_ACCEPTED" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  nextScreen: "services" as const,
  reuseLockedComponents: true as const,
  identity: [
    "lounge-background-crop",
    "transparent-glass",
    "denim-primary-actions",
    "eucalyptus-guidance",
    "ivory-primary-readable-text",
    "glass-border-treatment",
    "voice-on-off-treatment",
    "unselected-chip-treatment",
    "studio-review-bottom-utility-tab",
  ] as const,
} as const;

/**
 * Owner-accepted materials question + confirmation summary (Samsung 2026-08-30).
 * Reuses MOBILE_VISUAL_MASTER. Do not restyle. Next customer action is
 * tapping Yes, this is correct, then the route stage.
 */
export const MOBILE_MATERIALS_CONFIRMATION_CHECKPOINT = {
  acceptedAt: "2026-08-30" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  materialsQuestion: "OWNER_ACCEPTED" as const,
  summaryConfirmation: "OWNER_ACCEPTED" as const,
  denimCta: "#547C92" as const,
  coralCorrectCta: "#D94E2B" as const,
  nextAction: "tap-yes-this-is-correct" as const,
  nextScreen: "route" as const,
  checkpointDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/2026-08-30-MATERIALS-CONFIRMATION-CHECKPOINT.md" as const,
} as const;

/**
 * One mobile Studio Board typography hierarchy.
 * Map existing Board copy into these roles. Do not invent per-section fonts.
 * Do not undo glass. Do not begin Review Room from this lock.
 * Owner Samsung 2026-09-10 closed this Board presentation pass. Do not start another.
 */
export const MOBILE_BOARD_TYPOGRAPHY_ROLES = {
  lockedAt: "2026-09-09" as const,
  ownerAcceptedAt: "2026-09-10" as const,
  status: "OWNER_ACCEPTED" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  doNotUndoGlass: true as const,
  doNotBeginReviewRoom: true as const,
  doNotBeginAnotherBoardStylingPass: true as const,
  page: {
    role: "A" as const,
    size: "1.5rem",
    weight: "700",
    color: "denim",
    examples: ["Studio Board"],
  },
  card: {
    role: "B" as const,
    size: "0.875rem",
    weight: "700",
    color: "eucalyptus",
    examples: [
      "CURRENT PROJECT",
      "PROJECT SNAPSHOT",
      "YOUR PROJECT JOURNEY",
      "PROJECT COMMUNICATION",
      "BILLING & CANCELLATION",
      "MATERIALS RECEIVED",
      "LOCAL DEVELOPER TEST",
    ],
  },
  sub: {
    role: "C" as const,
    size: "0.875rem",
    weight: "800",
    color: "denim",
    examples: [
      "DELIVERABLES",
      "YOUR STUDIO PLAN",
      "ACCOUNT",
      "RECENT UPDATES",
      "PROJECT STATUS",
      "PRODUCTION STATUS",
    ],
  },
  field: {
    role: "D" as const,
    size: "0.875rem",
    weight: "700",
    color: "eucalyptus",
    examples: [
      "WHAT WE NEED FROM YOU",
      "RECORDED OR COMPLETE",
      "WHAT THE STUDIO IS WORKING ON",
      "WHO ACTS NEXT",
      "CURRENT STATUS",
      "REVISIONS REMAINING",
    ],
  },
  value: {
    role: "E" as const,
    size: "1rem",
    weight: "650",
    color: "ink",
    examples: [
      "Nothing is required from you right now.",
      "Recorded: Project Intake submitted",
      "The Studio",
      "Make Me a Flyer",
      "Paid in Full · $69",
      "Project Intake Received",
    ],
  },
  support: {
    role: "F" as const,
    size: "0.875rem",
    weight: "500",
    color: "ink-muted-64",
    examples: [
      "Your Project Intake is submitted and locked for reference...",
      "TODAY / date metadata",
      "helper explanations",
    ],
  },
  action: {
    role: "G" as const,
    size: "0.94rem",
    weight: "700",
    color: "role-specific",
    examples: [
      "View submitted project details",
      "Send message",
      "Request refund review",
      "Save Studio fixture file",
      "Add more (optional)",
    ],
  },
} as const;

/**
 * Owner-accepted Choose Your Route (Samsung 2026-08-30).
 * Reuses MOBILE_VISUAL_MASTER. Do not redesign.
 * Suggested Starting Point is the recommendation. Denim is the selection.
 * Cards select only. One Continue CTA advances.
 */
export const MOBILE_CHOOSE_YOUR_ROUTE_OWNER_ACCEPTED = {
  status: "OWNER_ACCEPTED" as const,
  acceptedAt: "2026-08-30" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  stage: "route" as const,
  suggestionStaysOnRecommendation: true as const,
  denimSelectionFollowsTap: true as const,
  cardsSelectOnly: true as const,
  continueAdvances: true as const,
  nextScreen: "services" as const,
  proofPng:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/46-route-top-360.png" as const,
  fourCardProofPng:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs/47-route-select-direct-360.png" as const,
  checkpointDoc:
    "docs/launch/studio-operating-mobile-customer-journey-certification-1/2026-08-30-CHOOSE-YOUR-ROUTE-CHECKPOINT.md" as const,
  freezeFiles: [
    "src/components/studio-conversation-room/guide/ConversationRouteChoose.tsx",
    "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
  ],
} as const;
