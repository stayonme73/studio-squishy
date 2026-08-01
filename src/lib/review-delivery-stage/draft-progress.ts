/**
 * Detect material saved-but-unsubmitted review progress.
 *
 * Empty review shells (all-neutral sections, no notes/draws) must not count
 * as Customer Reviewing — `createEmptyJobReviewFeedback` always sets `updatedAt`.
 */

import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";

export function hasUnsubmittedReviewDraft(
  feedback: JobReviewFeedback | null | undefined,
): boolean {
  if (!feedback) return false;
  if (feedback.submittedAt) return false;

  const hasNonNeutralSection = Object.values(feedback.sectionStatuses).some(
    (status) => status !== "neutral",
  );
  if (hasNonNeutralSection) return true;
  if (feedback.stickyNotes.length > 0) return true;
  if (feedback.voiceNotes.length > 0) return true;
  if (feedback.drawSections.length > 0) return true;
  if ((feedback.textComments?.length ?? 0) > 0) return true;
  return false;
}
