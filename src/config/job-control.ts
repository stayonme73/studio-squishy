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
    "Development-only lifecycle-email transport queue. Not part of launch Owner operations.",
  needsCommunicationEmpty: "No client communication waiting.",
  needsCommunicationTestSendLabel: "Mark test-sent",
  needsCommunicationTestSentLabel: "Test sent",
  lanesTitle: "Production lanes",
  lanesLead:
    "Active capacity by lane. A slot is occupied only after production has started or been reserved. Payment, intake, and a copied Building Concepts label do not occupy a slot.",
  waitingTrayTitle: "Waiting on Client",
  waitingTrayLead:
    "Per-job client holds. A service waits here as soon as required materials are missing and returns to its lane when they arrive. No reminder clock, no refund clock.",
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
    refund_eligible: "Refund request",
    client_complaint: "Client complaint",
  } satisfies Record<OwnerDeskReason, string>,
  activeCountLabel: "Active",
  availableSlotsLabel: "Available",
  nextUpLabel: "Next Up",
  waitingOnMaterialsLabel: "Waiting on materials",
  returnLaneLabel: "Return lane",
  missingItemsLabel: "Missing items",
  lastResponseLabel: "Last client response",
  requestedLabel: "Requested",
} as const;

/**
 * Owner decision 2026-10-10 (lifecycle truth, Option A): no customer-facing clock.
 * A job waits on the client as soon as required materials are missing. There is no
 * reminder clock, no Waiting on Client threshold, and no refund waiting period.
 * A refund may be approved before production starts; after production starts the
 * service is non-refundable. Refunds are never automatic.
 */
export const JOB_CONTROL_POLICY = {} as const;
