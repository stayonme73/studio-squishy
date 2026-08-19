/**
 * Room 3 Section 2 — Owner decision execution and aftermath.
 * CLOSED at 199e4a4. Do not reopen unless new evidence.
 *
 * Section 1 CLOSED at 76b974f. Do not reopen it unless new evidence.
 * Room 2 is CLOSED. Room 1 remains complete except deferred domain/email.
 * Do not reopen Resend/domain. Do not start Room 4 or Room 5. Do not merge.
 * Do not rebuild the Owner Console.
 */

import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { studioRoom1CustomerLifeCloseoutV1 } from "@/config/studio-room-1-customer-life-closeout-v1";
import { studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1 } from "@/config/studio-room-3-owner-console-truth-and-decision-desk-audit-v1";

export const studioRoom3OwnerDecisionExecutionAndAftermathV1 = {
  packageId: "STUDIO-OPERATING-ROOM-3-OWNER-DECISION-EXECUTION-AND-AFTERMATH-1",
  schemaVersion: 1 as const,
  room: 3 as const,
  roomId: "owner-console" as const,
  merge: "separately_authorized" as const,
  ownerRoutine: "NONE" as const,
  parkForManager: false as const,
  sectionClosed: true as const,
  closedAt: "2026-08-19" as const,
  closeTip: "199e4a4" as const,
  doNotAutoAdvance: true as const,
  doNotStartSection3: false as const,
  doNotStartRoom4: true as const,
  doNotStartRoom5: true as const,
  doNotRebuildOwnerConsole: true as const,
  doNotReopenResend: true as const,
  doNotReopenRoom1UnlessNewDefect: true as const,
  doNotReopenRoom2UnlessNewDefect: true as const,
  doNotReopenSection1UnlessNewDefect: true as const,
  visualRedesign: false as const,
  closeRule:
    "OWNER-USE → DECIDE → SYSTEM-ACTS → BREAK → RECOVER → RETEST → CLOSE" as const,
  northStar:
    "OWNER DECIDES → MACHINE RECORDS → SYSTEM ACTS → CUSTOMER/PROJECT TRUTH UPDATES → FOLLOW-UP HAPPENS → NOTHING GETS STRANDED" as const,

  priorSection: {
    packageId: studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1.packageId,
    sectionClosed: studioRoom3OwnerConsoleTruthAndDecisionDeskAuditV1.sectionClosed,
    closeTip: "76b974f" as const,
  },

  priorRooms: {
    room1Status: studioRoom1CustomerLifeCloseoutV1.status,
    room1Closed: studioRoom1CustomerLifeCloseoutV1.roomClosed,
    room1AuthoritativeTip: "a49efd7" as const,
    room2Closed: true as const,
    room2Section5CloseTip: "b3397a6" as const,
  },

  currentActiveRoom: studioLaunchReadinessExecutionOrderV1.currentActiveRoom,
  currentActiveRoomId: studioLaunchReadinessExecutionOrderV1.currentActiveRoomId,

  comeBackLaterEmail: {
    protectedCheckpoint: studioRoom1CustomerLifeCloseoutV1.comeBackLater.protectedCheckpoint,
    verdict: studioRoom1CustomerLifeCloseoutV1.comeBackLater.verdict,
    doesNotBlockRoom3: true as const,
    neitherPassNorFailForThisAudit: true as const,
    deferredTransportNote:
      "Outbound branded email remains parked at d6974eb. In-app Board / project record is the customer channel for this section." as const,
  },

  supportedDecisionClasses: [
    "refund",
    "pricing_exception",
    "scope_exception",
    "revision_overage_exception",
    "compliance_policy_hold",
    "ask_customer_for_more_information",
    "approve",
    "decline",
    "hold_pause",
  ] as const,

  customerChannelsInScope: [
    "studio_board_status",
    "studio_board_studio_request",
    "project_communication_in_app",
    "refund_request_status",
    "job_in_app_outbox",
  ] as const,

  outOfScope: [
    "rebuild_owner_console",
    "branded_sender_certification",
    "real_inbox_delivery_proof",
    "invented_read_receipts",
    "invented_decision_types",
    "room_1_resend_reopen",
    "room_2_reopen",
    "room_4",
    "room_5",
    "visual_redesign_spree",
    "merge",
  ] as const,
} as const;
