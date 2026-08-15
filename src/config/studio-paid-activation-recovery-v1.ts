/**
 * Paid activation recovery — already-paid wake + pending_retry + structure-ensure
 * honesty after Payment Truth is confirmed.
 *
 * Authority: STUDIO-OPERATING-PAID-ACTIVATION-RECOVERY-1
 * Does not change payment authority. Does not invent Studio Voice.
 * Routine recovery Owner action = NONE.
 */

export const studioPaidActivationRecoveryV1 = {
  packageId: "STUDIO-OPERATING-PAID-ACTIVATION-RECOVERY-1",
  schemaVersion: 1 as const,

  /** Immediate retries inside the same payment/wake attempt after a failed chain. */
  immediateRetries: 2,

  /** Max stranded paid campaigns a sweep will retry in one pass. */
  sweepLimit: 25,

  /** Routine recovery never requires Owner action. */
  routineOwnerAction: "NONE" as const,

  customerCopy: {
    recoveringStatusLabel: "Payment confirmed",
    recoveringLead:
      "Your payment is confirmed. The Studio is still getting your project ready. This usually finishes on its own.",
    recoveringHint:
      "You do not need to pay again. If Project Intake is waiting, you can continue it now. Your Studio Board will update when the next honest step is ready.",
  },
} as const;
