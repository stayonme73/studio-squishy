/**
 * Standing launch-readiness sequence.
 * Authority: docs/launch-readiness-execution-order-v1-locked.md
 * Not permission to start later rooms. One active room at a time.
 */

export const studioLaunchReadinessExecutionOrderV1 = {
  schemaVersion: 1 as const,
  locked: true as const,
  owner: "Tagia",
  lockedAt: "2026-08-15",
  closeRule: "BUILD → BREAK → USE LIKE A CUSTOMER → FIX → RETEST" as const,
  forbiddenCloseRule: "BUILD → TESTS GREEN → NEXT" as const,

  rooms: [
    "customer-life-and-communication",
    "customer-facing-truth-and-friction-cleanup",
    "owner-console",
    "full-business-rehearsal",
    "soft-opening-preparation",
  ] as const,

  /** Highest unfinished room. Do not work a later room while this is open. */
  currentActiveRoom: 1 as const,
  currentActiveRoomId: "customer-life-and-communication" as const,
  currentActiveRoomClosed: false as const,

  lastCustomerLifePackage: {
    id: "STUDIO-OPERATING-FULL-CUSTOMER-LIFE-AND-COMMUNICATION-1",
    commit: "c713cb7",
    verdict: "WORKS_WITH_LAUNCH_BLOCKERS" as const,
    parked: true as const,
    roomClosed: false as const,
  },

  /**
   * Room 1 closeout ledger — not a green check.
   * Live Resend inbox/sender cert is parked with an external prerequisite.
   */
  room1Closeout: {
    ledger: "docs/launch/studio-operating-room-1-customer-life-closeout-v1.md",
    roomClosed: false as const,
    activeSection: "STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1",
    comeBackLater: {
      id: "studio-business-domain-and-email-identity",
      parkedPackageId: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
      protectedCheckpoint: "d6974eb",
      verdict: "PARKED_WITH_EXTERNAL_PREREQUISITE" as const,
      closed: false as const,
      doNotFake: true as const,
    },
  },

  merge: "separately_authorized" as const,
  parallelPackages: false as const,
} as const;
