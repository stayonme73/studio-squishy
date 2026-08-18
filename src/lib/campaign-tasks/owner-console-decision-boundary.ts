import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import type { OwnerDeskItem } from "@/lib/job-control/owner-desk";
import type { JobCommunicationDeliveryStatus } from "@/lib/job-control/types";

import type { OwnerConsoleScanBucketId } from "./owner-console-scan-view";

/**
 * Room 3 Section 1 — classify existing Owner Console surfaces against
 * the decision-desk boundary. Presentation-only. Does not invent causes
 * or create a second console.
 */
export type OwnerDeskSurfaceClass =
  | "genuine_owner_decision"
  | "useful_owner_visibility"
  | "routine_off_desk"
  | "stale_residue"
  | "confusing_duplicate";

export function classifyExceptionKindForOwnerDesk(
  kind: CampaignExceptionKind,
): OwnerDeskSurfaceClass {
  switch (kind) {
    case "compliance_hold":
    case "direction_disagreement":
    case "scope_change":
    case "deadline_commitment":
    case "deadline_risk":
    case "revision_exhausted":
    case "client_request":
      return "genuine_owner_decision";
    case "missing_client_fact":
      return "routine_off_desk";
    case "routine_internal":
      return "routine_off_desk";
  }
}

export function classifyDeskReasonForOwnerDesk(
  reason: OwnerDeskItem["reason"],
): OwnerDeskSurfaceClass {
  switch (reason) {
    case "approval_before_review":
    case "approval_before_delivery":
    case "deadline_exception":
    case "scope_issue":
    case "revision_limit_reached":
    case "at_risk_job":
    case "refund_eligible":
    case "client_complaint":
      return "genuine_owner_decision";
    case "heavy_lane_full":
      return "genuine_owner_decision";
  }
}

export function classifyScanBucketForOwnerDesk(
  bucketId: OwnerConsoleScanBucketId,
): OwnerDeskSurfaceClass {
  switch (bucketId) {
    case "waiting_client":
    case "recently_resolved":
      return "useful_owner_visibility";
    case "blocked":
    case "waiting_internal":
    case "ready_to_move":
      return "routine_off_desk";
  }
}

export function classifyCommunicationDeliveryForOwnerDesk(
  status: JobCommunicationDeliveryStatus,
): OwnerDeskSurfaceClass {
  switch (status) {
    case "sent":
    case "test_sent":
    case "cancelled":
      return "routine_off_desk";
    case "pending_owner_send":
      return "stale_residue";
    case "delivery_failed":
      return "useful_owner_visibility";
  }
}

export function shouldExceptionKindAppearOnSequentialDesk(
  kind: CampaignExceptionKind,
): boolean {
  return classifyExceptionKindForOwnerDesk(kind) === "genuine_owner_decision";
}
