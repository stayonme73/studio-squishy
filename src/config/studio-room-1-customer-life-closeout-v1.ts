/**
 * Room 1 Customer Life closeout ledger.
 *
 * Tagia closeout call 2026-08-17:
 * COMPLETE EXCEPT DEFERRED EXTERNAL DOMAIN/EMAIL PREREQUISITE.
 * Not a full CLOSED stamp. Executable/testable customer-life work stands at
 * a49efd7. Abandoned 3067 startup attempts do not count.
 *
 * The deferred email sticky does not block Room 2.
 * Do not fake branded sender / inbox proof. Do not reopen completed Room 1
 * capabilities unless new evidence proves an actual defect.
 */

export const studioRoom1CustomerLifeCloseoutV1 = {
  schemaVersion: 2 as const,
  room: 1 as const,
  roomId: "customer-life-and-communication" as const,
  /** No full CLOSED stamp — yellow sticky remains for domain/email identity. */
  roomClosed: false as const,
  status: "complete_except_deferred_external_domain_email" as const,
  closeoutCallAt: "2026-08-17" as const,
  merge: "separately_authorized" as const,

  /** Tagia authorized exception: Room 1 stays open for email only; Room 2 and Room 3 may enter. */
  room2Authorized: true as const,
  emailDoesNotBlockRoom2: true as const,
  room3Authorized: true as const,
  emailDoesNotBlockRoom3: true as const,
  doNotStartRoom2: false as const,
  doNotStartOwnerConsole: false as const,
  doNotStartRooms3to5: false as const,
  doNotStartRoom4: true as const,
  doNotStartRoom5: true as const,
  /** @deprecated Prefer doNotStartRooms3to5 + room2Authorized. Kept false by closeout call. */
  doNotStartRooms2to5: false as const,

  doNotReopenCompletedCapabilitiesUnlessNewDefect: true as const,

  /**
   * Bright come-back-later flag. Not a launch-limit acceptance of silence.
   * When Owner has a purchased, verified Studio domain and business email,
   * return to the parked Resend package and finish live certification.
   */
  comeBackLater: {
    id: "studio-business-domain-and-email-identity",
    kind: "EXTERNAL_PREREQUISITE" as const,
    parkedPackageId: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
    protectedCheckpoint: "d6974eb",
    verdict: "PARKED_WITH_EXTERNAL_PREREQUISITE" as const,
    closed: false as const,
    doNotFake: true as const,
    doNotCallClosed: true as const,
    doesNotBlockRoom2: true as const,
    doesNotBlockRoom3: true as const,
    reason:
      "The Studio does not yet have a purchased and verified business domain or business email identity.",
    deferredGates: [
      "branded_sender_certification",
      "real_inbox_delivery_proof",
      "live_provider_reject_retry_against_final_studio_sender",
    ] as const,
    returnWhen:
      "Owner establishes the purchased and verified Studio domain and business-email identity, then Scout resumes the same Resend package.",
  },

  preservedCheckpoints: {
    fullCustomerLife: "c713cb7",
    reviewRevisionFullLoop: "07c1434",
    resendLifecycleAndWatchdog: "d6974eb",
    voiceSummaryCorrection: "9f58d41",
    wholeCustomerTortureAuthoritative: "a49efd7",
  } as const,

  /**
   * All currently executable/testable customer-life work is complete through
   * the authoritative Maya torture-test tip. Abandoned 3067 attempts do not count.
   */
  tortureSection: {
    id: "STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1",
    status: "complete_executable_authoritative" as const,
    authoritativeTip: "a49efd7",
    abandonedNonAuthoritative: "3067-startup-attempts" as const,
    doNotReopenUnlessNewDefect: true as const,
    roomClosed: false as const,
  },

  /** The only unfinished Room 1 item — parked email identity, not current execution. */
  remainingOpenItem: {
    id: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
    status: "parked_with_external_prerequisite" as const,
    protectedCheckpoint: "d6974eb",
    roomClosed: false as const,
  },

  /**
   * Remaining Room 1 sticky — not the active execution room.
   * Active launch room is Room 3 after the 2026-08-18 Room 2 close.
   */
  activeSection: {
    id: "STUDIO-OPERATING-RESEND-LIFECYCLE-NOTIFICATIONS-AND-WATCHDOG-1",
    status: "parked_with_external_prerequisite" as const,
    roomClosed: false as const,
  },
} as const;
