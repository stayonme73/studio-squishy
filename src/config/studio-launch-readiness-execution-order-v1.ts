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
 * Tagia 2026-08-20: Room 4C opened (multi-service client gauntlet).
 * Tagia 2026-08-21: Room 4C CLOSED WITH EXPLICIT LIMITS at 92f47e2.
 * Tagia 2026-08-21 (later): Pre-Launch Master Closeout Register ACTIVE (not execution).
 * Tagia 2026-08-22: External Customer Content Intake and Rights Certification
 * CLOSED WITH EXPLICIT LIMITS at 15ee699c.
 * Tagia 2026-08-22 (later): Mobile Customer Journey Certification OPEN.
 * Tagia 2026-08-23: Mobile Customer Journey Certification PARKED. Work
 * Supervision and Incident Escalation OPEN / IN PROGRESS (not opening-only).
 * 2026-08-25: wake runtime implemented and deployed. C1 PASS. C13 WAITING
 * ON NETLIFY SUPPORT. Authenticated wake NOT RUN. Scheduler NOT CONNECTED.
 * Room 4 remains OPEN. Do not start Room 5. Do not assign Room 4D / 4E.
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

  /** Highest unfinished execution room. Rooms 2–3 CLOSED. Room 4A+4B+4C closed sections. Room 4 remains open. */
  currentActiveRoom: 4 as const,
  currentActiveRoomId: "full-business-rehearsal" as const,
  currentActiveRoomClosed: false as const,
  currentActiveSectionId:
    "work-supervision-and-incident-escalation" as const,
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

  /** Room 4A CLOSED. Room 4B CLOSED 2026-08-19. Room 4C CLOSED WITH EXPLICIT LIMITS at 92f47e2. Register ACTIVE. Room 4 remains open. */
  room4: {
    packageId: "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1",
    sectionClosed: false as const,
    parkForManager: false as const,
    doNotAutoAdvance: true as const,
    doNotStartRoom5: true as const,
    doNotRebuild: true as const,
    nextSectionWaitsForScoutPackage: true as const,
    room4AClosedAt: "9f9ac7c" as const,
    room4BClosedAt: "2026-08-19" as const,
    room4BSealCommit: "8c919e0" as const,
    room4CClosedAt: "2026-08-21" as const,
    room4CCloseTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
    currentSectionId:
      "work-supervision-and-incident-escalation" as const,
    currentSectionStatus: "OPEN" as const,
    activeRegisterPackageId:
      "STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1" as const,
    lastClosedExecutionPackageId:
      "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1" as const,
    lastClosedExecutionPackageTip:
      "15ee699c7d16331b3f410871f02555841fddd4d6" as const,
    activeExecutionPackageId:
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
    doNotOpenNextPackage: true as const,
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
    sectionClosed: true as const,
    status: "CLOSED WITH EXPLICIT LIMITS" as const,
    packageRecommendation: "CLOSE WITH EXPLICIT LIMITS" as const,
    baseCommit: "8c919e0d8af0c6f996c4a53792b74aef7b69c279" as const,
    openedAt: "2026-08-20" as const,
    closedAt: "2026-08-21" as const,
    doNotAutoStart: false as const,
    doNotStartRoom5: true as const,
    doNotMerge: true as const,
    doNotExpandLaunchMenu: true as const,
    room4RemainsOpen: true as const,
    mediaNaturalnessCarryForward:
      "ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA" as const,
    mediaNaturalnessCarryForwardStatus: "REQUIRED_NOT_CERTIFIED" as const,
    scenario1Status: "PASS WITH EXPLICIT LIMITS" as const,
    scenario2Status: "PASS WITH EXPLICIT LIMITS" as const,
    scenario3Status: "PASS WITH EXPLICIT LIMITS" as const,
    configModule:
      "src/config/studio-room-4c-multi-service-client-gauntlet-v1.ts" as const,
    closeoutDoc:
      "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/STUDIO-OPERATING-ROOM-4C-CLOSEOUT.md" as const,
    closeTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
  },

  preLaunchMasterCloseoutRegister: {
    packageId: "STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1" as const,
    status: "ACTIVE_REGISTER" as const,
    notAnExecutionPackage: true as const,
    baseTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
    doNotStartRoom5: true as const,
    doNotMerge: true as const,
    doNotExecuteRoadmapFromRegister: true as const,
    registerDoc:
      "docs/launch/studio-pre-launch-master-closeout-register-1/STUDIO-PRE-LAUNCH-MASTER-CLOSEOUT-REGISTER-1.md" as const,
    configModule:
      "src/config/studio-pre-launch-master-closeout-register-v1.ts" as const,
    recommendedNextPackageId:
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
    recommendedNextPackageStatus: "OPEN" as const,
    doNotStartRecommendedNextInThisPackage: false as const,
    doNotOpenNextPackage: true as const,
  },

  externalCustomerContentIntakeAndRightsCertification: {
    packageId:
      "STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CERTIFICATION-1" as const,
    title: "External Customer Content Intake and Rights Certification" as const,
    status: "CLOSED WITH EXPLICIT LIMITS" as const,
    sectionClosed: true as const,
    ownerDecision: "ACCEPTED" as const,
    packageRecommendation: "CLOSE WITH EXPLICIT LIMITS" as const,
    baseCommit: "5c22de9ed82c4b3009ef5d0bbe8b623f4a90ef88" as const,
    openedAt: "2026-08-22" as const,
    closedAt: "2026-08-22" as const,
    registerRequirement: "EXTERNAL_CUSTOMER_CONTENT_INTAKE_AND_RIGHTS" as const,
    doNotStartMobileCertification: true as const,
    doNotStartRoom5: true as const,
    doNotMerge: true as const,
    doNotChangeLaunchNowMenu: true as const,
    doNotReopenRoom4cWithoutDefect: true as const,
    doNotOpenNextPackage: true as const,
    room4RemainsOpen: true as const,
    room4cRemainsClosed: true as const,
    room4cCloseTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
    configModule:
      "src/config/studio-external-customer-content-intake-and-rights-certification-v1.ts" as const,
    packageContractDoc:
      "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-PACKAGE-CONTRACT.md" as const,
    closeoutDoc:
      "docs/launch/studio-operating-external-customer-content-intake-and-rights-certification-1/STUDIO-OPERATING-EXTERNAL-CUSTOMER-CONTENT-INTAKE-AND-RIGHTS-CLOSEOUT.md" as const,
    closeTip: "15ee699c7d16331b3f410871f02555841fddd4d6" as const,
  },

  mobileCustomerJourneyCertification: {
    packageId:
      "STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1" as const,
    title: "Mobile Customer Journey Certification" as const,
    status: "PARKED" as const,
    parkClassification:
      "BLOCKED BY MISSING INDEPENDENT SUPERVISION AND INCIDENT ESCALATION" as const,
    sectionClosed: false as const,
    baseCommit: "15ee699c7d16331b3f410871f02555841fddd4d6" as const,
    openedAt: "2026-08-22" as const,
    parkedAt: "2026-08-23" as const,
    parkTip: "bc458931c46ed845b982f62a4c70f8a312c169c8" as const,
    readinessTip: "b35c8aa2c2fdc7b1f1f5161d38479fdded0e5361" as const,
    livePhoneCertification: "NOT_STARTED" as const,
    resumeAfterPackageId:
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
    registerRequirement: "FULL_MOBILE_CUSTOMER_JOURNEY_CERTIFICATION" as const,
    doNotAssignRoom4dOr4eLabel: true as const,
    doNotStartRoom5: true as const,
    doNotMerge: true as const,
    doNotChangeLaunchNowMenu: true as const,
    doNotReopenRoom4bWithoutDefect: true as const,
    doNotReopenRoom4cWithoutDefect: true as const,
    doNotReopenGateXWithoutDefect: true as const,
    doNotExecuteLivePhoneJourneyInOpening: true as const,
    doNotStampCertificationResult: true as const,
    readinessPassComplete: true as const,
    ownerPhoneRunGuideDoc:
      "docs/launch/studio-operating-mobile-customer-journey-certification-1/OWNER-PHONE-RUN-GUIDE.md" as const,
    parkAndResumeDoc:
      "docs/launch/studio-operating-mobile-customer-journey-certification-1/PARK-AND-RESUME.md" as const,
    room4RemainsOpen: true as const,
    gateXRemainsClosed: true as const,
    gateXCloseTip: "15ee699c7d16331b3f410871f02555841fddd4d6" as const,
    room4cRemainsClosed: true as const,
    room4cCloseTip: "92f47e200ab59979a2c8b16e813abfef9e067765" as const,
    configModule:
      "src/config/studio-mobile-customer-journey-certification-v1.ts" as const,
    packageContractDoc:
      "docs/launch/studio-operating-mobile-customer-journey-certification-1/STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-PACKAGE-CONTRACT.md" as const,
  },

  workSupervisionAndIncidentEscalation: {
    packageId:
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1" as const,
    title: "Work Supervision and Incident Escalation" as const,
    status: "OPEN" as const,
    progress: "IN_PROGRESS" as const,
    sectionClosed: false as const,
    openingArtifactsOnly: false as const,
    implementationAuthorized: true as const,
    currentBlocker: "C13_WAITING_ON_NETLIFY_SUPPORT" as const,
    wakeRuntimeImplementedAndDeployed: true as const,
    launchProductionCertified: false as const,
    foundationPass: 1 as const,
    baseCommit: "bc458931c46ed845b982f62a4c70f8a312c169c8" as const,
    openedAt: "2026-08-23" as const,
    doNotAssignRoom4dOr4eLabel: true as const,
    doNotStartRoom5: true as const,
    doNotMerge: true as const,
    doNotClaimClaudeConnected: true as const,
    doNotClaimBuildABotConnected: true as const,
    doNotClaimResendLive: true as const,
    room4RemainsOpen: true as const,
    configModule:
      "src/config/studio-work-supervision-and-incident-escalation-v1.ts" as const,
    packageContractDoc:
      "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-PACKAGE-CONTRACT.md" as const,
  },

  merge: "separately_authorized" as const,
  parallelPackages: false as const,
  room5RemainsNotStarted: true as const,
} as const;
