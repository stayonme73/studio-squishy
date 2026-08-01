/**
 * C8b — presentation helpers over existing review activity + feedback.
 * Does not replace Package 7A stage derivation.
 */

import { C8A_HANDOFF_PRESENTATION_LABEL } from "@/config/c8a-review-handoff-presentation-v1";
import { hasUnsubmittedReviewDraft } from "@/lib/review-delivery-stage/draft-progress";

import type {
  ClientReviewDeliverable,
  JobReviewFeedback,
} from "./review-feedback-types";
import type { JobActivityEvent } from "./types";

export const CLIENT_REVIEW_RECEIVED_RELEASE_REF_PREFIX = "release:" as const;

export type StudioReviewReleaseEvidence = {
  activityId: string;
  occurredAt: string;
  actorLabel: string;
  reason: string | null;
};

export type StudioSubmissionReceipt = {
  statusLabel: string;
  versionLabel: string;
  submittedAtLabel: string;
  submittedByLabel: string;
  actionRequired: string;
  hasCompleteEvidence: boolean;
};

export type FeedbackPackageInventory = {
  stickyNoteCount: number;
  stickyNoteTexts: readonly string[];
  drawingSectionCount: number;
  voiceNoteCount: number;
  sectionDecisions: readonly { key: string; status: string }[];
  versionLabel: string;
  isEmpty: boolean;
};

export type LockedFeedbackPackageReceipt = {
  title: string;
  statusLabel: string;
  versionLabel: string;
  submittedAtLabel: string;
  submittedByLabel: string;
  submissionTypeLabel: string;
  inventory: FeedbackPackageInventory;
};

export type C8bHandoffStepId =
  | "submitted_to_customer"
  | "received_by_customer"
  | "customer_reviewing"
  | "feedback_returned"
  | "approved";

const HANDOFF_CHAIN_ORDER: readonly C8bHandoffStepId[] = [
  "submitted_to_customer",
  "received_by_customer",
  "customer_reviewing",
  "feedback_returned",
] as const;

export function releaseMessageRef(releaseActivityId: string): string {
  return `${CLIENT_REVIEW_RECEIVED_RELEASE_REF_PREFIX}${releaseActivityId}`;
}

export function isStudioReviewReleaseEvent(event: JobActivityEvent): boolean {
  if (event.actor.role === "client") return false;
  if (event.kind === "status_change" && event.spineStatus === "ready_for_review") {
    return true;
  }
  if (
    event.kind === "approval" &&
    Boolean(event.reason?.toLowerCase().includes("review room"))
  ) {
    return true;
  }
  return false;
}

/** Latest Studio → customer review release for this job (authoritative activity). */
export function findLatestStudioReviewRelease(
  events: readonly JobActivityEvent[],
  jobId: string,
): StudioReviewReleaseEvidence | null {
  const releases = events
    .filter((event) => event.jobId === jobId && isStudioReviewReleaseEvent(event))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const latest = releases[releases.length - 1];
  if (!latest) return null;

  const actorLabel =
    latest.actor.displayName?.trim() ||
    (latest.actor.role === "system" ? "Studio" : "Studio team");

  return {
    activityId: latest.id,
    occurredAt: latest.occurredAt,
    actorLabel,
    reason: latest.reason ?? null,
  };
}

export function findClientReviewReceivedForRelease(
  events: readonly JobActivityEvent[],
  jobId: string,
  releaseActivityId: string,
): JobActivityEvent | null {
  const ref = releaseMessageRef(releaseActivityId);
  return (
    events.find(
      (event) =>
        event.jobId === jobId &&
        event.kind === "client_review_received" &&
        event.messageRef === ref,
    ) ?? null
  );
}

export function resolveProofVersionLabel(
  deliverables: readonly ClientReviewDeliverable[],
): string | null {
  const labels = deliverables
    .flatMap((entry) => entry.proofFiles.map((file) => file.versionLabel.trim()))
    .filter(Boolean);
  if (labels.length === 0) return null;
  return labels[labels.length - 1] ?? null;
}

export function formatReceiptDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function buildStudioSubmissionReceipt(input: {
  deliverables: readonly ClientReviewDeliverable[];
  activity: readonly JobActivityEvent[];
  jobId: string;
}): StudioSubmissionReceipt | null {
  const release = findLatestStudioReviewRelease(input.activity, input.jobId);
  if (!release) return null;

  const versionLabel =
    resolveProofVersionLabel(input.deliverables) ?? "Version label not provided";
  const submittedAtLabel =
    formatReceiptDateTime(release.occurredAt) ?? "Submission time not available";

  return {
    statusLabel: C8A_HANDOFF_PRESENTATION_LABEL.submittedToCustomer,
    versionLabel,
    submittedAtLabel,
    submittedByLabel: release.actorLabel,
    actionRequired:
      "Review this version and either return feedback or approve it",
    hasCompleteEvidence: Boolean(
      resolveProofVersionLabel(input.deliverables) &&
        formatReceiptDateTime(release.occurredAt),
    ),
  };
}

export function buildFeedbackPackageInventory(
  feedback: JobReviewFeedback,
  deliverables: readonly ClientReviewDeliverable[],
): FeedbackPackageInventory {
  const stickyNoteTexts = feedback.stickyNotes
    .map((note) => note.text.trim())
    .filter(Boolean);
  const sectionDecisions = Object.entries(feedback.sectionStatuses)
    .filter(([, status]) => status !== "neutral")
    .map(([key, status]) => ({ key, status }));

  const isEmpty =
    stickyNoteTexts.length === 0 &&
    feedback.voiceNotes.length === 0 &&
    feedback.drawSections.length === 0 &&
    (feedback.highlights?.length ?? 0) === 0 &&
    sectionDecisions.length === 0;

  return {
    stickyNoteCount: feedback.stickyNotes.length,
    stickyNoteTexts,
    drawingSectionCount: feedback.drawSections.length,
    voiceNoteCount: feedback.voiceNotes.length,
    sectionDecisions,
    versionLabel:
      resolveProofVersionLabel(deliverables) ?? "Version label not provided",
    isEmpty,
  };
}

export function buildLockedFeedbackPackageReceipt(input: {
  feedback: JobReviewFeedback;
  deliverables: readonly ClientReviewDeliverable[];
  senderLabel: string;
}): LockedFeedbackPackageReceipt | null {
  if (!input.feedback.submittedAt || !input.feedback.submissionType) {
    return null;
  }

  const inventory = buildFeedbackPackageInventory(
    input.feedback,
    input.deliverables,
  );
  const isApproval = input.feedback.submissionType === "approved_for_delivery";

  return {
    title: "Locked feedback package",
    statusLabel: isApproval
      ? C8A_HANDOFF_PRESENTATION_LABEL.approved
      : C8A_HANDOFF_PRESENTATION_LABEL.feedbackReturned,
    versionLabel: inventory.versionLabel,
    submittedAtLabel:
      formatReceiptDateTime(input.feedback.submittedAt) ??
      "Submission time not available",
    submittedByLabel: input.senderLabel,
    submissionTypeLabel: isApproval ? "Approved for delivery" : "Request changes",
    inventory,
  };
}

export function resolveC8bHandoffStep(input: {
  feedback: JobReviewFeedback;
  activity: readonly JobActivityEvent[];
  jobId: string;
}): {
  currentStepId: C8bHandoffStepId;
  currentLabel: string;
  chainLabels: readonly string[];
} {
  const release = findLatestStudioReviewRelease(input.activity, input.jobId);
  const received = release
    ? findClientReviewReceivedForRelease(
        input.activity,
        input.jobId,
        release.activityId,
      )
    : null;
  const hasDraft = hasUnsubmittedReviewDraft(input.feedback);

  let currentStepId: C8bHandoffStepId = "submitted_to_customer";

  if (input.feedback.submittedAt) {
    if (input.feedback.submissionType === "approved_for_delivery") {
      currentStepId = "approved";
    } else if (input.feedback.submissionType === "revision_requested") {
      currentStepId = "feedback_returned";
    }
  } else if (received && hasDraft) {
    currentStepId = "customer_reviewing";
  } else if (received) {
    currentStepId = "received_by_customer";
  }

  const labelFor = (step: C8bHandoffStepId): string => {
    switch (step) {
      case "submitted_to_customer":
        return C8A_HANDOFF_PRESENTATION_LABEL.submittedToCustomer;
      case "received_by_customer":
        return C8A_HANDOFF_PRESENTATION_LABEL.receivedByCustomer;
      case "customer_reviewing":
        return C8A_HANDOFF_PRESENTATION_LABEL.customerReviewing;
      case "feedback_returned":
        return C8A_HANDOFF_PRESENTATION_LABEL.feedbackReturned;
      case "approved":
        return C8A_HANDOFF_PRESENTATION_LABEL.approved;
    }
  };

  const chainLabels =
    currentStepId === "approved"
      ? [
          ...HANDOFF_CHAIN_ORDER.slice(0, 3).map(labelFor),
          C8A_HANDOFF_PRESENTATION_LABEL.approved,
        ]
      : HANDOFF_CHAIN_ORDER.map(labelFor);

  return {
    currentStepId,
    currentLabel: labelFor(currentStepId),
    chainLabels,
  };
}
