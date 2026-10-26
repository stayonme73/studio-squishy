/**
 * Frozen 0/1/2/3+ customer economics for the Clip journey.
 * Does not change discovery, ranking, or production internals.
 */

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import type { ClipRepurposingViableCount } from "./types";

export type ClipCustomerTreatment =
  | "cannot_complete_as_sold"
  | "convert_to_349_short_form_video_editing"
  | "two_clip_outcome_at_449"
  | "fulfill_clip_repurposing_at_549";

export type ClipCustomerOutcome = {
  viableCount: ClipRepurposingViableCount;
  treatment: ClipCustomerTreatment;
  settlementPriceCents: number;
  offerPriceCents: 54900;
  fileCount: 0 | 1 | 2 | 3;
  ownerRoutineIntervention: "NONE";
  customerExplanation: string;
};

const OFFER_CENTS = 54900 as const;

export function resolveClipRepurposingCustomerOutcome(
  viableCount: number,
): ClipCustomerOutcome {
  const prices = studioClipRepurposingBuildV1.failClose.customerRemedyPriceCents;
  if (viableCount <= 0) {
    return {
      viableCount: 0,
      treatment: "cannot_complete_as_sold",
      settlementPriceCents: 0,
      offerPriceCents: OFFER_CENTS,
      fileCount: 0,
      ownerRoutineIntervention: "NONE",
      customerExplanation:
        "This recording does not contain three distinct shorts we can publish. We cannot complete Clip Repurposing as sold, and we will not invent filler clips.",
    };
  }
  if (viableCount === 1) {
    return {
      viableCount: 1,
      treatment: "convert_to_349_short_form_video_editing",
      settlementPriceCents: prices[1],
      offerPriceCents: OFFER_CENTS,
      fileCount: 1,
      ownerRoutineIntervention: "NONE",
      customerExplanation:
        "This recording has one strong short. We will complete it as Short-Form Video Editing for $349 instead of the $549 three-clip package.",
    };
  }
  if (viableCount === 2) {
    return {
      viableCount: 2,
      treatment: "two_clip_outcome_at_449",
      settlementPriceCents: prices[2],
      offerPriceCents: OFFER_CENTS,
      fileCount: 2,
      ownerRoutineIntervention: "NONE",
      customerExplanation:
        "This recording has two distinct shorts. We will deliver a two-clip outcome for $449 instead of the $549 three-clip package.",
    };
  }
  return {
    viableCount: 3,
    treatment: "fulfill_clip_repurposing_at_549",
    settlementPriceCents: prices["3+"],
    offerPriceCents: OFFER_CENTS,
    fileCount: 3,
    ownerRoutineIntervention: "NONE",
    customerExplanation:
      "This recording has three distinct shorts. We will complete Clip Repurposing for $549.",
  };
}

export function clipSetWouldQuietlyUnderDeliver(input: {
  viableCount: number;
  producedFileCount: number;
  chargedCents: number;
}): boolean {
  const outcome = resolveClipRepurposingCustomerOutcome(input.viableCount);
  if (input.producedFileCount !== outcome.fileCount) return true;
  if (outcome.fileCount < 3 && input.chargedCents === OFFER_CENTS) return true;
  return false;
}
