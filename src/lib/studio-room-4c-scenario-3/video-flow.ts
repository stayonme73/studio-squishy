/**
 * Scenario 3 video-flow — visual cuts follow completed narration timing.
 */

import { createHash } from "crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

import { SCENARIO_3_NARRATION_SENTENCES } from "./copy";
import { scenario3VideoPlateCopy } from "./video-plates";

export const SCENARIO_3_MIN_CTA_HOLD_SECONDS = 4;
export const SCENARIO_3_VIDEO_MIN_SECONDS = 20;
export const SCENARIO_3_VIDEO_MAX_SECONDS = 30;

export type CharacterAlignment = {
  characters: readonly string[];
  character_start_times_seconds: readonly number[];
  character_end_times_seconds: readonly number[];
};

export type NarrationSentenceTiming = {
  sentence: string;
  startSeconds: number;
  endSeconds: number;
  visualBeat: number;
};

export type SemanticTimingRow = {
  narrationSentence: string;
  spokenStartSeconds: number;
  spokenEndSeconds: number;
  visualBeat: number;
  onScreenText: string;
  transitionTimeSeconds: number;
};

export function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export function synthesizeAlignmentFromDuration(
  sentences: readonly string[],
  durationSeconds: number,
): CharacterAlignment {
  const spoken = sentences.join(" ");
  const characters = [...spoken];
  const unit = durationSeconds / Math.max(characters.length, 1);
  const starts: number[] = [];
  const ends: number[] = [];
  characters.forEach((_, index) => {
    starts.push(Number((index * unit).toFixed(4)));
    ends.push(Number(((index + 1) * unit).toFixed(4)));
  });
  return {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  };
}

export function mapSentencesToAlignment(
  sentences: readonly string[],
  alignment: CharacterAlignment,
): NarrationSentenceTiming[] {
  const spoken = alignment.characters.join("");
  let searchFrom = 0;
  return sentences.map((sentence, index) => {
    const idx = spoken.indexOf(sentence, searchFrom);
    if (idx < 0) {
      throw new Error(`NARRATION_ALIGNMENT_MISSING_SENTENCE:${index}`);
    }
    const endIdx = idx + sentence.length - 1;
    const start = alignment.character_start_times_seconds[idx];
    const end = alignment.character_end_times_seconds[endIdx];
    if (start == null || end == null || end <= start) {
      throw new Error(`NARRATION_ALIGNMENT_INVALID_TIMES:${index}`);
    }
    searchFrom = idx + sentence.length;
    // Five spoken sentences → four visual beats (sentences 4–5 share CTA beat).
    const visualBeat = index <= 2 ? index + 1 : 4;
    return {
      sentence,
      startSeconds: Number(start.toFixed(3)),
      endSeconds: Number(end.toFixed(3)),
      visualBeat,
    };
  });
}

/**
 * Four visual windows from five spoken sentences.
 * Cuts only at sentence boundaries. CTA plate holds through the end.
 */
export function buildSemanticBeatWindows(input: {
  timings: readonly NarrationSentenceTiming[];
  audioDurationSeconds: number;
}): { startSeconds: number; endSeconds: number }[] {
  if (input.timings.length !== 5) {
    throw new Error("SCENARIO_3_REQUIRES_FIVE_SPOKEN_SENTENCES");
  }
  const audio = input.audioDurationSeconds;
  const timeline = Number(
    Math.min(
      SCENARIO_3_VIDEO_MAX_SECONDS,
      Math.max(SCENARIO_3_VIDEO_MIN_SECONDS, audio + 0.4),
    ).toFixed(3),
  );
  const t = input.timings;
  const windows = [
    { startSeconds: 0, endSeconds: t[1]!.startSeconds },
    { startSeconds: t[1]!.startSeconds, endSeconds: t[2]!.startSeconds },
    { startSeconds: t[2]!.startSeconds, endSeconds: t[3]!.startSeconds },
    { startSeconds: t[3]!.startSeconds, endSeconds: timeline },
  ].map((w) => ({
    startSeconds: Number(w.startSeconds.toFixed(3)),
    endSeconds: Number(w.endSeconds.toFixed(3)),
  }));
  const ctaHold = windows[3]!.endSeconds - windows[3]!.startSeconds;
  if (ctaHold < SCENARIO_3_MIN_CTA_HOLD_SECONDS) {
    windows[3] = {
      startSeconds: windows[3]!.startSeconds,
      endSeconds: Number(
        Math.min(
          SCENARIO_3_VIDEO_MAX_SECONDS,
          Math.max(timeline, windows[3]!.startSeconds + SCENARIO_3_MIN_CTA_HOLD_SECONDS),
        ).toFixed(3),
      ),
    };
  }
  return windows;
}

export function buildSemanticTimingTable(input: {
  timings: readonly NarrationSentenceTiming[];
  windows: readonly { startSeconds: number; endSeconds: number }[];
}): SemanticTimingRow[] {
  const plates = scenario3VideoPlateCopy();
  return input.timings.map((timing) => {
    const plate = plates[timing.visualBeat - 1]!;
    const window = input.windows[timing.visualBeat - 1]!;
    return {
      narrationSentence: timing.sentence,
      spokenStartSeconds: timing.startSeconds,
      spokenEndSeconds: timing.endSeconds,
      visualBeat: timing.visualBeat,
      onScreenText: [plate.line1, plate.line2, plate.line3]
        .filter(Boolean)
        .join(" · "),
      transitionTimeSeconds: window.startSeconds,
    };
  });
}

export function evaluateSemanticVideoFlow(input: {
  timings: readonly NarrationSentenceTiming[];
  windows: readonly { startSeconds: number; endSeconds: number }[];
  audioDurationSeconds: number;
  videoDurationSeconds: number;
  maxVolumeDb?: number;
  scenario1HashesUnchanged: boolean;
  scenario2HashesUnchanged: boolean;
}): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  if (input.timings.length !== 5 || input.windows.length !== 4) {
    findings.push("expected_five_sentences_four_beats");
  }
  const subjects = [
    /Moss & Thread Studio|November seventh/,
    /Visit the studio|meet the maker|textile pieces/,
    /Saturday hours|Sunday hours/,
    /Admission is free/,
    /Visit the open studio/,
  ];
  input.timings.forEach((timing, index) => {
    if (!subjects[index]!.test(timing.sentence)) {
      findings.push(`spoken_subject_mismatch_sentence_${index + 1}`);
    }
    if (index > 0 && timing.startSeconds < input.timings[index - 1]!.endSeconds - 0.05) {
      findings.push(`sentence_overlap_${index + 1}`);
    }
  });
  const cta = input.windows[3];
  if (cta && cta.endSeconds - cta.startSeconds < SCENARIO_3_MIN_CTA_HOLD_SECONDS) {
    findings.push("cta_hold_too_short");
  }
  if (
    input.videoDurationSeconds < SCENARIO_3_VIDEO_MIN_SECONDS ||
    input.videoDurationSeconds > SCENARIO_3_VIDEO_MAX_SECONDS
  ) {
    findings.push("video_duration_out_of_band");
  }
  if (input.audioDurationSeconds > input.videoDurationSeconds + 0.05) {
    findings.push("audio_clipped_by_video");
  }
  if (input.maxVolumeDb != null && input.maxVolumeDb >= 0) {
    findings.push("audio_peak_clipped");
  }
  if (
    input.timings.map((timing) => timing.sentence).join(" ") !==
    SCENARIO_3_NARRATION_SENTENCES.join(" ")
  ) {
    findings.push("narration_not_continuous");
  }
  if (!input.scenario1HashesUnchanged) findings.push("scenario_1_hash_changed");
  if (!input.scenario2HashesUnchanged) findings.push("scenario_2_hash_changed");
  return { ok: findings.length === 0, findings };
}

export function scenario1DeliverableRoot(repoRoot: string): string {
  return path.join(
    repoRoot,
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-1-cedar-lane/deliverables",
  );
}

export function scenario2DeliverableRoot(repoRoot: string): string {
  return path.join(
    repoRoot,
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-2-harbor-roast/deliverables",
  );
}

export function hashScenarioDeliverables(
  repoRoot: string,
  which: 1 | 2,
): Record<string, string> {
  const root =
    which === 1 ? scenario1DeliverableRoot(repoRoot) : scenario2DeliverableRoot(repoRoot);
  const hashes: Record<string, string> = {};
  if (!existsSync(root)) return hashes;
  for (const name of readdirSync(root)) {
    const abs = path.join(root, name);
    if (!statSync(abs).isFile()) continue;
    hashes[name] = sha256File(abs);
  }
  return hashes;
}
