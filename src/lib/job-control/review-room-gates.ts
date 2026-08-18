import { feedbackStudio } from "@/config/feedback-studio";

import type { JobReviewFeedback } from "./review-feedback-types";
import type { PurchasedJobRecord } from "./types";

export type ReviewGateResult = {
  allowed: boolean;
  reasons: string[];
};

/**
 * @deprecated C8c — purchased allowance + owner grants are entitlement authority.
 * Kept only for legacy test references; do not use for customer entitlement.
 */
export const INCLUDED_CLIENT_REVISION_ROUNDS = 3;
/**
 * @deprecated C8c — no silent reserve rounds beyond purchased allowance.
 */
export const RESERVE_CLIENT_REVISION_ROUNDS = 5;

/** @deprecated C8c — use deriveCorrectionAccounting().remaining instead. */
export type ClientRevisionPolicyStage = "included" | "reserve" | "hard_stop";

/** @deprecated C8c — entitlement is ledger-derived remaining, not hardcoded stages. */
export function resolveClientRevisionPolicyStage(
  revisionRoundsUsed: number,
): ClientRevisionPolicyStage {
  const nextRound = revisionRoundsUsed + 1;
  if (nextRound <= INCLUDED_CLIENT_REVISION_ROUNDS) return "included";
  if (nextRound <= RESERVE_CLIENT_REVISION_ROUNDS) return "reserve";
  return "hard_stop";
}

/** @deprecated C8c — reserve free rounds removed; owner extra grants only. */
export function clientRevisionRoundRequiresReserveHandling(
  _revisionRoundsUsed: number,
): boolean {
  return false;
}

/** @deprecated C8c — use remaining === 0 from correction accounting. */
export function clientRevisionRoundHardStops(revisionRoundsUsed: number): boolean {
  return resolveClientRevisionPolicyStage(revisionRoundsUsed) === "hard_stop";
}

export function resolveReviewBlockedReasons(input: {
  job: PurchasedJobRecord;
  feedback: JobReviewFeedback;
  allDeliverablesPrepared: boolean;
  deliverableCount: number;
}): string[] {
  const reasons: string[] = [];

  if (input.job.spineStatus !== "ready_for_review") {
    reasons.push("This job is not ready for client review.");
  }

  if (!input.allDeliverablesPrepared) {
    reasons.push("Required deliverables are not yet prepared.");
  }

  if (input.deliverableCount === 0) {
    reasons.push("No prepared deliverables are available for review.");
  }

  if (input.feedback.submittedAt) {
    reasons.push("Review feedback has already been submitted.");
  }

  return reasons;
}

export function canRequestJobRevision(input: {
  job: PurchasedJobRecord;
  feedback: JobReviewFeedback;
  revisionRoundsRemaining: number;
  allDeliverablesPrepared: boolean;
}): ReviewGateResult {
  const reasons: string[] = [];

  if (input.job.spineStatus !== "ready_for_review") {
    reasons.push("Job must be ready for review.");
  }

  if (input.feedback.submittedAt) {
    reasons.push("Feedback already submitted.");
  }

  if (!input.allDeliverablesPrepared) {
    reasons.push("Required deliverables must be prepared before submitting.");
  }

  if (input.revisionRoundsRemaining <= 0) {
    reasons.push(feedbackStudio.feedbackPanel.revisionLimitShort);
  }

  const hasRevisionSignal = hasClientRevisionIntent(input.feedback);
  if (!hasRevisionSignal) {
    reasons.push("Mark at least one deliverable as Needs Revision or leave feedback.");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canApproveJobForDelivery(input: {
  job: PurchasedJobRecord;
  feedback: JobReviewFeedback;
  allDeliverablesPrepared: boolean;
  deliverableCount: number;
}): ReviewGateResult {
  const reasons: string[] = [];

  if (input.job.spineStatus !== "ready_for_review") {
    reasons.push("Job must be ready for review.");
  }

  if (input.feedback.submittedAt) {
    reasons.push("Feedback already submitted.");
  }

  if (!input.allDeliverablesPrepared) {
    reasons.push("Required deliverables are missing.");
  }

  if (input.deliverableCount === 0) {
    reasons.push("No prepared deliverables to approve.");
  }

  const pendingRevision = Object.values(input.feedback.sectionStatuses).some(
    (status) => status === "revision",
  );
  if (pendingRevision) {
    reasons.push("Resolve revision requests before approving for delivery.");
  }

  const undecided = Object.values(input.feedback.sectionStatuses).some(
    (status) => status === "neutral",
  );
  if (undecided) {
    reasons.push("Review every deliverable — approve, skip, or request revision.");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function hasClientRevisionIntent(feedback: JobReviewFeedback): boolean {
  const sectionRevision = Object.values(feedback.sectionStatuses).some(
    (status) => status === "revision",
  );
  const stickyRevision = feedback.stickyNotes.some((note) => note.color === "coral");
  const hasDraw = feedback.drawSections.length > 0;
  const hasVoice = feedback.voiceNotes.length > 0;
  return sectionRevision || stickyRevision || hasDraw || hasVoice;
}

export function clientRevisionRoundWouldExceed(
  revisionRoundsUsed: number,
  revisionRoundsIncluded: number,
): boolean {
  return revisionRoundsUsed >= revisionRoundsIncluded;
}
