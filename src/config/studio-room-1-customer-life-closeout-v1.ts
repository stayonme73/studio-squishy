/**
 * Room 1 Customer Life closeout ledger.
 * Not a green check. Not permission to start Rooms 2–5.
 *
 * LIVE RESEND / BRANDED SENDER / INBOX PROOF is parked with an external
 * prerequisite (Studio domain + business email identity). Come back later.
 * Do not fake those gates. Do not call that package CLOSED.
 */

export const studioRoom1CustomerLifeCloseoutV1 = {
  schemaVersion: 1 as const,
  room: 1 as const,
  roomId: "customer-life-and-communication" as const,
  roomClosed: false as const,
  merge: "separately_authorized" as const,
  doNotStartRooms2to5: true as const,
  doNotStartOwnerConsole: true as const,

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
  } as const,

  /** Current non-domain-dependent Room 1 section. */
  activeSection: {
    id: "STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1",
    status: "parked_for_manager" as const,
    roomClosed: false as const,
  },
} as const;
