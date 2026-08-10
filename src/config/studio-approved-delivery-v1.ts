/**
 * PRODUCTION-ASSURANCE-APPROVED-DELIVERED-BINDING-1
 * Exact customer-approved artifact/version must match final delivery.
 *
 * customer creative approval ≠ Studio release authorization (preserved).
 */

export const studioApprovedDeliveryV1 = {
  packageId: "PRODUCTION-ASSURANCE-APPROVED-DELIVERED-BINDING-1",
  decisionSchemaVersion: 1,

  outcomes: {
    eligibleForDelivery: "ELIGIBLE_FOR_DELIVERY",
    blockedApprovalMismatch: "BLOCKED_APPROVAL_MISMATCH",
    blockedReleaseHold: "BLOCKED_RELEASE_HOLD",
    blockedNoApproval: "BLOCKED_NO_APPROVAL",
  },

  /**
   * Routine release authorization is Owner-independent:
   * exact approved identity match + valid QA pin + no Owner release hold
   * → system authorizes Final Delivery.
   * Owner final release remains only for genuine before_delivery exceptions.
   */
  routineMatchAuthorization: "owner_independent" as const,
  routineReleaseAuthorization: "system" as const,

  /**
   * LEGACY EVENT-NAME LOCK — `owner_final_release` activity kind.
   * When actor.role === "system", this kind records routine system Final Delivery
   * authorization. It does NOT imply Owner participation or Tagia approval.
   * Genuine Owner exception releases also use this kind with actor.role === "owner".
   * Do not rename during seal; interpret by actor role + reason text.
   */
  legacyFinalReleaseEventKind: "owner_final_release" as const,

  customerCopy: {
    preparingDelivery:
      "Your approved project is being prepared for final delivery.",
  },

  staffCopy: {
    noApproval: "Customer has not approved a specific Review package for delivery.",
    missingQaPin:
      "Customer approval requires an internal QA Review authorization pin — cannot bind an unpinned package.",
    versionMismatch:
      "Delivery candidate work version does not match the customer-approved version.",
    artifactMismatch:
      "Delivery candidate artifact identity does not match the customer-approved artifact.",
    hashMismatch:
      "Delivery candidate content hash does not match the customer-approved hash.",
    superseded:
      "A newer unapproved version superseded the customer-approved candidate.",
    releaseHold: "Studio release hold is still pending — customer approval alone does not release files.",
    unboundFinalFile:
      "A final delivery file is not bound to the customer-approved identity (hash/authorization).",
    multiDeliverableMismatch:
      "One or more deliverables in the package do not match the customer-approved identity.",
  },
} as const;

export type StudioApprovedDeliveryOutcome =
  (typeof studioApprovedDeliveryV1.outcomes)[keyof typeof studioApprovedDeliveryV1.outcomes];
