/**
 * Kitchen presentation projection from authoritative job-spine status.
 *
 * This is NOT a second production ledger. JobSpineStatus remains authoritative.
 * Kitchen buckets are a visual grouping for internal operations only.
 */

import type { KitchenFileBucketId } from "@/config/studio-kitchen-file-room";
import type { JobSpineStatus } from "@/lib/job-control/types";

import type { KitchenProjectedPlacement } from "./types";

const SPINE_LABELS: Record<JobSpineStatus, string> = {
  ready_for_queue: "Ready for queue",
  building_concepts: "Building concepts",
  ready_for_review: "Ready for review",
  revision_requested: "Revision requested",
  approved: "Approved",
  ready_for_delivery: "Ready for delivery",
  delivered: "Delivered",
  waiting_on_client: "Waiting on client",
  refunded_cancelled: "Refunded / cancelled",
};

export function jobSpineStatusLabel(status: JobSpineStatus): string {
  return SPINE_LABELS[status];
}

/**
 * Map authoritative spine status → Kitchen file-bucket presentation.
 * Owner-approval pending can refine review placement without inventing new status.
 */
export function projectKitchenBucketFromSpine(input: {
  spineStatus: JobSpineStatus;
  ownerApprovalPending: "before_review" | "before_delivery" | null;
  intakeComplete: boolean;
  hasBlockingMaterials: boolean;
}): KitchenProjectedPlacement {
  const { spineStatus, ownerApprovalPending, intakeComplete, hasBlockingMaterials } = input;

  if (spineStatus === "waiting_on_client" || hasBlockingMaterials) {
    return {
      folderLocation: "tray",
      homeBucketId: intakeComplete ? "production-ready" : "intake-received",
      trayId: "client-delayed",
      projectionKind: "waiting_client",
    };
  }

  let homeBucketId: KitchenFileBucketId;

  switch (spineStatus) {
    case "ready_for_queue":
      homeBucketId = intakeComplete ? "production-ready" : "intake-received";
      break;
    case "building_concepts":
      homeBucketId = "in-production";
      break;
    case "ready_for_review":
      homeBucketId =
        ownerApprovalPending === "before_review"
          ? "owner-review"
          : "client-reviewing-deliverables";
      break;
    case "revision_requested":
      homeBucketId = "revision-queue";
      break;
    case "approved":
      homeBucketId =
        ownerApprovalPending === "before_delivery" ? "owner-review" : "final-delivery";
      break;
    case "ready_for_delivery":
    case "delivered":
      homeBucketId = "final-delivery";
      break;
    case "refunded_cancelled":
      homeBucketId = "final-delivery";
      break;
    default:
      homeBucketId = "intake-received";
      break;
  }

  return {
    folderLocation: "bucket",
    homeBucketId,
    trayId: null,
    projectionKind: "job_spine",
  };
}
