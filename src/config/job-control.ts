import type { JobSpineStatus, OwnerDeskReason, ProductionControlLane } from "@/lib/job-control/types";

/** Owner Control Room — extends File Room Owner Console (not a separate dashboard). */
export const OWNER_CONTROL_ROOM_SECTION = {
  pageTitle: "Owner Control Room",
  pageLead:
    "Job-level production spine — lanes, waiting tray, and decisions across all campaigns.",
  ownerDeskTitle: "Owner Desk",
  ownerDeskLead: "Items requiring Owner judgment, support, or escalation review before work continues.",
  ownerDeskEmpty: "No decisions waiting — production can proceed without Owner action.",
  needsCommunicationTitle: "Needs Communication",
  needsCommunicationLead:
    "Internal outbox records for client notices. Test-send only — no live email automation.",
  needsCommunicationEmpty: "No client communication waiting.",
  needsCommunicationTestSendLabel: "Mark test-sent",
  needsCommunicationTestSentLabel: "Test sent",
  lanesTitle: "Production lanes",
  lanesLead: "Active capacity by lane. Paid jobs with incomplete intake do not occupy slots.",
  waitingTrayTitle: "Waiting on Client",
  waitingTrayLead: "Per-job client holds — reminders at 48h, move to tray at 72h without response.",
  activityTitle: "Activity timeline",
  activityLead: "Immutable audit trail — no silent manual status changes.",
  activityEmpty: "No activity recorded for this scope yet.",
  laneLabels: {
    quick: "Quick",
    standard: "Standard",
    heavy: "Heavy",
  } satisfies Record<ProductionControlLane, string>,
  laneCapacity: {
    quick: 2,
    standard: 2,
    heavy: 1,
  } satisfies Record<ProductionControlLane, number>,
  spineStatusLabels: {
    ready_for_queue: "Ready for Queue",
    building_concepts: "Building Concepts",
    ready_for_review: "Ready for Review",
    revision_requested: "Revision Requested",
    approved: "Approved",
    ready_for_delivery: "Ready for Delivery",
    delivered: "Delivered",
    waiting_on_client: "Waiting on Client",
    refunded_cancelled: "Refunded / Cancelled",
  } satisfies Record<JobSpineStatus, string>,
  ownerDeskReasonLabels: {
    approval_before_review: "Owner support review",
    approval_before_delivery: "Approval before final delivery",
    deadline_exception: "Deadline exception",
    scope_issue: "Scope issue",
    revision_limit_reached: "Client boundary review",
    at_risk_job: "At-risk deadline",
    heavy_lane_full: "Heavy lane full",
    refund_eligible: "14-day refund eligible",
    client_complaint: "Client complaint",
  } satisfies Record<OwnerDeskReason, string>,
  activeCountLabel: "Active",
  availableSlotsLabel: "Available",
  nextUpLabel: "Next Up",
  reminderDueLabel: "48h reminder due",
  moveToTrayLabel: "72h → Waiting on Client",
  refundEligibleLabel: "14-day refund eligible",
  returnLaneLabel: "Return lane",
  missingItemsLabel: "Missing items",
  lastResponseLabel: "Last client response",
  requestedLabel: "Requested",
} as const;

/** Policy windows — calendar hours / days for waiting-on-client automation. */
export const JOB_CONTROL_POLICY = {
  reminderDueHours: 48,
  moveToWaitingOnClientHours: 72,
  refundEligibleDays: 14,
} as const;
