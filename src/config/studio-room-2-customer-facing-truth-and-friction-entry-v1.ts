/**
 * Room 2 entry — customer-facing truth + friction cleanup.
 * First section only. Park for Manager. Do not auto-advance.
 *
 * Authority: Tagia Room 1 closeout call 2026-08-17.
 * Room 1 stays open solely for deferred domain/email at d6974eb.
 * That yellow sticky does not block Room 2.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";

export const studioRoom2CustomerFacingTruthAndFrictionEntryV1 = {
  packageId: "STUDIO-OPERATING-ROOM-2-CUSTOMER-FACING-TRUTH-AND-FRICTION-ENTRY-1",
  schemaVersion: 1 as const,
  room: 2 as const,
  roomId: "customer-facing-truth-and-friction-cleanup" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: true as const,
  doNotAutoAdvance: true as const,
  doNotStartOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule: "CUSTOMER-USE → FIND FRICTION/TRUTH DEFECTS → FIX → BREAK → RETEST → CLOSE SECTION" as const,

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
