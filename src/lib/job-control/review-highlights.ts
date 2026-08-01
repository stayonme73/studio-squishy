import type {
  JobReviewHighlight,
  JobReviewHighlightRect,
} from "@/lib/job-control/review-feedback-types";

export const PROOF_MARKUP_BOARD_SURFACE = "proof_markup_board_v1" as const;

export type HighlightProofRef = {
  id: string;
  versionLabel: string;
};

/** Highlighter needs at least one recorded proof for the focused deliverable. */
export function canHighlightOnDeliverable(
  proofs: readonly HighlightProofRef[],
): boolean {
  return proofs.length > 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Normalize and reject degenerate / out-of-bounds rects. */
export function normalizeHighlightRect(
  rect: JobReviewHighlightRect,
): JobReviewHighlightRect | null {
  const x = clamp01(rect.x);
  const y = clamp01(rect.y);
  const w = clamp01(rect.w);
  const h = clamp01(rect.h);
  if (w < 0.01 || h < 0.01) return null;
  const next = {
    x,
    y,
    w: x + w > 1 ? 1 - x : w,
    h: y + h > 1 ? 1 - y : h,
  };
  if (next.w < 0.01 || next.h < 0.01) return null;
  return next;
}

export function filterHighlightsForProof(
  highlights: readonly JobReviewHighlight[] | undefined,
  input: { deliverableKey: string; proofFileId: string },
): JobReviewHighlight[] {
  return (highlights ?? []).filter(
    (entry) =>
      entry.deliverableKey === input.deliverableKey &&
      entry.proofFileId === input.proofFileId &&
      entry.surface === PROOF_MARKUP_BOARD_SURFACE,
  );
}

export function buildHighlightRecord(input: {
  id: string;
  jobId: string;
  deliverableKey: string;
  proofFileId: string;
  versionLabel: string;
  rects: readonly JobReviewHighlightRect[];
  createdAt?: string;
  updatedAt?: string;
}): JobReviewHighlight | null {
  const rects = input.rects
    .map(normalizeHighlightRect)
    .filter((rect): rect is JobReviewHighlightRect => Boolean(rect));
  if (rects.length === 0) return null;
  if (!input.proofFileId.trim()) return null;
  const now = input.updatedAt ?? new Date().toISOString();
  return {
    id: input.id,
    jobId: input.jobId,
    deliverableKey: input.deliverableKey,
    proofFileId: input.proofFileId,
    versionLabel: input.versionLabel,
    surface: PROOF_MARKUP_BOARD_SURFACE,
    rects,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Replace highlights for one proof on one deliverable; leave all other
 * deliverable/proof bindings untouched.
 */
export function upsertHighlightsForProof(
  existing: readonly JobReviewHighlight[] | undefined,
  nextForProof: readonly JobReviewHighlight[],
  scope: { deliverableKey: string; proofFileId: string },
): JobReviewHighlight[] {
  const kept = (existing ?? []).filter(
    (entry) =>
      !(
        entry.deliverableKey === scope.deliverableKey &&
        entry.proofFileId === scope.proofFileId
      ),
  );
  return [...kept, ...nextForProof];
}
