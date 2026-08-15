/**
 * Pre-Payment Working Draft — locked contract constants.
 * @see docs/studio-working-draft-persistence-v1-locked.md
 * @see AGENTS.md → Pre-Payment Working Draft
 *
 * Hard engineering requirement. Implementation may consolidate stores later;
 * these statuses and rules must not be weakened.
 */

export const WORKING_DRAFT_STATUSES = [
  "working_draft",
  "purchased",
] as const;

export type WorkingDraftStatus = (typeof WORKING_DRAFT_STATUSES)[number];

/** Fields that must survive pre-payment navigation (minimum contract). */
export const WORKING_DRAFT_PERSISTED_FIELDS = [
  "discoveryAnswers",
  "routeRecommendation",
  "customerSelectedRoute",
  "selectedServices",
  "declinedServices",
  "reopenedServices",
  "serviceDetailSnapshots",
  "customerQuestions",
  "voiceAnswers",
  "deadlineInformation",
  "materialsStatus",
  "pricingSelections",
  "projectSummary",
  "confirmationStatus",
  "actionAttributionHistory",
  "currentConversationLocation",
  /**
   * ma-001 Promotion Pack — customer-locked composition before payment
   * (`Ma001CompositionLiveTruth` / live composition input).
   * skuId `ma-001` alone is insufficient for checkout.
   * @see STUDIO-OPERATING-DESIGN-MA-001-INTAKE-TRUTH-1
   */
  "ma001PackComposition",
  /**
   * rm-j002 Social Profile Setup Kit — platform + facts locked before payment.
   * skuId `rm-j002` alone is insufficient for checkout.
   * @see STUDIO-OPERATING-DESIGN-RM-J002-INTAKE-PAYMENT-LOCK-1
   */
  "rmj002KitLock",
  /**
   * rm-j008 Social Profile Update Kit — platform + customer-supplied before-state
   * + full replacement membership locked before payment.
   * skuId `rm-j008` alone is insufficient for checkout.
   * @see STUDIO-OPERATING-DESIGN-RM-J008-INTAKE-PAYMENT-LOCK-1
   */
  "rmj008KitLock",
  /**
   * bf-001 Brand Identity Refresh — graphic kind (profile XOR cover), existing
   * business name, and customer-supplied visual starting point locked before payment.
   * skuId `bf-001` alone is insufficient for checkout.
   * @see STUDIO-OPERATING-DESIGN-BF-001-INTAKE-PAYMENT-LOCK-1
   */
  "bf001PackageLock",
  /**
   * rm-j007 Reference-Guided Promotion Update — named item + reference note +
   * bounded changes + recreation-limits acceptance locked before payment.
   * skuId `rm-j007` alone is insufficient for checkout.
   * @see STUDIO-OPERATING-DESIGN-RM-J007-INTAKE-PAYMENT-LOCK-1
   */
  "rmj007UpdateLock",
] as const;

export type WorkingDraftPersistedField =
  (typeof WORKING_DRAFT_PERSISTED_FIELDS)[number];

/** Navigations that must not erase valid customer work. */
export const WORKING_DRAFT_PRESERVE_ON = [
  "back",
  "browser-back",
  "in-app-back",
  "return-to-lobby",
  "return-from-lobby",
  "help-open-close",
  "learn-more-open-close",
  "route-choice-move",
  "service-move",
  "page-refresh",
  "connection-interruption",
  "session-reopen",
  /** Inactivity timeout / Sign out now — auth ends; draft stays. */
  "session-timeout",
  "sign-out",
  /** Customer signs back in and continues — draft still present. */
  "sign-in-return",
] as const;

export type WorkingDraftPreserveOn = (typeof WORKING_DRAFT_PRESERVE_ON)[number];

export const studioWorkingDraftV1 = {
  /** Contract version — bump when schema/rules intentionally change. */
  version: 1,

  /**
   * Target durable key for the unified working draft (implementation TBD).
   * Must not rely solely on Conversation Room sessionStorage phase/step.
   */
  storageKey: "studio-squishy:working-draft:v1",

  prePayment: {
    status: "working_draft" as const satisfies WorkingDraftStatus,
    editable: true,
  },

  postPayment: {
    status: "purchased" as const satisfies WorkingDraftStatus,
    editableScope: false,
  },

  /** Reset requires deliberate customer confirmation — never automatic on Back. */
  resetRequiresConfirmation: true,

  /**
   * Conversation Room lobby-session stores only journeyPhase + flowStep.
   * It does NOT satisfy this contract for answers/services.
   */
  conversationRoomSessionInsufficient: true,
} as const;

export function isWorkingDraftEditable(status: WorkingDraftStatus): boolean {
  return status === "working_draft";
}

export function isPurchasedScopeFrozen(status: WorkingDraftStatus): boolean {
  return status === "purchased";
}
