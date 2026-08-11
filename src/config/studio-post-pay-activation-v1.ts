/**
 * Post-pay activation — server-driven wake after Payment Truth confirms.
 *
 * Authority: STUDIO-OPERATING-POST-PAY-ACTIVATION-CONSUMER-1
 * Trigger: paymentTruth.status = confirmed (webhook / reconcile / sandbox).
 * Ends at: active waiting intake/materials OR ready-for-routing.
 * Does NOT start production, choose producers, or dispatch tools.
 */

export const studioPostPayActivationV1 = {
  packageId: "STUDIO-OPERATING-POST-PAY-ACTIVATION-CONSUMER-1",
  schemaVersion: 1 as const,

  /**
   * Durable phases after payment — distinct from payment confirmed and from
   * production started. Reuses existing intake/material facts; does not invent
   * a parallel campaignStatus enum.
   */
  phases: {
    awaitingIntake: "awaiting_intake",
    awaitingMaterials: "awaiting_materials",
    readyForRouting: "ready_for_routing",
  } as const,

  activationStatuses: {
    activated: "activated",
    pendingRetry: "pending_retry",
  } as const,

  /** Routine activation never requires Owner action. */
  routineOwnerAction: "NONE" as const,
} as const;

export type PostPayActivationPhase =
  (typeof studioPostPayActivationV1.phases)[keyof typeof studioPostPayActivationV1.phases];

export type PostPayActivationStatus =
  (typeof studioPostPayActivationV1.activationStatuses)[keyof typeof studioPostPayActivationV1.activationStatuses];
