/**
 * PRODUCTION-ASSURANCE-PRE-ACCEPTANCE-GATE-1
 * Narrow pre-payment acceptance control — config + customer-facing copy.
 *
 * POST-PAY ACCEPTANCE REVIEW ≠ PRE-PAY ACCEPTANCE GATE
 * CR-D5: do not wire evaluateConversationPhaseGate as a second live brain.
 */

export const studioPreAcceptanceV1 = {
  packageId: "PRODUCTION-ASSURANCE-PRE-ACCEPTANCE-GATE-1",
  decisionSchemaVersion: 2,
  storageKey: "studio-squishy:pre-acceptance-decision:v1",

  /** Outcomes — business semantics must stay explicit. */
  outcomes: {
    clearToAccept: "CLEAR_TO_ACCEPT",
    clarificationRequired: "CLARIFICATION_REQUIRED",
    ownerPolicyReview: "OWNER_POLICY_REVIEW",
    decline: "DECLINE",
  },

  /**
   * Bounded risk/policy patterns (operational honesty, not legal certainty).
   * Gray areas → OWNER_POLICY_REVIEW. Hard stops → DECLINE.
   */
  hardDeclineNeedPatterns: [
    /\bvoice\s*clon(?:e|ing)\b/i,
    /\bimpersonat(?:e|ion)\b/i,
    /\bcelebrity\s+(?:voice|likeness)\b/i,
    /\billegal\b/i,
    /\bcounterfeit\b/i,
  ] as const,

  ownerPolicyNeedPatterns: [
    /\bmedical\s+claim/i,
    /\bguaranteed?\s+(?:results?|income|cure)\b/i,
    /\b#\s*1\s+rated\b/i,
    /\bFDA\b/,
    /\bHIPAA\b/,
  ] as const,

  customerCopy: {
    evaluatingInvisible: null as string | null,
    clarificationLead:
      "Before checkout, we need one more detail so we can take this on honestly.",
    clarificationVoicePrefix: "Before you pay, I need one quick clarification:",
    ownerPolicyLead:
      "This project needs a short Studio policy review before payment. Your plan is saved.",
    ownerPolicyVoice:
      "This one needs a short Studio policy review before payment. Your plan is saved — we’ll follow up.",
    declineLead:
      "We can’t accept this project as selected right now. Your plan is saved so you can adjust services or timing.",
    declineVoice:
      "We can’t accept this project as selected right now. Your plan is saved — you can change services or timing and try again.",
    staleDecision:
      "Your plan changed since the last check. We’ll re-check before checkout.",
    missingDecision: "We need to re-check this project before payment.",
    capabilityUnsupported:
      "One or more selected services aren’t available to sell right now.",
    timingPast:
      "The requested deadline is already past. Please choose a future date or remove the deadline.",
    timingInvalid:
      "We couldn’t read the requested deadline. Please enter a clear date or remove it.",
    timingAmbiguous:
      "You mentioned a deadline — please enter a date, or choose that you don’t need one.",
    timingTurnaroundTooSoon:
      "That deadline is sooner than The Studio’s published minimum turnaround for the selected services ({minDays} business days). Please choose a later date or adjust services.",
    needMissing:
      "Tell us what you’re trying to accomplish so we know this plan fits.",
    noServices: "Select at least one service before checkout.",
    noRoute: "Choose a route before checkout.",
  },
} as const;

export type StudioPreAcceptanceOutcome =
  (typeof studioPreAcceptanceV1.outcomes)[keyof typeof studioPreAcceptanceV1.outcomes];
