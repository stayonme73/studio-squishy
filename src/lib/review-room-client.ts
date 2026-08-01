import type { ClientReviewView } from "@/lib/job-control/review-room-view";
import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { ReviewRoomPatchBody } from "@/lib/job-control/review-room-actions";

export type JobReviewApiResponse = {
  review: ClientReviewView;
};

export type JobReviewPatchResponse = {
  job: { jobId: string; spineStatus: string };
  feedback: JobReviewFeedback;
  review: ClientReviewView | null;
  syncedAt: string;
};

export async function fetchJobReview(
  campaignId: string,
  jobId: string,
): Promise<ClientReviewView | null> {
  const res = await fetch(
    `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(jobId)}/review`,
    { credentials: "include" },
  );

  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to load review");
  }

  const json = (await res.json()) as JobReviewApiResponse;
  return json.review;
}

export async function patchJobReview(
  campaignId: string,
  jobId: string,
  body: ReviewRoomPatchBody,
): Promise<JobReviewPatchResponse> {
  const res = await fetch(
    `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(jobId)}/review`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const json = (await res.json()) as JobReviewPatchResponse & {
    error?: string;
    revisionLimitReached?: boolean;
  };

  if (!res.ok) {
    const error = new Error(json.error ?? "Review request failed") as Error & {
      revisionLimitReached?: boolean;
    };
    error.revisionLimitReached = json.revisionLimitReached;
    throw error;
  }

  return json;
}

export function deliverableKeyToSectionId(key: string): `fallback:${string}` {
  return `fallback:${key}`;
}

export function sectionIdToDeliverableKey(sectionId: string): string {
  if (sectionId.startsWith("fallback:")) {
    return sectionId.slice("fallback:".length);
  }
  return sectionId;
}

export function jobReviewFeedbackToFeedbackSession(
  review: ClientReviewView,
): import("@/config/feedback-studio").FeedbackSession {
  const conceptId = "A" as const;
  const sectionStatuses: import("@/config/feedback-studio").FeedbackSession["sectionStatuses"] =
    {};

  for (const deliverable of review.deliverables) {
    const sectionId = deliverableKeyToSectionId(deliverable.key);
    sectionStatuses[sectionId] =
      review.feedback.sectionStatuses[deliverable.key] ?? "neutral";
  }

  return {
    conceptId,
    campaignId: review.campaignId,
    sectionStatuses,
    stickyNotes: review.feedback.stickyNotes.map((note) => ({
      id: note.id,
      sectionId: deliverableKeyToSectionId(note.deliverableKey),
      color: note.color,
      text: note.text,
      createdAt: note.createdAt,
    })),
    voiceNotes: review.feedback.voiceNotes.map((note) => ({
      id: note.id,
      sectionId: deliverableKeyToSectionId(note.deliverableKey),
      durationSec: note.durationSec,
      createdAt: note.createdAt,
    })),
    drawSections: review.feedback.drawSections.map(deliverableKeyToSectionId),
    highlights: (review.feedback.highlights ?? []).map((entry) => ({
      id: entry.id,
      jobId: entry.jobId,
      deliverableKey: entry.deliverableKey,
      proofFileId: entry.proofFileId,
      versionLabel: entry.versionLabel,
      surface: entry.surface,
      rects: entry.rects.map((rect) => ({ ...rect })),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
    submittedAt: review.feedback.submittedAt ?? null,
  };
}

export function feedbackSessionToJobReviewFeedback(
  session: import("@/config/feedback-studio").FeedbackSession,
  review: ClientReviewView,
): JobReviewFeedback {
  const sectionStatuses: Record<string, import("@/lib/job-control/review-feedback-types").JobReviewSectionDecision> =
    {};

  for (const deliverable of review.deliverables) {
    const sectionId = deliverableKeyToSectionId(deliverable.key);
    sectionStatuses[deliverable.key] =
      (session.sectionStatuses[sectionId] as import("@/lib/job-control/review-feedback-types").JobReviewSectionDecision) ??
      "neutral";
  }

  return {
    packageId: review.feedback.packageId,
    jobId: review.jobId,
    campaignId: review.campaignId,
    sectionStatuses,
    stickyNotes: session.stickyNotes.map((note) => ({
      id: note.id,
      deliverableKey: sectionIdToDeliverableKey(note.sectionId),
      color: note.color,
      text: note.text,
      createdAt: note.createdAt,
    })),
    voiceNotes: session.voiceNotes.map((note) => ({
      id: note.id,
      deliverableKey: sectionIdToDeliverableKey(note.sectionId),
      durationSec: note.durationSec,
      createdAt: note.createdAt,
    })),
    drawSections: session.drawSections.map(sectionIdToDeliverableKey),
    highlights: (session.highlights ?? []).map((entry) => ({
      id: entry.id,
      jobId: entry.jobId || review.jobId,
      deliverableKey: entry.deliverableKey,
      proofFileId: entry.proofFileId,
      versionLabel: entry.versionLabel,
      surface: entry.surface,
      rects: entry.rects.map((rect) => ({ ...rect })),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
    updatedAt: new Date().toISOString(),
    releaseActivityId: review.feedback.releaseActivityId ?? null,
    submittedAt: session.submittedAt,
    submissionType: review.feedback.submissionType ?? null,
  };
}
