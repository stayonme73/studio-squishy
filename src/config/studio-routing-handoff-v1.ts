/**
 * Routing handoff — consume ready_for_routing → durable per-job routing decisions.
 *
 * Authority: STUDIO-OPERATING-ROUTING-HANDOFF-1
 * Ends at: READY_FOR_DISPATCH (capability-level). Does NOT select vendors or dispatch.
 */

export const studioRoutingHandoffV1 = {
  packageId: "STUDIO-OPERATING-ROUTING-HANDOFF-1",
  schemaVersion: 1 as const,

  outcomes: {
    readyForDispatch: "READY_FOR_DISPATCH",
    waitingForPrerequisite: "WAITING_FOR_PREREQUISITE",
    routingBlocked: "ROUTING_BLOCKED",
    ownerPolicyReview: "OWNER_POLICY_REVIEW",
  } as const,

  handoffStatuses: {
    evaluated: "evaluated",
    deferred: "deferred",
    pendingRetry: "pending_retry",
  } as const,

  /** Routine supported job: ready_for_routing → READY_FOR_DISPATCH. */
  routineOwnerAction: "NONE" as const,
} as const;

export type RoutingOutcome =
  (typeof studioRoutingHandoffV1.outcomes)[keyof typeof studioRoutingHandoffV1.outcomes];

export type RoutingHandoffStatus =
  (typeof studioRoutingHandoffV1.handoffStatuses)[keyof typeof studioRoutingHandoffV1.handoffStatuses];
