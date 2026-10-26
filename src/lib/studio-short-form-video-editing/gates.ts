import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import type { EditDecisionFailure, FootageIntake, FootageProbe } from "./types";

const OFFER = studioShortFormVideoEditingBuildV1.offer;

export function evaluateFootageIntake(
  intake: FootageIntake,
): EditDecisionFailure | null {
  if (intake.skuId !== "v2-rtu-short-form-video-edit") {
    return {
      ok: false,
      code: "SHOTSTACK_PROMPT_FORBIDDEN",
      message: "Footage lane only accepts the new Short-Form Video Editing SKU.",
    };
  }
  if (!intake.rightsCleared) {
    return {
      ok: false,
      code: "RIGHTS_NOT_CLEARED",
      message: "Footage is not rights-cleared. Wait. Do not produce.",
    };
  }
  if (!intake.ctaText.trim() && intake.ctaTreatment !== "none") {
    return {
      ok: false,
      code: "MISSING_CTA",
      message: "Customer CTA words are required. Do not invent a CTA.",
    };
  }
  return null;
}

export function evaluateFootageProbe(
  probe: FootageProbe,
): EditDecisionFailure | null {
  if (!probe.hasAudio) {
    return {
      ok: false,
      code: "NO_AUDIO",
      message: "Source has no audio track. Wait or refund.",
    };
  }
  if (probe.durationSeconds > OFFER.maxSourceSeconds) {
    return {
      ok: false,
      code: "SOURCE_TOO_LONG",
      message: `Source exceeds ${OFFER.maxSourceSeconds} seconds.`,
    };
  }
  if (probe.durationSeconds < 8) {
    return {
      ok: false,
      code: "SOURCE_TOO_SHORT",
      message: "Source is too short to edit into a 15–30 second film.",
    };
  }
  if (probe.width > probe.height) {
    return {
      ok: false,
      code: "LANDSCAPE_NOT_FIRST_CERT",
      message: "First cert is vertical only. Landscape waits.",
    };
  }
  if (
    typeof probe.meanVolumeDb === "number" &&
    probe.meanVolumeDb < -45
  ) {
    return {
      ok: false,
      code: "UNUSABLE_AUDIO",
      message: "Source audio is too quiet to sell clean handling.",
    };
  }
  if (typeof probe.maxVolumeDb === "number" && probe.maxVolumeDb >= 0) {
    return {
      ok: false,
      code: "UNUSABLE_AUDIO",
      message: "Source audio is hard-clipped. Do not rescue it.",
    };
  }
  return null;
}
