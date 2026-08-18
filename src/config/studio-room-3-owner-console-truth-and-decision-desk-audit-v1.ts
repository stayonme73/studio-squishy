/**
 * Room 3 Section 1 — Owner Console truth and decision-desk audit.
 * PARK for Manager. Not closed. Do not auto-advance.
 *
 * Room 2 is CLOSED. Room 1 remains complete except deferred domain/email.
 * Do not reopen Room 1 or Room 2 unless new evidence proves a genuine defect.
 * Do not reopen Resend/domain. Do not start Room 4 or Room 5. Do not merge.
 * Do not rebuild the Owner Console. Do not start Section 2 automatically.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom2WholeCustomerTruthAndFrictionSweepV1 } from "@/config/studio-room-2-whole-customer-truth-and-friction-sweep-v1";

export const studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1 = {
  packageId: "STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-TRUTH-AND-DECISION-DESK-AUDIT-1",
  schemaVersion: 1 as const,
  room: 3 as const,
  roomId: "owner-console" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: true as const,
  sectionClosed: false as const,
  doNotAutoAdvance: true as const,
  doNotStartSection2: true as const,
  doNotStartRoom4: true as const,
  doNotStartRoom5: true as const,
  doNotRebuildOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  doNotReopenRoom2UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule:
    "OWNER-USE → FIND → FIX → BREAK → RETEST → CLOSE SECTION" as const,

  priorRooms: {
    room1Status: studioRoom1CustomerLifeCloseoutV1.status,
    room1Closed: studioRoom1CustomerLifeCloseoutV1.roomClosed,
    room1AuthoritativeTip: "a49efd7" as const,
    room2Closed: true as const,
    room2Section5PackageId: studioRoom2WholeCustomerTruthAndFrictionSweepV1.packageId,
    room2Section5CloseTip: "b3397a6" as const,
  },

  currentActiveRoom: studioLaunchReadinessExecutionOrderV1.currentActiveRoom,
  currentActiveRoomId: studioLaunchReadinessExecutionOrderV1.currentActiveRoomId,

  comeBackLaterEmail: {
    protectedCheckpoint: studioRoom1CustomerLifeCloseoutV1.comeBackLater.protectedCheckpoint,
    verdict: studioRoom1CustomerLifeCloseoutV1.comeBackLater.verdict,
    doesNotBlockRoom3: true as const,
    neitherPassNorFailForThisAudit: true as const,
  },

  northStar: [
    "what_actually_needs_me",
    "why_it_needs_me",
    "what_happens_if_i_do_nothing",
    "what_are_my_valid_choices",
    "what_happened_after_i_chose",
  ] as const,

  ownerDecisionCategories: [
    "refund",
    "scope_change",
    "pricing_exception",
    "revision_exception_overage",
    "brand_direction_exception",
    "customer_exception",
    "final_qa_when_policy_cannot_resolve",
    "non_deterministic_or_policy_breaking",
  ] as const,

  routineOffDesk: [
    "payment_confirmed",
    "intake_received",
    "file_uploaded",
    "normal_production_status",
    "normal_qa_pass_fail_retry",
    "included_revision_within_allowance",
    "routine_customer_question",
    "ordinary_missing_materials_request",
    "email_retry",
    "normal_delivery_preparation",
    "deterministic_workflow_recovery",
  ] as const,

  outOfScope: [
    "rebuild_owner_console",
    "second_owner_console",
    "move_studio_board_into_owner_console",
    "expose_every_machine_event",
    "make_tagia_the_dispatcher",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "room_4",
    "room_5",
    "visual_redesign_spree",
    "merge",
  ] as const,
} as const;
