/**
 * Dispatch execution identity — consume READY_FOR_DISPATCH → durable execution record.
 *
 * Authority: STUDIO-OPERATING-DISPATCH-1
 * Ends at: EXECUTION_IDENTITY_READY + exposed production requirements.
 * Does NOT select vendors, invoke Canva/Make/providers, or start production.
 */

export const studioDispatchV1 = {
  packageId: "STUDIO-OPERATING-DISPATCH-1",
  schemaVersion: 1 as const,

  outcomes: {
    executionIdentityReady: "EXECUTION_IDENTITY_READY",
    waitingForRouting: "WAITING_FOR_ROUTING",
    waitingForPrerequisite: "WAITING_FOR_PREREQUISITE",
    dispatchBlocked: "DISPATCH_BLOCKED",
    ownerPolicyReview: "OWNER_POLICY_REVIEW",
  } as const,

  envelopeStatuses: {
    evaluated: "evaluated",
    deferred: "deferred",
    pendingRetry: "pending_retry",
  } as const,

  routineOwnerAction: "NONE" as const,
} as const;

export type DispatchOutcome =
  (typeof studioDispatchV1.outcomes)[keyof typeof studioDispatchV1.outcomes];

export type DispatchEnvelopeStatus =
  (typeof studioDispatchV1.envelopeStatuses)[keyof typeof studioDispatchV1.envelopeStatuses];
