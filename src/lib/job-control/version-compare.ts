import type { ClientReviewDeliverable } from "@/lib/job-control/review-feedback-types";

/** Proof record as already projected for client Review — no new version store. */
export type VersionCompareProof = ClientReviewDeliverable["proofFiles"][number];

export type VersionComparePair = {
  current: VersionCompareProof;
  prior: VersionCompareProof;
};

export type VersionCompareSelection =
  | { status: "unavailable"; reason: "insufficient_proofs" }
  | {
      status: "ready";
      current: VersionCompareProof;
      prior: VersionCompareProof;
      options: readonly VersionCompareProof[];
    };

/** Comparison requires at least two recorded proofs for one deliverable. */
export function canCompareProofVersions(proofs: readonly VersionCompareProof[]): boolean {
  return proofs.length >= 2;
}

/** Newest first by `addedAt`; stable `id` tie-break. Does not invent labels or lineage. */
export function sortProofsByAddedAtDesc(
  proofs: readonly VersionCompareProof[],
): VersionCompareProof[] {
  return [...proofs].sort((a, b) => {
    const byTime = b.addedAt.localeCompare(a.addedAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Default pair: most recent recorded proof as current, next as prior.
 * Returns null when fewer than two proofs exist.
 */
export function defaultComparePair(
  proofs: readonly VersionCompareProof[],
): VersionComparePair | null {
  if (!canCompareProofVersions(proofs)) return null;
  const sorted = sortProofsByAddedAtDesc(proofs);
  return { current: sorted[0]!, prior: sorted[1]! };
}

/**
 * Resolve a customer selection against recorded proofs only.
 * Invalid or identical ids fall back to the default pair — never invent a proof.
 */
export function resolveVersionCompareSelection(
  proofs: readonly VersionCompareProof[],
  selectedCurrentId?: string | null,
  selectedPriorId?: string | null,
): VersionCompareSelection {
  if (!canCompareProofVersions(proofs)) {
    return { status: "unavailable", reason: "insufficient_proofs" };
  }

  const options = sortProofsByAddedAtDesc(proofs);
  const defaults = defaultComparePair(proofs)!;
  const byId = new Map(proofs.map((proof) => [proof.id, proof]));

  const current =
    (selectedCurrentId ? byId.get(selectedCurrentId) : undefined) ?? defaults.current;
  let prior =
    (selectedPriorId ? byId.get(selectedPriorId) : undefined) ?? defaults.prior;

  if (prior.id === current.id) {
    prior =
      options.find((proof) => proof.id !== current.id) ?? defaults.prior;
  }

  if (prior.id === current.id) {
    return { status: "unavailable", reason: "insufficient_proofs" };
  }

  return { status: "ready", current, prior, options };
}
