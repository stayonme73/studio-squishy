import type { JobReviewTextComment } from "@/lib/job-control/review-feedback-types";

export type TextCommentProofRef = {
  id: string;
  versionLabel: string;
};

/** Text Comment needs at least one recorded proof for the focused deliverable. */
export function canTextCommentOnDeliverable(
  proofs: readonly TextCommentProofRef[],
): boolean {
  return proofs.length > 0;
}

export function filterTextCommentsForProof(
  comments: readonly JobReviewTextComment[] | undefined,
  input: { deliverableKey: string; proofFileId: string; versionLabel?: string },
): JobReviewTextComment[] {
  return (comments ?? []).filter((entry) => {
    if (entry.deliverableKey !== input.deliverableKey) return false;
    if (entry.proofFileId !== input.proofFileId) return false;
    if (
      input.versionLabel !== undefined &&
      entry.versionLabel !== input.versionLabel
    ) {
      return false;
    }
    return true;
  });
}

export function buildTextCommentRecord(input: {
  id: string;
  jobId: string;
  deliverableKey: string;
  proofFileId: string;
  versionLabel: string;
  text: string;
  createdAt?: string;
  updatedAt?: string;
}): JobReviewTextComment | null {
  const text = input.text.trim();
  if (!text) return null;
  if (!input.proofFileId.trim()) return null;
  const now = input.updatedAt ?? new Date().toISOString();
  return {
    id: input.id,
    jobId: input.jobId,
    deliverableKey: input.deliverableKey,
    proofFileId: input.proofFileId,
    versionLabel: input.versionLabel,
    text,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Replace or remove one comment id; leave all other comments untouched.
 */
export function upsertTextComment(
  existing: readonly JobReviewTextComment[] | undefined,
  next: JobReviewTextComment,
): JobReviewTextComment[] {
  const kept = (existing ?? []).filter((entry) => entry.id !== next.id);
  return [...kept, next];
}

export function removeTextComment(
  existing: readonly JobReviewTextComment[] | undefined,
  commentId: string,
): JobReviewTextComment[] {
  return (existing ?? []).filter((entry) => entry.id !== commentId);
}
