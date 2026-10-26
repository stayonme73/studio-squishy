import { studioShortFormContentPackFactoryReviewLoopV1 as loop } from "@/config/studio-short-form-content-pack-factory-review-loop-v1";

import type { FlagshipBrollTreatment } from "@/lib/studio-flagship-short-form-edit/broll";

import type { QualityFindingCode, QualityReview } from "./quality-review";

export type PackCorrectionKind =
  | "snap_complete_thoughts"
  | "retime_broll_to_thought"
  | "omit_broll"
  | "switch_broll_treatment"
  | "remix_music"
  | "omit_music"
  | "finish_ending";

export type PackCorrectionInstruction = {
  actor: "video_production";
  kinds: PackCorrectionKind[];
  omitBroll: boolean;
  omitMusic: boolean;
  brollTreatment: FlagshipBrollTreatment | "none" | null;
  note: string;
};

export type PackMachineDecision =
  | {
      route: "production";
      instruction: PackCorrectionInstruction;
      owner: false;
      scout: false;
    }
  | {
      route: "escalate_owner";
      reason: (typeof loop.escalateToOwnerOnlyFor)[number];
      owner: true;
      scout: false;
      detail: string;
    }
  | {
      route: "escalate_scout";
      reason: (typeof loop.scoutIntervenesOnlyWhen)[number];
      owner: false;
      scout: true;
      detail: string;
    }
  | { route: "pass"; owner: false; scout: false };

const ORDINARY: QualityFindingCode[] = [
  "begin_not_clean_thought",
  "end_not_complete_thought",
  "trailing_fragment",
  "broll_keyword_only",
  "broll_left_before_thought_finished",
  "broll_into_next_thought",
  "broll_not_aligned_to_thought",
  "broll_does_not_improve",
  "broll_unstable_size",
  "broll_obstructs_speaker",
  "broll_caption_competition",
  "broll_visually_heavy",
  "broll_abrupt",
  "broll_visual_mismatch",
  "broll_weak_generic",
  "broll_bouncing",
  "broll_placement_inconsistent",
  "music_inaudible",
  "music_over_speech",
  "music_wrong_tone",
  "ending_missing_cta",
  "ending_music_not_faded",
  "captions_not_readable",
  "captions_not_synced",
];

export function machineDecideCorrection(input: {
  review: QualityReview;
  loopIndex: number;
  previousKinds: readonly PackCorrectionKind[];
}): PackMachineDecision {
  if (input.review.pass) return { route: "pass", owner: false, scout: false };
  if (input.loopIndex >= loop.maxInternalCorrectionLoops) {
    return {
      route: "escalate_owner",
      reason: "factory_cannot_resolve_after_allowed_loop",
      owner: true,
      scout: false,
      detail: input.review.findings.map((finding) => finding.code).join(", "),
    };
  }
  const codes = new Set(input.review.findings.map((finding) => finding.code));
  if (codes.has("inspect_not_rendered_mp4")) {
    return {
      route: "escalate_scout",
      reason: "quality_cannot_detect_defect_class",
      owner: false,
      scout: true,
      detail: "Quality was not given a rendered MP4.",
    };
  }
  const unknown = input.review.findings.filter((finding) => !ORDINARY.includes(finding.code));
  if (unknown.length) {
    return {
      route: "escalate_scout",
      reason: "machine_cannot_express_correction",
      owner: false,
      scout: true,
      detail: unknown.map((finding) => finding.code).join(", "),
    };
  }

  const kinds: PackCorrectionKind[] = [];
  if (
    codes.has("begin_not_clean_thought") ||
    codes.has("end_not_complete_thought") ||
    codes.has("trailing_fragment")
  ) {
    kinds.push("snap_complete_thoughts");
  }
  const visualFail =
    codes.has("broll_visual_mismatch") || codes.has("broll_weak_generic");
  const presentationFail =
    codes.has("broll_obstructs_speaker") ||
    codes.has("broll_visually_heavy") ||
    codes.has("broll_unstable_size") ||
    codes.has("broll_caption_competition") ||
    codes.has("broll_bouncing") ||
    codes.has("broll_placement_inconsistent");
  const alignmentFail =
    codes.has("broll_keyword_only") ||
    codes.has("broll_left_before_thought_finished") ||
    codes.has("broll_into_next_thought") ||
    codes.has("broll_not_aligned_to_thought") ||
    codes.has("broll_abrupt");
  if (visualFail) {
    kinds.push("omit_broll");
  } else if (presentationFail && input.previousKinds.includes("switch_broll_treatment")) {
    kinds.push("omit_broll");
  } else if (presentationFail) {
    kinds.push(input.loopIndex === 0 ? "switch_broll_treatment" : "omit_broll");
  } else if (alignmentFail && input.previousKinds.includes("retime_broll_to_thought")) {
    kinds.push("omit_broll");
  } else if (alignmentFail) {
    kinds.push("retime_broll_to_thought");
    kinds.push("snap_complete_thoughts");
  } else if (codes.has("broll_does_not_improve")) {
    kinds.push("omit_broll");
  }
  if (codes.has("music_wrong_tone")) {
    kinds.push("omit_music");
  } else if (codes.has("music_inaudible") || codes.has("music_over_speech")) {
    kinds.push(input.previousKinds.includes("remix_music") ? "omit_music" : "remix_music");
  }
  if (codes.has("ending_missing_cta") || codes.has("ending_music_not_faded")) {
    kinds.push("finish_ending");
  }
  if (codes.has("captions_not_readable") || codes.has("captions_not_synced")) {
    kinds.push("snap_complete_thoughts");
  }

  const unique = [...new Set(kinds)];
  if (!unique.length) {
    return {
      route: "escalate_scout",
      reason: "machine_cannot_express_correction",
      owner: false,
      scout: true,
      detail: [...codes].join(", "),
    };
  }
  return {
    route: "production",
    owner: false,
    scout: false,
    instruction: {
      actor: "video_production",
      kinds: unique,
      omitBroll: unique.includes("omit_broll"),
      omitMusic: unique.includes("omit_music"),
      brollTreatment: unique.includes("switch_broll_treatment")
        ? "short_fullframe"
        : unique.includes("omit_broll")
          ? "none"
          : null,
      note: `Quality found ${[...codes].join(", ")}. Production applies ${unique.join(", ")}.`,
    },
  };
}

export function isOwnerEscalationReason(reason: string): boolean {
  return (loop.escalateToOwnerOnlyFor as readonly string[]).includes(reason);
}
