/**
 * Room 2 Section 2 — returning customer, Board, Help Center truth.
 * Park for Manager. Do not auto-advance.
 *
 * Authority: Tagia 2026-08-17 after closing Section 1 at 45b09b1.
 * Do not redo Section 1 Lobby → checkout. Do not start Owner Console.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom2CustomerFacingTruthAndFrictionEntryV1 } from "@/config/studio-room-2-customer-facing-truth-and-friction-entry-v1";

export const studioRoom2ReturningCustomerBoardAndHelpCenterTruthV1 = {
  packageId: "STUDIO-OPERATING-ROOM-2-RETURNING-CUSTOMER-BOARD-AND-HELP-CENTER-TRUTH-1",
  schemaVersion: 1 as const,
  room: 2 as const,
  roomId: "customer-facing-truth-and-friction-cleanup" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: true as const,
  sectionClosed: false as const,
  doNotAutoAdvance: true as const,
  doNotStartOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenSection1UnlessNewDefect: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule: "CUSTOMER-USE → FIND FRICTION/TRUTH DEFECTS → FIX → BREAK → RETEST → CLOSE SECTION" as const,

  priorSection: {
    packageId: studioRoom2CustomerFacingTruthAndFrictionEntryV1.packageId,
    sectionClosed: studioRoom2CustomerFacingTruthAndFrictionEntryV1.sectionClosed,
    closeTip: studioRoom2CustomerFacingTruthAndFrictionEntryV1.closeEvidence.customerEyesCloseTip,
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
    "returning-client",
    "studio-board",
    "help-center",
    "stale-ask-squishy-and-legacy-labels",
    "project-builder-companion-redirect",
    "communication-control-clarity",
  ] as const,

  lookParticularlyFor: [
    "stale Studio/Squishy terminology",
    "internal Campaign jargon on customer Board",
    "Help Center copy that contradicts Board-as-source-of-truth",
    "obsolete chat / companion labels",
    "duplicate Speak / Type controls beside the permanent dock",
    "competing ask / help / refund surfaces without a clear job",
    "false requirements",
    "unclear next steps for a returning client",
  ] as const,

  outOfScope: [
    "owner_console",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "live_provider_reject_retry_against_final_studio_sender",
    "section_1_front_door_replay",
    "route_map_locked_visuals",
    "kitchen_staff_squishy_language",
    "visual_redesign_spree",
    "merge",
  ] as const,
} as const;
