/**
 * Room 4 — Full business rehearsal.
 * PARK for Manager. Do not auto-start Room 5.
 *
 * Room 3 CLOSED at cd2a1e2. Room 2 CLOSED. Room 1 complete except deferred
 * domain/email at d6974eb. Do not reopen earlier rooms unless this rehearsal
 * exposes a genuine regression. Do not reopen Resend/domain. Do not merge.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom3OwnerConsoleWholeDeskRehearsalAndCloseoutV1 } from "@/config/studio-room-3-owner-console-whole-desk-rehearsal-and-closeout-v1";

export const studioRoom4FullBusinessRehearsalV1 = {
  packageId: "STUDIO-OPERATING-ROOM-4-FULL-BUSINESS-REHEARSAL-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  roomId: "full-business-rehearsal" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: true as const,
  sectionClosed: false as const,
  roomClosed: false as const,
  doNotAutoAdvance: true as const,
  doNotStartRoom5: true as const,
  doNotAddTools: true as const,
  doNotRebuildOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  doNotReopenRoom2UnlessNewDefect: true as const,
  doNotReopenRoom3UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule: "RUN BUSINESS → BREAK IT → RECOVER → RETEST → CLOSE" as const,
  northStar:
    "CUSTOMER ENTERS → BUYS → PROVIDES MATERIALS → STUDIO PRODUCES → CUSTOMER COMMUNICATES → OWNER DECIDES ONLY WHEN NEEDED → REVIEW → REVISION → APPROVAL → DELIVERY → RETURN LATER" as const,
  recoveryNorthStar:
    "THE STUDIO RECOVERS WITHOUT LOSING TRUTH OR TURNING TAGIA INTO THE DISPATCHER" as const,

  priorRooms: {
    room1Status: studioRoom1CustomerLifeCloseoutV1.status,
    room1Closed: studioRoom1CustomerLifeCloseoutV1.roomClosed,
    room1AuthoritativeTip: "a49efd7" as const,
    room2Closed: true as const,
    room2Section5CloseTip: "b3397a6" as const,
    room3Closed: true as const,
    room3CloseTip: "cd2a1e2" as const,
    room3Section3PackageId: studioRoom3OwnerConsoleWholeDeskRehearsalAndCloseoutV1.packageId,
  },

  currentActiveRoom: studioLaunchReadinessExecutionOrderV1.currentActiveRoom,
  currentActiveRoomId: studioLaunchReadinessExecutionOrderV1.currentActiveRoomId,

  comeBackLaterEmail: {
    protectedCheckpoint: studioRoom1CustomerLifeCloseoutV1.comeBackLater.protectedCheckpoint,
    verdict: studioRoom1CustomerLifeCloseoutV1.comeBackLater.verdict,
    doesNotBlockRoom4: true as const,
    neitherPassNorFailForThisRehearsal: true as const,
    deferredTransportNote:
      "Outbound branded email remains parked at d6974eb. Board and Voice remain the project truth.",
  },

  customerFixture: {
    customerName: "Maya Brooks",
    businessName: "Cedar & Bloom Home Organizing",
    offer: "Back-to-School Reset",
    skuId: "v2-rtu-flyer",
    studioFeeUsd: 69,
    customerOfferUsd: 149,
    productionPath: "certified_design_renderer_v2_rtu_flyer" as const,
  },

  paymentHonesty:
    "Front door walks Lobby → Conversation → Studio Plan → Stripe handoff. Live Stripe click-through is already certified and is not reopened. The paid operating chain uses the sealed processor-confirmed Maya $69 flyer fixture so one customer life can continue through production.",

  outOfScope: [
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "live_stripe_clickthrough_recertification",
    "invented_read_receipts",
    "unapproved_production_tools",
    "room_5",
    "merge",
    "visual_redesign_spree",
    "add_tools",
  ] as const,
} as const;
