/**
 * Final Room-1 Maya whole-customer life torture test.
 * Authority: launch-readiness execution order Room 1 chaotic-failure list.
 * Does not close Room 1. Does not certify live Resend inbox.
 */

import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";

export const studioRoom1WholeCustomerLifeTortureTestV1 = {
  packageId: "STUDIO-OPERATING-ROOM-1-WHOLE-CUSTOMER-LIFE-TORTURE-TEST-1",
  schemaVersion: 1 as const,
  room: 1 as const,
  ownerRoutine: "NONE" as const,
  merge: "separately_authorized" as const,
  previousParkedSection: {
    id: studioRoom1CustomerLifeCloseoutV1.comeBackLater.parkedPackageId,
    tip: studioRoom1CustomerLifeCloseoutV1.comeBackLater.protectedCheckpoint,
    verdict: studioRoom1CustomerLifeCloseoutV1.comeBackLater.verdict,
  },
  comeBackLaterEmail: studioRoom1CustomerLifeCloseoutV1.comeBackLater,
  mayaFixture: {
    customerName: "Maya Brooks",
    businessName: "Cedar & Bloom Home Organizing",
    offer: "Back-to-School Reset",
    skuId: "v2-rtu-flyer",
    studioFeeUsd: 69,
    customerOfferUsd: 149,
  },
  /** Failures already named in the locked Room 1 list. Do not invent extra business rules. */
  chaoticDrills: [
    "wrong_upload",
    "duplicate_upload",
    "timeout_or_stall_recover",
    "qa_failure_then_pass",
    "stale_version_attempt",
    "return_later",
    "failed_notification_board_and_voice_still_honest",
  ] as const,
  /** Explicitly out of this package — parked Resend live cert. */
  outOfScope: [
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "live_provider_reject_retry_against_final_studio_sender",
    "owner_console",
    "room_2",
  ] as const,
} as const;
