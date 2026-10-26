/**
 * Studio Board materials status from the existing request union.
 * Optional requests are optional by type. Only consolidated requests carry isBlocking.
 */
import type {
  ClientConsolidatedRequest,
  ClientOptionalRequest,
} from "@/lib/materials/client-requests";

export type BoardMaterialsRequest =
  | { kind: "consolidated"; request: ClientConsolidatedRequest }
  | { kind: "optional"; request: ClientOptionalRequest };

export type BoardMaterialRequestStatus = "Still Needed" | "Received" | "Optional" | "Not Applicable";

export function boardRequestStatus(entry: BoardMaterialsRequest): BoardMaterialRequestStatus {
  const request = entry.request;
  if (request.clientAvailability === "not_available_yet") return "Not Applicable";
  if (
    request.isPendingReview ||
    request.reviewStatus === "submitted" ||
    request.reviewStatus === "approved_for_use"
  ) {
    return "Received";
  }
  if (entry.kind === "optional" && request.canSubmit) return "Optional";
  if (entry.kind === "consolidated" && entry.request.isBlocking === false && entry.request.canSubmit) {
    return "Optional";
  }
  if (request.canSubmit) return "Still Needed";
  return "Not Applicable";
}
