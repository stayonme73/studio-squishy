import { studioShortFormContentPackFactoryReviewLoopV1 as loop } from "@/config/studio-short-form-content-pack-factory-review-loop-v1";
import {
  machineDecideCorrection,
  type PackCorrectionKind,
  type PackMachineDecision,
} from "@/lib/studio-short-form-content-pack/machine-corrections";
import {
  evaluateQualityFromEvidence,
  type QualityReview,
  type RenderedShortEvidence,
} from "@/lib/studio-short-form-content-pack/quality-review";

export const CLIP_549_MAX_QUALITY_LOOPS = loop.maxInternalCorrectionLoops;

export function reviewClip549RenderedMp4(
  evidence: RenderedShortEvidence,
): QualityReview {
  return evaluateQualityFromEvidence(evidence);
}

export function decideClip549QualityCorrection(input: {
  review: QualityReview;
  loopIndex: number;
  previousKinds: readonly PackCorrectionKind[];
}): PackMachineDecision {
  return machineDecideCorrection(input);
}

export function clip549QualityLoopExhausted(loopIndex: number): boolean {
  return loopIndex >= CLIP_549_MAX_QUALITY_LOOPS;
}
