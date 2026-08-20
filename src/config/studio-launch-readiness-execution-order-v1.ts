/**
 * Standing launch-readiness sequence.
 * Authority: docs/launch-readiness-execution-order-v1-locked.md
 * Not permission to start later rooms. One active room at a time.
 *
 * Tagia 2026-08-17: Room 1 stays technically open solely for deferred
 * domain/email. That sticky does not block entering Room 2 or Room 3.
 * Tagia 2026-08-18: Room 2 CLOSED.
 * Tagia 2026-08-19: Room 3 CLOSED at cd2a1e2. Room 4A CLOSED at 9f9ac7c.
 * Tagia 2026-08-19 (later): Room 4B CLOSED.
 * Tagia 2026-08-20: Room 4C OPEN (multi-service client gauntlet).
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

  /** Highest unfinished execution room. Rooms 2–3 CLOSED. Room 4A+4B CLOSED. Room 4C OPEN. */
  currentActiveRoom: 4 as const,
  currentActiveRoomId: "full-business-rehearsal" as const,
  currentActiveRoomClosed: false as const,
  currentActiveSectionId: "4c-multi-service-client-gauntlet" as const,
  currentActiveSectionStatus: "OPEN" as const,

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
    emailDoesNotBlockRoom4: true as const,
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
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "76b974f" as const,
    doNotAutoAdvance: true as const,
    doNotStartSection2: false as const,
    doNotStartRoom4: true as const,
    doNotRebuild: true as const,
    nextSectionWaitsForScoutPackage: false as const,
  },

  room3Section2: {
    packageId: "STUDIO-OPERATING-ROOM-3-OWNER-DECISION-EXECUTION-AND-AFTERMATH-1",
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "199e4a4" as const,
    doNotAutoAdvance: true as const,
    doNotStartSection3: false as const,
    doNotStartRoom4: true as const,
    doNotRebuild: true as const,
    nextSectionWaitsForScoutPackage: false as const,
  },

  room3Section3: {
    packageId:
      "STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-WHOLE-DESK-REHEARSAL-AND-CLOSEOUT-1",
    sectionClosed: true as const,
    parkForManager: false as const,
    closeTip: "cd2a1e2" as const,
    doNotAutoAdvance: true as const,
    doNotStartRoom4: false as const,
    doNotRebuild: true as const,
    nextSectionWaitsForScoutPackage: false as const,
  },

  /** Room 4A CLOSED. Room 4B CLOSED 2026-08-19. Room 4C OPEN 2026-08-20. */
  room4: {
    packageId: "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1",
    sectionClosed: false as const,
    parkForManager: false as const,
    doNotAutoAdvance: true as const,
    doNotStartRoom5: true as const,
    doNotRebuild: true as const,
    nextSectionWaitsForScoutPackage: false as const,
    room4AClosedAt: "9f9ac7c" as const,
    room4BClosedAt: "2026-08-19" as const,
    room4BSealCommit: "8c919e0" as const,
    currentSectionId: "4c-multi-service-client-gauntlet" as const,
    currentSectionStatus: "OPEN" as const,
  },

  room4A: {
    packageId: "STUDIO-OPERATING-ROOM-4-FULL-BUSINESS-REHEARSAL-1",
    sectionClosed: true as const,
    closeTip: "9f9ac7c" as const,
    parkForManager: false as const,
    doNotAutoAdvance: true as const,
    doNotStartRoom5: true as const,
    doNotRebuild: true as const,
  },

  room4B: {
    packageId: "STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1",
    sectionClosed: true as const,
    roomClosed: true as const,
    closedAt: "2026-08-19" as const,
    closeChoice: "A_CLOSE_WITH_CLASSIFICATIONS_FROZEN" as const,
    closeoutDoc:
      "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-CLOSEOUT.md" as const,
    parkForManager: false as const,
    doNotAutoAdvance: true as const,
    doNotStartRoom5: true as const,
    doNotAutoStartNextCertification: true as const,
    doNotRebuild: true as const,
    nextSectionWaitsForScoutPackage: false as const,
    photoLedLiveCertRecommendation:
      "MACHINE_NATIVE_NIA_CERT_CLOSED_NO_VENDOR_PURCHASE" as const,
    twoStageMeansTwoSubscriptions: false as const,
    niaPhotoLedLiveCertStatus: "CLOSED_PASS" as const,
    machineNativeRecommendation: "A_BUILD_MACHINE_NATIVE" as const,
    machineNativeRecommendationAccepted: true as const,
    ownerInputRequired: "NONE" as const,
    doNotOpenPlacidTrialYet: true as const,
    campaignCreativeOnLaunchNow: true as const,
    frozenClassifications: true as const,
  },

  room4C: {
    packageId:
      "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1" as const,
    title: "Multi-Service Client Gauntlet" as const,
    sectionClosed: false as const,
    status: "OPEN" as const,
    baseCommit: "8c919e0d8af0c6f996c4a53792b74aef7b69c279" as const,
    openedAt: "2026-08-20" as const,
    doNotAutoStart: false as const,
    doNotStartRoom5: true as const,
    doNotMerge: true as const,
    doNotExpandLaunchMenu: true as const,
    scenario1Status: "EXECUTED_OWNER_DECISION_PENDING" as const,
    configModule:
      "src/config/studio-room-4c-multi-service-client-gauntlet-v1.ts" as const,
  },

  merge: "separately_authorized" as const,
  parallelPackages: false as const,
} as const;
