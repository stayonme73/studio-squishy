/**
 * Constrained short-video revision mapping — timing on existing price/date scenes only.
 * Must not invent offer, price, date, or scope.
 */

import type { CampaignRecord } from "@/config/studio-board";
import {
  SHORT_VIDEO_TIMING_HOLD_EXTENSION_SECONDS,
  studioReviewRevisionFullLoopV1,
  type MachineShortVideoRevisionEmphasis,
} from "@/config/studio-review-revision-full-loop-v1";
import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { collectRevisionInstruction } from "./flyer-revision-emphasis";

const PRICE_DATE_TIMING_RE =
  /\b(too\s+fast|price|dates?|timing|slower|hold|around\s+price|around\s+dates)\b/i;

export function shouldLengthenPriceDateSceneHolds(instruction: string): boolean {
  if (!instruction.trim()) return false;
  const text = instruction.toLowerCase();
  const mentionsTooFast = /\btoo\s+fast\b/.test(text);
  const mentionsPriceOrDates = /\b(price|dates?)\b/.test(text);
  if (mentionsTooFast && mentionsPriceOrDates) return true;
  return PRICE_DATE_TIMING_RE.test(instruction) && mentionsPriceOrDates;
}

export function buildMachineShortVideoRevisionEmphasis(input: {
  feedback: JobReviewFeedback;
  campaign: CampaignRecord;
  priorWorkVersionId?: string | null;
  recordedAt?: string;
}): MachineShortVideoRevisionEmphasis | null {
  const instruction = collectRevisionInstruction(input.feedback);
  if (!instruction) return null;
  return {
    packageId: studioReviewRevisionFullLoopV1.packageId,
    instruction,
    lengthenPriceDateSceneHolds: shouldLengthenPriceDateSceneHolds(instruction),
    holdExtensionSeconds: SHORT_VIDEO_TIMING_HOLD_EXTENSION_SECONDS,
    sourceRevisionPackageId: input.feedback.packageId,
    priorWorkVersionId: input.priorWorkVersionId ?? null,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
}

export function currentShortVideoWorkVersionId(
  job: PurchasedJobRecord | null | undefined,
): string | null {
  return (
    job?.internalQaReviewAuthorization?.workVersionId?.trim() ||
    job?.customerApprovedArtifactAuthorization?.workVersionId?.trim() ||
    null
  );
}
