/**
 * PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1
 * Fail-closed internal QA before customer Review — config + customer copy.
 *
 * Does not redesign Review Room. Does not invent a second QA engine.
 */

export const studioReviewEligibilityV1 = {
  packageId: "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
  decisionSchemaVersion: 1,

  outcomes: {
    eligibleForReview: "ELIGIBLE_FOR_REVIEW",
    blockedForInternalQa: "BLOCKED_FOR_INTERNAL_QA",
  },

  /**
   * Owner-independence lock (pre-seal verified):
   * Routine path = staff `submit_for_owner_approval` (legacy name) → system eligibility
   * → customer Review. Tagia does NOT click routine approval.
   * `owner_approve_for_review` is Owner-exception only (pending before_review hold).
   */
  routineReviewAuthorization: "owner_independent" as const,

  /** Profile-kit SKUs — Review candidate is the Studio kit, not live social mutation. */
  profileKitSkuIds: ["rm-j002", "rm-j008"] as const,

  customerCopy: {
    stillPreparing:
      "Your project is still being prepared for review.",
  },

  staffCopy: {
    missingQa: "Internal QA has not passed for this job’s review candidate.",
    qaFailed: "Internal QA failed for this review candidate — return to production correction.",
    staleQa: "Internal QA is stale for the current artifact/version.",
    wrongArtifact: "Internal QA belongs to a different artifact than the review candidate.",
    wrongVersion: "Internal QA belongs to a different version than the review candidate.",
    wrongHash: "Internal QA belongs to a different content hash than the review candidate.",
    superseded: "A newer artifact/version supersedes the QA-passed candidate.",
    missingTasks: "No Kitchen production tasks found for this SKU — Review stays closed.",
    videoRenderOnly:
      "Video render/assembly success is not enough — per-artifact video QA must pass.",
  },
} as const;

export type StudioReviewEligibilityOutcome =
  (typeof studioReviewEligibilityV1.outcomes)[keyof typeof studioReviewEligibilityV1.outcomes];
