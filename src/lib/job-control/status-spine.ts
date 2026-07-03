import type { CampaignStatus } from "@/config/studio-board";

import type { JobSpineStatus } from "./types";

/** Bridge legacy campaign-level status to job spine for single-job campaigns. */
export function mapCampaignStatusToSpine(status: CampaignStatus): JobSpineStatus {
  switch (status) {
    case "DISCOVERY_COMPLETE":
    case "DRAFT_RECEIVED":
    case "PAYMENT_RECEIVED":
    case "BUILDING_CONCEPTS":
      return "building_concepts";
    case "READY_FOR_REVIEW":
      return "ready_for_review";
    case "DELIVERED":
      return "delivered";
    default:
      return "building_concepts";
  }
}

export const TERMINAL_SPINE_STATUSES: ReadonlySet<JobSpineStatus> = new Set([
  "delivered",
  "refunded_cancelled",
]);

export function isTerminalSpineStatus(status: JobSpineStatus): boolean {
  return TERMINAL_SPINE_STATUSES.has(status);
}

export const ACTIVE_LANE_SPINE_STATUSES: ReadonlySet<JobSpineStatus> = new Set([
  "building_concepts",
  "revision_requested",
  "approved",
]);

export function occupiesLaneCapacity(status: JobSpineStatus): boolean {
  return ACTIVE_LANE_SPINE_STATUSES.has(status);
}
