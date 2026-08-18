/**
 * Standing launch-readiness sequence.
 * Authority: docs/launch-readiness-execution-order-v1-locked.md
 * Not permission to start later rooms. One active room at a time.
 *
 * Tagia 2026-08-17: Room 1 stays technically open solely for deferred
 * domain/email. That sticky does not block entering Room 2 or Room 3.
 * Tagia 2026-08-18: Room 2 CLOSED. Current execution is Room 3.
 */

export const studioLaunchReadinessExecutionOrderV1 = {
  schemaVersion: 2 as const,
  locked: true as const,
  owner: "Tagia",
  lockedAt: "2026-08-15",
  room1CloseoutCallAt: "2026-08-17",
  closeRule: "BUILD → BREAK → USE LIKE A CUSTOMER → FIX → RETEST" as const,
  forbiddenCloseRule: "BUILD → TESTS GREEN → NEXT" as const,

  rooms: [
    "customer-life-and-communication",
    "customer-facing-truth-and-friction-cleanup",
    "owner-console",
    "full-business-rehearsal",
    "soft-opening-preparation",
  ] as const,

  /** Highest unfinished execution room. Room 1 remains open for email only. Room 2 is CLOSED. */
  currentActiveRoom: 3 as const,
  currentActiveRoomId: "owner-console" as const,
  currentActiveRoomClosed: false as const,

  lastCustomerLifePackage: {
    id: "STUDIO-OPERATING-FULL-CUSTOMER-LIFE-AND-COMMUNICATION-1",
    commit: "c713cb7",
    verdict: "WORKS_WITH_LAUNCH_BLOCKERS" as const,
    parked: true as const,
    roomClosed: false as const,
  },

  /**
   * Room 1 closeout call — not a full CLOSED stamp.
   * Executable customer-life work complete at a49efd7.
   * Live Resend inbox/sender cert remains parked with an external prerequisite.
   * Tagia authorized Room 2 despite that yellow sticky.
   */
  room1Closeout: {
    ledger: "docs/launch/studio-operating-room-1-customer-life-closeout-v1.md",
    roomClosed: false as const,
    status: "complete_except_deferred_external_domain_email" as const,
    authoritativeTortureTip: "a49efd7",
    room2Authorized: true as const,
    emailDoesNotBlockRoom2: true as const,
    room3Authorized: true as const,
    emailDoesNotBlockRoom3: true as const,
    comeBackLater: {
      id: "studio-business-domain-and-email-identity",
      parkedPackageId: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
      protectedCheckpoint: "d6974eb",
      verdict: "PARKED_WITH_EXTERNAL_PREREQUISITE" as const,
      closed: false as const,
      doNotFake: true as const,
    },
  },

  room2Entry: {
    packageId: "STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1",
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "45b09b1" as const,
    parkCheckpointNotClose: "90dcc84" as const,
    doNotAutoAdvance: true as const,
    doNotStartOwnerConsole: true as const,
  },

  room2Section2: {
    packageId: "STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1",
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "e609203" as const,
    parkCheckpointNotClose: "e214b5f" as const,
    doNotAutoAdvance: true as const,
    doNotStartOwnerConsole: true as const,
    nextSectionWaitsForScoutPackage: false as const,
  },

  room2Section3: {
    packageId: "STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1",
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "3328807" as const,
    doNotAutoAdvance: true as const,
    doNotStartOwnerConsole: true as const,
    nextSectionWaitsForScoutPackage: false as const,
  },

  room2Section4: {
    packageId: "STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1",
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "6cf9ca0" as const,
    doNotAutoAdvance: true as const,
    doNotStartOwnerConsole: true as const,
    nextSectionWaitsForScoutPackage: false as const,
  },

  room2Section5: {
    packageId: "STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1",
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "b3397a6" as const,
    hashNoteNotClose: "c46e191" as const,
    doNotAutoAdvance: true as const,
    doNotStartOwnerConsole: false as const,
    nextSectionWaitsForScoutPackage: false as const,
  },

  room3Section1: {
    packageId: "STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-TRUTH-AND-DECISION-DESK-AUDIT-1",
    sectionClosed: false as const,
    parkForManager: true as const,
    doNotAutoAdvance: true as const,
    doNotStartSection2: true as const,
    doNotStartRoom4: true as const,
    doNotRebuild: true as const,
    nextSectionWaitsForScoutPackage: true as const,
  },

  merge: "separately_authorized" as const,
  parallelPackages: false as const,
} as const;
