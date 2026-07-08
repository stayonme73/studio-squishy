import type { JobReviewFeedback } from "./review-feedback-types";
import type { PurchasedJobRecord } from "./types";

export type ReviewGateResult = {
  allowed: boolean;
  reasons: string[];
};

export type ClientRevisionPolicyStage = "included" | "reserve" | "hard_stop";

export const INCLUDED_CLIENT_REVISION_ROUNDS = 3;
export const RESERVE_CLIENT_REVISION_ROUNDS = 5;

export function resolveClientRevisionPolicyStage(
  revisionRoundsUsed: number,
): ClientRevisionPolicyStage {
  const nextRound = revisionRoundsUsed + 1;
  if (nextRound <= INCLUDED_CLIENT_REVISION_ROUNDS) return "included";
  if (nextRound <= RESERVE_CLIENT_REVISION_ROUNDS) return "reserve";
  return "hard_stop";
}

export function clientRevisionRoundRequiresReserveHandling(
  revisionRoundsUsed: number,
): boolean {
  return resolveClientRevisionPolicyStage(revisionRoundsUsed) === "reserve";
}

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
  revisionRoundsUsed: number;
  revisionRoundsIncluded: number;
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

  if (clientRevisionRoundHardStops(input.revisionRoundsUsed)) {
    reasons.push("Revision policy has reached the hard stop.");
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

function hasClientRevisionIntent(feedback: JobReviewFeedback): boolean {
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
