import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";

export type ContentPackSupportedFact = {
  key: string;
  value: string;
  source: "customer_provided" | "spoken_on_identified_clip";
};

export type ContentPackIdentifiedClip = {
  id: string;
  label: string;
  sourceRelativePath: string;
  /** Inclusive start on the source file. Required when the source is not already a short clip. */
  startSeconds?: number;
  endSeconds?: number;
  rightsCleared: boolean;
};

export type ContentPackIntake = {
  skuId: "v2-rtu-short-form-video-edit";
  ctaText: string;
  language: "en";
  rightsCleared: boolean;
  brandAssets?: readonly string[];
  supportedFacts: readonly ContentPackSupportedFact[];
  clips: readonly ContentPackIdentifiedClip[];
  customerAsksStudioToFindBestMoments?: boolean;
};

export type ContentPackIntakeFailure = {
  ok: false;
  code:
    | "TOO_MANY_CLIPS"
    | "NO_CLIPS"
    | "MISSING_CTA"
    | "RIGHTS_NOT_CLEARED"
    | "CLIP_NOT_IDENTIFIED"
    | "SEGMENT_TOO_LONG"
    | "SEGMENT_TOO_SHORT"
    | "LONG_RECORDING_SEARCH"
    | "CLIP_SKU_BOUNDARY";
  message: string;
};

export function evaluateContentPackIntake(
  intake: ContentPackIntake,
): ContentPackIntakeFailure | null {
  if (intake.skuId !== pack.skuId) {
    return {
      ok: false,
      code: "CLIP_SKU_BOUNDARY",
      message: "This factory only fulfills the $349 Short-Form Content Pack.",
    };
  }
  if (intake.customerAsksStudioToFindBestMoments) {
    return {
      ok: false,
      code: "LONG_RECORDING_SEARCH",
      message:
        "The Studio does not search a long recording to find the best moments under this SKU. That is Clip Repurposing.",
    };
  }
  if (!intake.rightsCleared || intake.clips.some((clip) => !clip.rightsCleared)) {
    return {
      ok: false,
      code: "RIGHTS_NOT_CLEARED",
      message: "Footage is not rights-cleared. Wait. Do not produce.",
    };
  }
  if (!intake.clips.length) {
    return { ok: false, code: "NO_CLIPS", message: "The customer must identify at least one clip." };
  }
  if (intake.clips.length > pack.maxClips) {
    return {
      ok: false,
      code: "TOO_MANY_CLIPS",
      message: `This pack accepts up to ${pack.maxClips} identified clips.`,
    };
  }
  for (const clip of intake.clips) {
    const identified =
      Number.isFinite(clip.startSeconds) && Number.isFinite(clip.endSeconds);
    if (!identified && !clip.sourceRelativePath.trim()) {
      return {
        ok: false,
        code: "CLIP_NOT_IDENTIFIED",
        message: `Clip ${clip.id} is not identified. The customer must mark the short clip or segment.`,
      };
    }
    if (identified) {
      const duration = Number(clip.endSeconds) - Number(clip.startSeconds);
      if (duration < 8) {
        return {
          ok: false,
          code: "SEGMENT_TOO_SHORT",
          message: `Clip ${clip.label} is too short to finish as a 15–30 second video.`,
        };
      }
      if (duration > pack.identifiedSegmentMaxSeconds) {
        return {
          ok: false,
          code: "SEGMENT_TOO_LONG",
          message:
            `Clip ${clip.label} is longer than a short identified segment. Identify a shorter window, or that search belongs to Clip Repurposing.`,
        };
      }
    }
  }
  return null;
}

export function supportedFactValue(
  facts: readonly ContentPackSupportedFact[],
  key: string,
): string | null {
  return facts.find((fact) => fact.key === key)?.value.trim() || null;
}
