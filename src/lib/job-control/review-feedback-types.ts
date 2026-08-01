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

/**
 * HIGHLIGHTER-1 — normalized rect on the proof markup board (0–1).
 * Not a pixel overlay on unrendered file bytes.
 */
export type JobReviewHighlightRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * HIGHLIGHTER-1 — geometry bound to a recorded proof version.
 * `surface` documents the coordinate system; do not invent other surfaces.
 */
export type JobReviewHighlight = {
  id: string;
  jobId: string;
  deliverableKey: string;
  proofFileId: string;
  versionLabel: string;
  surface: "proof_markup_board_v1";
  rects: readonly JobReviewHighlightRect[];
  createdAt: string;
  updatedAt: string;
};

/** Persisted job-scoped client review feedback — tasks envelope (schema v8+). */
export type JobReviewFeedback = {
  /** Stable package id — unique per draft/locked cycle; never reused after lock. */
  packageId: string;
  jobId: string;
  campaignId: string;
  sectionStatuses: Record<string, JobReviewSectionDecision>;
  stickyNotes: JobReviewStickyNote[];
  voiceNotes: JobReviewVoiceNote[];
  drawSections: string[];
  /** HIGHLIGHTER-1 — version-bound highlight geometry (optional on legacy packages). */
  highlights?: readonly JobReviewHighlight[];
  updatedAt: string;
  /** Studio release activity id reviewed when this package was drafted/locked. */
  releaseActivityId?: string | null;
  submittedAt?: string | null;
  submissionType?: "revision_requested" | "approved_for_delivery" | null;
};

export type ClientReviewDeliverable = {
  key: string;
  label: string;
  prepared: boolean;
  preparedAt?: string;
  proofFiles: readonly {
    id: string;
    filename: string;
    fileType: string;
    accessHref: string | null;
    versionLabel: string;
    addedAt: string;
  }[];
};

export function createEmptyJobReviewFeedback(
  campaignId: string,
  jobId: string,
  deliverableKeys: readonly string[],
  options?: {
    packageId?: string;
    releaseActivityId?: string | null;
    updatedAt?: string;
  },
): JobReviewFeedback {
  const now = options?.updatedAt ?? new Date().toISOString();
  const sectionStatuses = Object.fromEntries(
    deliverableKeys.map((key) => [key, "neutral" as JobReviewSectionDecision]),
  );

  return {
    packageId: options?.packageId ?? `pkg:${jobId}:${now}`,
    jobId,
    campaignId,
    sectionStatuses,
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    highlights: [],
    updatedAt: now,
    releaseActivityId: options?.releaseActivityId ?? null,
    submittedAt: null,
    submissionType: null,
  };
}

/** Normalize legacy feedback rows that predate packageId. */
export function ensureFeedbackPackageId(
  feedback: JobReviewFeedback,
): JobReviewFeedback {
  if (feedback.packageId) return feedback;
  const stamp = feedback.submittedAt ?? feedback.updatedAt;
  return {
    ...feedback,
    packageId: `pkg:${feedback.jobId}:${stamp}`,
  };
}
