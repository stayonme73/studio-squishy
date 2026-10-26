import type { CampaignStudioExtras } from "./types";

/** Extras-only rounds against the package's shared revision allowance. */
export function studioExtrasRoundUsage(truth: CampaignStudioExtras | null | undefined): {
  consumed: number;
  pending: number;
} {
  const rounds = truth?.revisionRounds ?? [];
  return {
    consumed: rounds.filter((r) => r.reachedReviewAt).length,
    pending: rounds.filter((r) => !r.reachedReviewAt && !r.voidedAt).length,
  };
}
