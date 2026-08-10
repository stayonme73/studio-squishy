import type { JobReviewFeedback } from "./review-feedback-types";
import type { JobActivityEventKind } from "./types";

/** Client may access Review Room only when job is ready and internally QA-authorized. */
export function canClientAccessJobReview(job: {
  spineStatus: string;
  ownerApprovalPending?: string | null;
  internalQaReviewAuthorization?: { status?: string } | null;
}): boolean {
  if (job.ownerApprovalPending === "before_review") return false;
  if (job.spineStatus !== "ready_for_review") return false;
  // Fail closed: spine alone is not enough after QA-BEFORE-REVIEW-1.
  return job.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW";
}

/**
 * C8b — read-only view of a locked submitted package after spine leaves ready_for_review.
 * Mutations still require `canClientAccessJobReview`.
 * UPDATE-HISTORY-1 — also allows read-only view on delivery spines so Final / Delivery
 * can show Update History without inventing a second access path.
 */
export function canClientViewJobReview(
  job: {
    spineStatus: string;
    ownerApprovalPending?: string | null;
  },
  feedback?: JobReviewFeedback | null,
): boolean {
  if (canClientAccessJobReview(job)) return true;
  const readOnlySpines = new Set([
    "revision_requested",
    "ready_for_queue",
    "approved",
    "ready_for_delivery",
    "delivered",
  ]);
  if (!readOnlySpines.has(job.spineStatus)) return false;
  if (feedback?.submittedAt) return true;
  return (
    job.spineStatus === "ready_for_delivery" ||
    job.spineStatus === "delivered" ||
    job.spineStatus === "approved"
  );
}

const CLIENT_HIDDEN_ACTIVITY_KINDS = new Set<JobActivityEventKind>([
  "internal_note",
  "working_file_ref",
  "deliverable_prepared",
  "owner_final_release",
  "client_delivery_file_added",
  "file_reference_added",
  "file_visibility_changed",
  "file_version_updated",
  "file_released",
  "file_download_available",
]);

export function filterClientVisibleActivity(
  events: readonly import("./types").JobActivityEvent[],
  jobId: string,
): import("./types").JobActivityEvent[] {
  return events.filter(
    (event) =>
      event.jobId === jobId && !CLIENT_HIDDEN_ACTIVITY_KINDS.has(event.kind),
  );
}

/** Client must own the campaign — enforced at API layer via canReadCampaign. */
export function canClientAccessCampaignJob(
  userCampaignId: string | undefined,
  envelopeClientUserId: string | undefined,
  userId: string,
  campaignId: string,
): boolean {
  if (userCampaignId === campaignId) return true;
  if (envelopeClientUserId === userId) return true;
  return false;
}
