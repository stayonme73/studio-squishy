/**
 * Room 2 Section 1 — customer-facing truth + friction entry.
 * CLOSED 2026-08-17 by Tagia on customer-eyes evidence.
 *
 * Close tip `45b09b1`. Earlier PARK checkpoint `90dcc84` is not the close.
 * Board-as-source-of-truth below the pay button remains a non-blocking note.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";

export const studioRoom2CustomerFacingTruthAndFrictionEntryV1 = {
  packageId: "STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1",
  schemaVersion: 2 as const,
  room: 2 as const,
  roomId: "customer-facing-truth-and-friction-cleanup" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: false as const,
  sectionClosed: true as const,
  closedAt: "2026-08-17" as const,
  doNotAutoAdvance: true as const,
  doNotStartOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule: "CUSTOMER-USE → FIND FRICTION/TRUTH DEFECTS → FIX → BREAK → RETEST → CLOSE SECTION" as const,

  closeEvidence: {
    customerEyesWalk: "30/30" as const,
    targetedTests: "54/54" as const,
    frictionFixedBeforeRerun: true as const,
    ownerRoutine: "NONE" as const,
    merge: false as const,
    customerEyesCloseTip: "45b09b1" as const,
    parkCheckpointNotClose: "90dcc84" as const,
    nonBlockingNote:
      "Board-as-source-of-truth copy sits below the pay button — recorded, not a Section 1 blocker.",
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

  /** First-section customer spine — do not jump to Board / intake / delivery. */
  scopedSpine: [
    "lobby-entry",
    "conversation-room",
    "recommendation-service-selection",
    "project-review",
    "payment-handoff",
  ] as const,

  lookParticularlyFor: [
    "stale Studio/Squishy terminology",
    "internal jargon exposed to customers",
    "contradictory instructions",
    "misleading status or promises",
    "obsolete tool references",
    "duplicate or competing controls",
    "false requirements",
    "unclear next steps",
    "recommendation language that overclaims",
    "customer-visible product/scope/pricing contradictions",
    "checkout regressions",
  ] as const,

  outOfScope: [
    "owner_console",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "live_provider_reject_retry_against_final_studio_sender",
    "studio_board_later_friction",
    "intake_later_friction",
    "review_delivery_later_friction",
    "visual_redesign_spree",
    "merge",
  ] as const,
} as const;
