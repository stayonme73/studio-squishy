/**
 * Room 2 Section 4 — mixed-status and terminology truth.
 * PARK for Manager. Not closed. Do not auto-advance.
 *
 * Prior closes: Section 1 `45b09b1` · Section 2 `e609203` · Section 3 `3328807`.
 * Do not reopen those sections unless new evidence proves a real defect.
 * Do not start Owner Console. Do not reopen Resend/domain. Do not merge.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom2CustomerFacingTruthAndFrictionEntryV1 } from "@/config/studio-room-2-customer-facing-truth-and-friction-entry-v1";
import { studioRoom2ReturningCustomerBoardAndHelpCenterTruthV1 } from "@/config/studio-room-2-returning-customer-board-and-help-center-truth-v1";
import { studioRoom2ReviewFinalDeliveryTruthAndFrictionV1 } from "@/config/studio-room-2-review-final-delivery-truth-and-friction-v1";

export const studioRoom2MixedStatusAndTerminologyTruthV1 = {
  packageId: "STUDIO-OPERATING-ROOM-2-MIXED-STATUS-AND-TERMINOLOGY-TRUTH-1",
  schemaVersion: 1 as const,
  room: 2 as const,
  roomId: "customer-facing-truth-and-friction-cleanup" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: true as const,
  sectionClosed: false as const,
  doNotAutoAdvance: true as const,
  parkEvidence: {
    liveCustomerWalk: "17/17" as const,
    targetedTests: "136/136" as const,
    ownerRoutine: "NONE" as const,
    merge: false as const,
  },
  doNotStartOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenSection1UnlessNewDefect: true as const,
  doNotReopenSection2UnlessNewDefect: true as const,
  doNotReopenSection3UnlessNewDefect: true as const,
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
    "mixed-state-board",
    "status-hierarchy",
    "customer-facing-terminology",
    "help-center-residue",
    "update-history",
    "concept-strategy-labels",
    "cross-surface-agreement",
    "stale-tab-and-mixed-state",
    "customer-eyes-walk",
  ] as const,

  lookParticularlyFor: [
    "Building Concepts vs Project Intake Received as competing current states",
    "Ready for Review remaining current after revision or approval",
    "Final Delivery ready while Review still looks unfinished",
    "job / campaign / task / Kitchen / QA / hash residue on customer surfaces",
    "Help Center each-job wording",
    "Update History machine-log details",
    "reachable Campaign Strategy labels vs dormant catalog residue",
  ] as const,

  outOfScope: [
    "owner_console",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "room_1_production_rebuild",
    "review_delivery_machinery_rebuild",
    "visual_redesign_spree",
    "help_center_full_rewrite",
    "merge",
  ] as const,
} as const;
