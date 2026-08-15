/**
 * Customer lifecycle email + watchdog.
 * Authority: STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1
 *
 * Uses existing JOB_COMMUNICATION_TEMPLATES copy and the existing Resend adapter.
 * Does not invent new customer claims. Does not make Tagia the mail clerk.
 * Board remains the project-truth surface. Email tells Maya to look there.
 */

export const studioResendLifecycleAndWatchdogV1 = {
  packageId: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
  schemaVersion: 1 as const,
  room: 1 as const,
  ownerRoutine: "NONE" as const,
  merge: "separately_authorized" as const,
  previousClosedSection: {
    id: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
    tip: "07c1434",
    verdict: "CLOSED" as const,
  },

  pendingOwnerSendMeans: "awaiting_authorized_transport" as const,
  pendingOwnerSendIsOwnerRoutine: false as const,
  boardRemainsSourceOfTruth: true as const,
  copySource: "JOB_COMMUNICATION_TEMPLATES" as const,
  transport: "existing_resend_adapter" as const,
  emailKind: "customer-lifecycle" as const,

  retry: {
    maxAttempts: 8,
    minIntervalMs: 60_000,
  },

  /** Pending notice older than this is a quiet-failure watchdog finding. */
  noticeWaitingMs: 120_000,

  sweepLimit: 25,

  customerFooter:
    "Your Studio Board is the place to see the current honest step for this project.",
} as const;
