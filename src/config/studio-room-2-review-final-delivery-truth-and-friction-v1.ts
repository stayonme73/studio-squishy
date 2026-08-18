/**
 * Room 2 Section 3 — customer-facing Review → Final → Delivery truth.
 * PARK for Manager. Not closed. Do not auto-advance.
 *
 * Prior closes: Section 1 `45b09b1` · Section 2 `e609203`.
 * Ledger stamp `be8fd06` records Section 2 close; it is not the close tip.
 *
 * Room 1 already proved the Review/Final/Delivery machinery. This package
 * polishes whether a normal customer understands the language and controls.
 * Do not reopen Room 1 as a production rebuild. Do not start Owner Console.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom2CustomerFacingTruthAndFrictionEntryV1 } from "@/config/studio-room-2-customer-facing-truth-and-friction-entry-v1";
import { studioRoom2ReturningCustomerBoardAndHelpCenterTruthV1 } from "@/config/studio-room-2-returning-customer-board-and-help-center-truth-v1";

export const studioRoom2ReviewFinalDeliveryTruthAndFrictionV1 = {
  packageId: "STUDIO-OPERATING-ROOM-2-REVIEW-FINAL-DELIVERY-TRUTH-AND-FRICTION-1",
  schemaVersion: 1 as const,
  room: 2 as const,
  roomId: "customer-facing-truth-and-friction-cleanup" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: true as const,
  sectionClosed: false as const,
  doNotAutoAdvance: true as const,
  parkEvidence: {
    liveCustomerWalk: "23/23" as const,
    targetedTests: "118/118" as const,
    ownerRoutine: "NONE" as const,
    merge: false as const,
  },
  doNotStartOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenSection1UnlessNewDefect: true as const,
  doNotReopenSection2UnlessNewDefect: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule:
    "CUSTOMER-USE → FIND FRICTION/TRUTH DEFECTS → FIX → BREAK → RETEST → CLOSE SECTION" as const,

  priorSections: {
    section1PackageId: studioRoom2CustomerFacingTruthAndFrictionEntryV1.packageId,
    section1CloseTip: "45b09b1" as const,
    section2PackageId: studioRoom2ReturningCustomerBoardAndHelpCenterTruthV1.packageId,
    section2CloseTip: "e609203" as const,
    section2LedgerStampNotClose: "be8fd06" as const,
  },

  room1Status: studioRoom1CustomerLifeCloseoutV1.status,
  room1Closed: studioRoom1CustomerLifeCloseoutV1.roomClosed,
  room2Authorized: studioRoom1CustomerLifeCloseoutV1.room2Authorized,
  currentActiveRoom: studioLaunchReadinessExecutionOrderV1.currentActiveRoom,

  comeBackLaterEmail: {
    protectedCheckpoint: studioRoom1CustomerLifeCloseoutV1.comeBackLater.protectedCheckpoint,
    verdict: studioRoom1CustomerLifeCloseoutV1.comeBackLater.verdict,
    doesNotBlockRoom2: studioRoom1CustomerLifeCloseoutV1.emailDoesNotBlockRoom2,
  },

  scopedSpine: [
    "review-entry",
    "version-truth",
    "question-revision-approval",
    "revision-allowance",
    "approval-clarity",
    "final-state",
    "delivery-and-download",
    "return-later",
    "help-and-communication-in-review",
  ] as const,

  lookParticularlyFor: [
    "internal QA/Kitchen language on Review",
    "ambiguous submit buttons",
    "duplicate approval/revision actions",
    "stale status copy",
    "question wording that sounds like a revision",
    "approval wording that sounds reversible or unbounded",
    "hash/pin/job identity shown to the customer",
    "Campaign/Kitchen/Squishy residue on Review/Final/Delivery",
    "MIME or storage-provider jargon on downloads",
    "false final-package or Download All claims",
  ] as const,

  outOfScope: [
    "owner_console",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "room_1_production_rebuild",
    "five_slot_law_reopen",
    "revision_policy_invention",
    "visual_redesign_spree",
    "merge",
  ] as const,
} as const;
