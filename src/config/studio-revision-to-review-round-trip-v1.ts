/**
 * Revision → Review round trip — customer revision entitlement integrity.
 * Authority: STUDIO-OPERATING-REVISION-TO-REVIEW-ROUND-TRIP-CERTIFICATION-1
 *
 * Owner call 2026-09-15: a customer revision round is consumed when the revised
 * artifact reaches the customer in Review — not when the revision is requested.
 * If the Studio's own internal QA rejects the revised work, the customer keeps
 * the revision, the Owner is asked to look, and the customer is told the truth.
 */

export const studioRevisionToReviewRoundTripV1 = {
  packageId: "STUDIO-OPERATING-REVISION-TO-REVIEW-ROUND-TRIP-CERTIFICATION-1",
  schemaVersion: 1 as const,
  room: 4 as const,

  /**
   * Consumption point. `on_review_open` means the correction-use row is written
   * when the customer asks (history is honest about what they asked for), but it
   * only counts against the included allowance once the revised work is proven to
   * have reached Review.
   */
  entitlementConsumedAt: "on_review_open" as const,

  /**
   * Proof that a requested revision actually reached the customer. Derived from
   * the append-only job activity timeline — no separate ledger to drift.
   * Any of these spine states, recorded after the request, proves Review opened.
   */
  fulfilledBySpineStatuses: [
    "ready_for_review",
    "approved",
    "ready_for_delivery",
    "delivered",
  ] as const,

  /**
   * A job with no recorded spine history cannot prove either way. Default to
   * consumed so a missing timeline never hands out free revisions.
   */
  unprovableHistoryCountsAsConsumed: true,

  customerCopy: {
    /** Shown while the Studio holds work the customer has already asked to change. */
    revisionInFlight:
      "The Studio is working on the change you requested. Your included revision is not counted until the updated version reaches you for review.",
    /** Shown when the Studio rejects its own revised work before the customer sees it. */
    reworkAfterInternalRejection:
      "The Studio reviewed the updated version and decided it was not good enough to send you, so it is being reworked. Your included revision has not been counted, and you will be notified when a new version is ready for your review.",
    /** Blocked reason when a second request is attempted while one is in flight. */
    revisionAlreadyInFlight:
      "You already have a revision in progress on this work. The Studio will let you know when the updated version is ready for your review.",
  },

  ownerCopy: {
    reworkEscalationTitle: "Revision rework — Owner support requested",
    reworkEscalationDetail:
      "The customer requested a revision and the Studio's own quality check rejected the revised work before it reached them. The customer still holds the revision. Decide whether to rework, override, or contact the customer.",
  },
} as const;
