/**
 * Quality creative eyes: visual meaning of B-roll, whether it helps,
 * and obvious music-tone mismatch. Does not claim human taste.
 */

export type BrollVisualKind =
  | "fruit_or_produce"
  | "paper_or_print"
  | "talking_head"
  | "unknown";

export type SpokenVisualNeed = "specific_object" | "language_print" | "none";

export type BrollHelpDecision = "keep" | "omit" | "switch_treatment" | "insufficient";

export type HeardMusicKind =
  | "quiet_or_none"
  | "warm_or_conversational"
  | "somber_or_memorial"
  | "playful_or_childish"
  | "dramatic_or_trailer"
  | "unknown";

export type MusicFitDecision = "ok" | "mismatch" | "insufficient";

export type OverlayPixelStats = {
  brightRatio: number;
  colorfulRatio: number;
  fruitRatio: number;
  plate: boolean;
  skinRatio?: number;
  std?: number;
};

export type HeardMusicFeatures = {
  meanDb: number | null;
  darkBandDb: number | null;
  brightBandDb: number | null;
  voiceBandDb?: number | null;
  peakMinusMeanDb: number | null;
};

export function spokenVisualNeed(spokenText: string): SpokenVisualNeed {
  const text = spokenText.toLowerCase();
  if (/\b(cherr(?:y|ies)|fruit)\b/.test(text)) return "specific_object";
  if (/\b(english|language|dictionary|speaking)\b/.test(text)) return "language_print";
  return "none";
}

export function classifyBrollVisualFromPixels(stats: OverlayPixelStats): BrollVisualKind {
  const skin = stats.skinRatio ?? 0;
  const printContrast = stats.std == null || stats.std > 28;
  if (stats.fruitRatio >= 0.045 && (stats.plate || stats.fruitRatio >= 0.08)) {
    return "fruit_or_produce";
  }
  if (skin >= 0.28 && stats.fruitRatio < 0.04) return "talking_head";
  if (stats.brightRatio >= 0.45 && stats.fruitRatio < 0.08 && printContrast) {
    return "paper_or_print";
  }
  if (!stats.plate && stats.fruitRatio < 0.045 && stats.brightRatio < 0.45) {
    return "talking_head";
  }
  if (stats.plate) return "unknown";
  return "talking_head";
}

export function visualMatchDecision(input: {
  spokenText: string;
  visualKind: BrollVisualKind;
}): "match" | "mismatch" | "no_broll" | "omit_weak" {
  const need = spokenVisualNeed(input.spokenText);
  if (input.visualKind === "talking_head") return "no_broll";
  if (need === "specific_object" && input.visualKind === "fruit_or_produce") return "match";
  if (need === "language_print" && input.visualKind === "paper_or_print") return "match";
  if (need === "specific_object" && input.visualKind === "paper_or_print") return "mismatch";
  if (need === "language_print" && input.visualKind === "fruit_or_produce") return "mismatch";
  return "omit_weak";
}

export function decideBrollHelpfulness(input: {
  visualDecision: ReturnType<typeof visualMatchDecision>;
  presentationDefects: readonly string[];
  timingDefects: readonly string[];
}): BrollHelpDecision {
  if (input.visualDecision === "no_broll") return "keep";
  if (input.visualDecision === "mismatch" || input.visualDecision === "omit_weak") {
    return "omit";
  }
  if (input.timingDefects.length) return "omit";
  const treatmentOnly = input.presentationDefects.every((code) =>
    /unstable|bounc|heavy|obstruct|caption_competition|placement/.test(code),
  );
  if (input.presentationDefects.length && treatmentOnly) return "switch_treatment";
  if (input.presentationDefects.length) return "omit";
  if (input.visualDecision === "match") return "keep";
  return "insufficient";
}

export function classifyHeardMusic(features: HeardMusicFeatures): HeardMusicKind {
  if (features.meanDb != null && features.meanDb < -36) return "quiet_or_none";
  const dark = features.darkBandDb;
  const bright = features.brightBandDb;
  const voice = features.voiceBandDb;
  const punch = features.peakMinusMeanDb;
  if (
    punch != null &&
    punch > 18 &&
    bright != null &&
    dark != null &&
    bright - dark > 4
  ) {
    return "dramatic_or_trailer";
  }
  if (dark != null && voice != null && dark - voice > 6) {
    return "somber_or_memorial";
  }
  if (bright != null && dark != null && bright - dark > 10) return "playful_or_childish";
  if (features.meanDb != null && features.meanDb > -32) return "warm_or_conversational";
  return "unknown";
}

export function decideMusicFit(input: {
  spokenTone: "upbeat_conversational" | "warm_instructional" | "quiet_no_music";
  heard: HeardMusicKind;
}): MusicFitDecision {
  if (input.heard === "unknown") return "insufficient";
  if (input.spokenTone === "quiet_no_music" && input.heard !== "quiet_or_none") {
    return "mismatch";
  }
  if (
    (input.spokenTone === "upbeat_conversational" ||
      input.spokenTone === "warm_instructional") &&
    (input.heard === "somber_or_memorial" ||
      input.heard === "dramatic_or_trailer" ||
      input.heard === "playful_or_childish")
  ) {
    return "mismatch";
  }
  return "ok";
}
