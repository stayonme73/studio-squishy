/**
 * Studio Guide conversation copy + draft keys.
 *
 * LIVE customer path: `/studio-conversation-room` (Conversation Room Guide).
 * RETIRED: Lobby overlay at `/?guide=1` (`src/components/studio-guide/*`) —
 * kept for reference; Lobby redirects `?guide=1` to the Conversation Room.
 *
 * Flags (both default OFF):
 * - NEXT_PUBLIC_STUDIO_GUIDE_CONVERSATION=1 — Lobby podium → Conversation Room
 * - NEXT_PUBLIC_STUDIO_GUIDE_VOICE=1 — mic dictation (Package 1 / Lobby archive)
 *
 * Design: docs/lobby-guide-voice-architecture-v1.md (APPROVED)
 * Plan: docs/lobby-guide-voice-package-1-implementation-plan-v1.md (APPROVED)
 */

export const STUDIO_GUIDE_CAPTURE_STORAGE_KEY = "studio-guide:capture-draft:v1" as const;

/**
 * After the Guide opens from a touch CTA, ignore scrim dismiss briefly.
 * Prevents Samsung/Android ghost clicks from closing the sheet on the same gesture.
 */
export const GUIDE_SCRIM_DISMISS_DELAY_MS = 450;

/** Enable with NEXT_PUBLIC_STUDIO_GUIDE_CONVERSATION=1 */
export function isStudioGuideConversationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STUDIO_GUIDE_CONVERSATION === "1";
}

/**
 * Voice Package 1 kill-switch — default OFF.
 * Requires conversation flag separately. Enable with NEXT_PUBLIC_STUDIO_GUIDE_VOICE=1.
 */
export function isStudioGuideVoiceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STUDIO_GUIDE_VOICE === "1";
}

export type GuideConversationStep =
  | "ask_preferred_name"
  | "ask_project_need"
  | "ask_business_name"
  | "ask_deadline"
  | "ask_materials"
  | "summary"
  | "confirmed";

export const studioGuideConversationV1 = {
  panelAriaLabel: "Studio Guide conversation",
  guideRoleLabel: "Studio Guide",
  closeLabel: "Close conversation",
  continueLabel: "Continue",
  skipLabel: "Skip for now",
  submitAnswerLabel: "Continue",
  correctLabel: "Correct something",
  confirmLabel: "Yes, this is correct",
  confirmedTitle: "Let’s review together",
  confirmedSavedBadge: "✓ Saved for now",
  confirmedBody:
    "Here’s what I understood. Take a quick look before we continue.",
  startNewConversationLabel: "Start a new conversation",
  saveForNowLabel: "Save for now",
  reviewPanelTitle: "Review your answers",
  reviewPanelIntro:
    "Here’s what I understood. Take a quick look before we continue.",
  looksGoodLabel: "Looks good",
  inputPlaceholder: "Tell me what you’re working on.",
  deadlinePlaceholder: "Example: September 15, 2026",

  /**
   * Opening sequence — preferred name first, then project facts.
   * Name is used sparingly in Voice (meet-you + key bridges), not every line.
   */
  questions: {
    preferredName: "Before we begin, what name would you like me to call you?",
    projectNeed: "What are you working on today?",
    businessName: "What is the name of your business?",
    deadline: "Do you have a requested deadline?",
    materials:
      "Do you already have any files or materials we should know about?",
  },

  /** Visible format guidance for the deadline step. */
  deadlineFormatHint:
    "Use a clear date such as September 15, 2026 or 09/15/2026. Compact numbers like 081526 are not accepted.",

  deadlineFormatError:
    "Please enter a clear date (for example September 15, 2026 or 09/15/2026). Compact numbers like 081526 are not accepted.",

  summaryIntro: "Here’s what I understood. Is this correct?",
  confirmedSummaryIntro: "Here’s what we saved.",

  /** Locked — Guide may record a date but must not promise availability. */
  deadlineUnconfirmedNote:
    "I’ve recorded your requested date. The Studio still needs to confirm availability before we promise that deadline.",

  fieldLabels: {
    preferredName: "What to call you",
    projectNeed: "Project need",
    businessName: "Business name",
    requestedDeadline: "Requested deadline",
    existingMaterialsNote: "Existing materials",
    deadlineStatus: "Deadline status",
  },

  skippedDisplay: "Skipped",
  notRequestedDisplay: "Not requested",
  /** Short card label — full honesty lives in deadlineUnconfirmedNote. */
  unconfirmedDisplay: "Unconfirmed",

  /** Voice Package 1 — Listening UX + privacy (complete sentences). */
  voice: {
    micStartLabel: "Speak your answer",
    micStopLabel: "Stop listening",
    micRetryLabel: "Try speaking again",
    statusRequestingPermission: "Waiting for microphone permission.",
    statusListening: "Listening.",
    statusProcessing: "Finishing.",
    statusTranscriptReady: "Review your answer, then continue when you are ready.",
    statusUnsupported:
      "Speaking is not available in this browser or connection. Please type your answer instead.",
    statusSecureContextMissing:
      "Speaking needs a secure Lobby address (HTTPS). Please type your answer, or open the HTTPS Lobby link on this device.",
    statusPermissionDenied:
      "Microphone access is blocked. Enable the microphone for this site in your browser settings, or type your answer.",
    statusTimeout:
      "I did not catch that. You can try speaking again, or type your answer.",
    statusProviderError:
      "Speaking ran into a problem. You can try again, or type your answer.",
    privacyNote:
      "When you use the microphone, browser speech services may process your audio. The Studio does not upload or store your recording.",
    interimPreviewLabel: "Hearing",
  },
} as const;
