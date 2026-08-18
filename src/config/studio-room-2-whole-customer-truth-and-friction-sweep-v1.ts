/**
 * Room 2 Section 5 — whole-customer truth and friction sweep.
 * CLOSED at `b3397a6`. Hash note `c46e191` is not the close tip.
 *
 * Tagia closeout call 2026-08-18: Room 2 is CLOSED.
 * Do not reopen this section unless new evidence proves a genuine defect.
 * Do not reopen Resend/domain. Do not merge.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom2CustomerFacingTruthAndFrictionEntryV1 } from "@/config/studio-room-2-customer-facing-truth-and-friction-entry-v1";
import { studioRoom2MixedStatusAndTerminologyTruthV1 } from "@/config/studio-room-2-mixed-status-and-terminology-truth-v1";
import { studioRoom2ReturningCustomerBoardAndHelpCenterTruthV1 } from "@/config/studio-room-2-returning-customer-board-and-help-center-truth-v1";
import { studioRoom2ReviewFinalDeliveryTruthAndFrictionV1 } from "@/config/studio-room-2-review-final-delivery-truth-and-friction-v1";

export const studioRoom2WholeCustomerTruthAndFrictionSweepV1 = {
  packageId: "STUDIO-OPERATING-ROOM-2-WHOLE-CUSTOMER-TRUTH-AND-FRICTION-SWEEP-1",
  schemaVersion: 1 as const,
  room: 2 as const,
  roomId: "customer-facing-truth-and-friction-cleanup" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: false as const,
  sectionClosed: true as const,
  closeTip: "b3397a6" as const,
  hashNoteNotClose: "c46e191" as const,
  doNotAutoAdvance: true as const,
  closeEvidence: {
    liveCustomerWalk: "46/46" as const,
    targetedTests: "111/111" as const,
    ownerRoutine: "NONE" as const,
    merge: false as const,
    room2Verdict: "READY_TO_CLOSE_WITH_EXPLICIT_NON_BLOCKING_LIMITS" as const,
    closeTip: "b3397a6" as const,
  },
  doNotStartOwnerConsole: false as const,
  doNotStartRoom3: false as const,
  doNotReopenResend: true as const,
  doNotReopenSection1UnlessNewDefect: true as const,
  doNotReopenSection2UnlessNewDefect: true as const,
  doNotReopenSection3UnlessNewDefect: true as const,
  doNotReopenSection4UnlessNewDefect: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule:
    "CUSTOMER-USE → FIND FRICTION/TRUTH DEFECTS → FIX → BREAK → RETEST → CLOSE SECTION" as const,

  priorSections: {
    section1PackageId: studioRoom2CustomerFacingTruthAndFrictionEntryV1.packageId,
    section1CloseTip: "45b09b1" as const,
    section2PackageId: studioRoom2ReturningCustomerBoardAndHelpCenterTruthV1.packageId,
    section2CloseTip: "e609203" as const,
    section3PackageId: studioRoom2ReviewFinalDeliveryTruthAndFrictionV1.packageId,
    section3CloseTip: "3328807" as const,
    section4PackageId: studioRoom2MixedStatusAndTerminologyTruthV1.packageId,
    section4CloseTip: "6cf9ca0" as const,
  },

  room1Status: studioRoom1CustomerLifeCloseoutV1.status,
  room1Closed: studioRoom1CustomerLifeCloseoutV1.roomClosed,
  room2Authorized: studioRoom1CustomerLifeCloseoutV1.room2Authorized,
  currentActiveRoom: studioLaunchReadinessExecutionOrderV1.currentActiveRoom,

  comeBackLaterEmail: {
    protectedCheckpoint: studioRoom1CustomerLifeCloseoutV1.comeBackLater.protectedCheckpoint,
    verdict: studioRoom1CustomerLifeCloseoutV1.comeBackLater.verdict,
    doesNotBlockRoom2: studioRoom1CustomerLifeCloseoutV1.emailDoesNotBlockRoom2,
    neitherPassNorFailForThisSweep: true as const,
  },

  scopedSpine: [
    "front-door",
    "post-pay-intake",
    "materials",
    "board-and-project-record",
    "voice-and-status",
    "help-and-problem-reporting",
    "review",
    "revision-and-re-review",
    "approval-and-final",
    "delivery",
    "return-later",
    "stale-tab-and-mixed-state",
    "terminology-and-friction",
  ] as const,

  lookParticularlyFor: [
    "first-time vs Returning Client path collision",
    "false payment confirmation",
    "wordmark-only flyer demanding a logo",
    "Board and Project Record disagreeing on current status",
    "Voice dumping historical states into the current answer",
    "Ask a question vs Report a problem collision",
    "Review remaining unfinished after approval",
    "wrong-version or incomplete delivery looking complete",
    "stale tab remaining actionable after the project advances",
    "reachable Campaign / job / Kitchen / QA / Squishy residue",
  ] as const,

  outOfScope: [
    "owner_console",
    "room_3",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "new_paid_order_to_repeat_stripe_cert",
    "review_delivery_machinery_rebuild",
    "visual_redesign_spree",
    "merge",
  ] as const,
} as const;
