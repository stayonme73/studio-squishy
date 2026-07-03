import type { JobActivityEventKind } from "./types";

/** Client may access Review Room only when job is ready for their review. */
export function canClientAccessJobReview(job: {
  spineStatus: string;
  ownerApprovalPending?: string | null;
}): boolean {
  if (job.ownerApprovalPending === "before_review") return false;
  return job.spineStatus === "ready_for_review";
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
