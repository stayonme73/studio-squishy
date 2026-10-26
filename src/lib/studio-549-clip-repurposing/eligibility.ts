import { studio549ClipRepurposingIoFreezeV1 as freeze } from "@/config/studio-549-clip-repurposing-io-freeze-v1";

export type Clip549SourceFacts = {
  durationSeconds: number;
  format: "mp4" | "mov" | string;
  orientation: "native_vertical" | "landscape" | string;
  language: "en" | string;
  primaryOnCameraSpeakerCount: number;
  speechIntelligible: boolean;
  rightsCleared: boolean;
  likenessCleared: boolean;
  ctaText: string;
  customerIdentifiedMoments?: boolean;
};

export type Clip549Eligibility =
  | { ok: true }
  | {
      ok: false;
      code:
        | "SOURCE_UNDER_TWO_MINUTES"
        | "SOURCE_OVER_SIXTY_MINUTES"
        | "FORMAT_NOT_ALLOWED"
        | "NOT_NATIVE_VERTICAL"
        | "NOT_ENGLISH"
        | "NOT_ONE_PRIMARY_SPEAKER"
        | "SPEECH_NOT_INTELLIGIBLE"
        | "RIGHTS_NOT_CLEARED"
        | "LIKENESS_NOT_CLEARED";
      routeTo349Automatically: false;
      message: string;
    };

const MIN = freeze.sourceEligibility.minSourceMinutes * 60;
const MAX = freeze.sourceEligibility.maxSourceMinutes * 60;

export function evaluateClip549SourceEligibility(
  facts: Clip549SourceFacts,
): Clip549Eligibility {
  if (facts.durationSeconds < MIN) {
    return {
      ok: false,
      code: "SOURCE_UNDER_TWO_MINUTES",
      routeTo349Automatically: false,
      message: facts.customerIdentifiedMoments
        ? "This recording is under 2 minutes. Clip Repurposing will not search it. The $349 pack is only available when the customer identifies the moments."
        : freeze.sourceEligibility.belowMinimumUnmarked,
    };
  }
  if (facts.durationSeconds > MAX) {
    return {
      ok: false,
      code: "SOURCE_OVER_SIXTY_MINUTES",
      routeTo349Automatically: false,
      message: "Clip Repurposing accepts one eligible source of 2 to 60 minutes.",
    };
  }
  if (!freeze.sourceEligibility.formats.includes(facts.format as "mp4" | "mov")) {
    return {
      ok: false,
      code: "FORMAT_NOT_ALLOWED",
      routeTo349Automatically: false,
      message: "Clip Repurposing accepts MP4 or MOV.",
    };
  }
  if (facts.orientation !== freeze.sourceEligibility.orientation) {
    return {
      ok: false,
      code: "NOT_NATIVE_VERTICAL",
      routeTo349Automatically: false,
      message: "The source must already be native vertical.",
    };
  }
  if (facts.language !== freeze.sourceEligibility.language) {
    return {
      ok: false,
      code: "NOT_ENGLISH",
      routeTo349Automatically: false,
      message: "Clip Repurposing edits English speech only.",
    };
  }
  if (facts.primaryOnCameraSpeakerCount !== 1) {
    return {
      ok: false,
      code: "NOT_ONE_PRIMARY_SPEAKER",
      routeTo349Automatically: false,
      message: "One primary on-camera speaker is required.",
    };
  }
  if (!facts.speechIntelligible) {
    return {
      ok: false,
      code: "SPEECH_NOT_INTELLIGIBLE",
      routeTo349Automatically: false,
      message: "Speech must be intelligible enough to follow.",
    };
  }
  if (!facts.rightsCleared) {
    return {
      ok: false,
      code: "RIGHTS_NOT_CLEARED",
      routeTo349Automatically: false,
      message: "Rights clearance is required.",
    };
  }
  if (!facts.likenessCleared) {
    return {
      ok: false,
      code: "LIKENESS_NOT_CLEARED",
      routeTo349Automatically: false,
      message: "Likeness clearance is required.",
    };
  }
  return { ok: true };
}
