/**
 * Room 3 Section 3 — whole-desk rehearsal and Room 3 closeout sweep.
 * CLOSED 2026-08-19 at cd2a1e2. Do not reopen unless new evidence.
 *
 * Section 1 CLOSED at 76b974f. Section 2 CLOSED at 199e4a4.
 * Do not reopen prior sections unless new evidence.
 * Room 2 is CLOSED. Room 1 remains complete except deferred domain/email.
 * Do not reopen Resend/domain. Do not merge. Do not rebuild Owner Console.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1 } from "@/config/studio-room-3-owner-console-truth-and-decision-desk-audit-v1";
import { studioRoom3OwnerDecisionExecutionAndAftermathV1 } from "@/config/studio-room-3-owner-decision-execution-and-aftermath-v1";

export const studioRoom3OwnerConsoleWholeDeskRehearsalAndCloseoutV1 = {
  packageId: "STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-WHOLE-DESK-REHEARSAL-AND-CLOSEOUT-1",
  schemaVersion: 1 as const,
  room: 3 as const,
  roomId: "owner-console" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: false as const,
  sectionClosed: true as const,
  roomClosed: true as const,
  closedAt: "2026-08-19" as const,
  closeTip: "cd2a1e2" as const,
  doNotAutoAdvance: true as const,
  doNotStartRoom4: false as const,
  doNotStartRoom5: true as const,
  doNotRebuildOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  doNotReopenRoom2UnlessNewDefect: true as const,
  doNotReopenSection1UnlessNewDefect: true as const,
  doNotReopenSection2UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule: "OWNER-USE → FIND → FIX → BREAK → RETEST → CLOSE" as const,
  northStar:
    "SEE → UNDERSTAND → DECIDE → SYSTEM ACTS → HISTORY REMAINS TRUE → RETURN LATER" as const,

  priorSections: {
    section1: {
      packageId: studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1.packageId,
      sectionClosed: true as const,
      closeTip: "76b974f" as const,
    },
    section2: {
      packageId: studioRoom3OwnerDecisionExecutionAndAftermathV1.packageId,
      sectionClosed: true as const,
      closeTip: "199e4a4" as const,
    },
  },

  priorRooms: studioRoom3OwnerDecisionExecutionAndAftermathV1.priorRooms,

  currentActiveRoom: studioLaunchReadinessExecutionOrderV1.currentActiveRoom,
  currentActiveRoomId: studioLaunchReadinessExecutionOrderV1.currentActiveRoomId,

  comeBackLaterEmail: studioRoom3OwnerDecisionExecutionAndAftermathV1.comeBackLaterEmail,

  mixedDeskClasses: [
    "refund",
    "pricing_exception",
    "scope_change",
    "revision_exhausted",
    "compliance_hold",
    "client_request",
    "client_complaint",
    "ask_customer_for_more_information",
    "hold_pause",
  ] as const,

  routineOffDesk: studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1.routineOffDesk,

  outOfScope: [
    "rebuild_owner_console",
    "add_tools",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "room_4",
    "room_5",
    "merge",
    "visual_redesign_spree",
  ] as const,
} as const;
