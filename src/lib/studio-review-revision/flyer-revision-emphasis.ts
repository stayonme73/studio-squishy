/**
 * Constrained revision mapping — existing customer facts only.
 * May reorder/emphasize recorded tokens. Must not invent offer, price, date, or scope.
 */

import type { CampaignRecord } from "@/config/studio-board";
import {
  studioReviewRevisionFullLoopV1,
  type MachineFlyerRevisionEmphasis,
} from "@/config/studio-review-revision-full-loop-v1";
import type { JobReviewFeedback } from "@/lib/job-control/review-feedback-types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

const EMPHASIS_RE =
  /\b(headline|more prominent|emphasiz|stand out|bigger|lead with)\b/i;

export function collectRevisionInstruction(feedback: JobReviewFeedback): string {
  const notes = [
    ...(feedback.stickyNotes ?? []).map((note) => note.text),
    ...(feedback.textComments ?? []).map((comment) => comment.text),
  ]
    .map((text) => text.trim())
    .filter(Boolean);
  return notes.join("\n").trim();
}

export function shouldEmphasizeExistingCtaAsHeadline(
  instruction: string,
  callToAction: string,
): boolean {
  const cta = callToAction.trim();
  if (!cta || !instruction.trim()) return false;
  const text = instruction.toLowerCase();
  const mentionsCta = text.includes(cta.toLowerCase());
  return mentionsCta || EMPHASIS_RE.test(instruction);
}

export function buildMachineFlyerRevisionEmphasis(input: {
  feedback: JobReviewFeedback;
  campaign: CampaignRecord;
  priorWorkVersionId?: string | null;
  recordedAt?: string;
}): MachineFlyerRevisionEmphasis | null {
  const instruction = collectRevisionInstruction(input.feedback);
  if (!instruction) return null;
  const callToAction = String(
    input.campaign.routeMapIntake?.answers?.callToAction ?? "",
  ).trim();
  return {
    packageId: studioReviewRevisionFullLoopV1.packageId,
    instruction,
    emphasizeExistingCtaAsHeadline: shouldEmphasizeExistingCtaAsHeadline(
      instruction,
      callToAction,
    ),
    sourceRevisionPackageId: input.feedback.packageId,
    priorWorkVersionId: input.priorWorkVersionId ?? null,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
}

export function currentFlyerWorkVersionId(
  job: PurchasedJobRecord | null | undefined,
): string | null {
  return (
    job?.internalQaReviewAuthorization?.workVersionId?.trim() ||
    job?.customerApprovedArtifactAuthorization?.workVersionId?.trim() ||
    null
  );
}

export function customerFacingVersionLabel(
  workVersionId: string | null | undefined,
): string | null {
  if (!workVersionId?.trim()) return null;
  const match = workVersionId.match(/v(?:ersion)?[\s-]*(\d+)/i) ?? workVersionId.match(/(\d+)\s*$/);
  if (match?.[1]) return `Version ${match[1]}`;
  return workVersionId.trim();
}

export function applyExistingCtaHeadlineEmphasis(input: {
  headline: string;
  callToAction: string;
  emphasis?: MachineFlyerRevisionEmphasis | null;
}): string {
  if (!input.emphasis?.emphasizeExistingCtaAsHeadline) return input.headline;
  const cta = input.callToAction.trim();
  if (!cta) return input.headline;
  return cta.slice(0, 90);
}
