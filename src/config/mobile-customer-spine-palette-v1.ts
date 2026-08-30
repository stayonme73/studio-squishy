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
  /** Must be written literally on backdrop-filter — CSS var form is dropped. */
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
 * MOBILE_VISUAL_MASTER — not a second master. Do not alter layout, glass,
 * Lounge crop, typography, colors, buttons, spacing, or Studio Review
 * treatment in subsequent Mobile work.
 */
export const MOBILE_VOICE_CHOICE_OWNER_ACCEPTED = {
  status: "OWNER_ACCEPTED" as const,
  acceptedAt: "2026-08-29" as const,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  heading: "How would you like to continue?",
  ctaClass: "lobby-entry-film__cta",
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
  nextScreen: "ask_deadline" as const,
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
