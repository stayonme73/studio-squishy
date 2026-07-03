import type { StickyNoteColorId } from "@/config/feedback-studio";

/** Per-deliverable section decision in client Review Room. */
export type JobReviewSectionDecision = "neutral" | "approved" | "revision" | "skip";

export type JobReviewStickyNote = {
  id: string;
  deliverableKey: string;
  color: StickyNoteColorId;
  text: string;
  createdAt: string;
};

export type JobReviewVoiceNote = {
  id: string;
  deliverableKey: string;
  durationSec: number;
  createdAt: string;
};

/** Persisted job-scoped client review feedback — tasks envelope (schema v8). */
export type JobReviewFeedback = {
  jobId: string;
  campaignId: string;
  sectionStatuses: Record<string, JobReviewSectionDecision>;
  stickyNotes: JobReviewStickyNote[];
  voiceNotes: JobReviewVoiceNote[];
  drawSections: string[];
  updatedAt: string;
  submittedAt?: string | null;
  submissionType?: "revision_requested" | "approved_for_delivery" | null;
};

export type ClientReviewDeliverable = {
  key: string;
  label: string;
  prepared: boolean;
  preparedAt?: string;
};

export function createEmptyJobReviewFeedback(
  campaignId: string,
  jobId: string,
  deliverableKeys: readonly string[],
): JobReviewFeedback {
  const now = new Date().toISOString();
  const sectionStatuses = Object.fromEntries(
    deliverableKeys.map((key) => [key, "neutral" as JobReviewSectionDecision]),
  );

  return {
    jobId,
    campaignId,
    sectionStatuses,
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    updatedAt: now,
    submittedAt: null,
    submissionType: null,
  };
}
