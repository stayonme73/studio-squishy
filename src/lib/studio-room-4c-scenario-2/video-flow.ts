/**
 * Scenario 2 copy/video-flow correction.
 * Visual cuts follow completed narration timing. Approved still hashes stay frozen.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";

import { SCENARIO_2_NARRATION_SENTENCES } from "./copy";
import { scenario2VideoPlateCopy } from "./video-plates";

export const SCENARIO_2_APPROVED_STILL_HASHES = {
  "social-square.png":
    "72b12a28f4d0ae1af6fb42a9ed73532610e048e36411c4df028f663cdadf2109",
  "social-vertical.png":
    "1320c885cf91a0a97f69598ec9cb89b27ef9c91d724d909902e14741177eac20",
  "counter-card.png":
    "023f91a952e9acfcd572b8434647c063fa8ff92653f879bfeb84d42602cb0380",
  "counter-card.pdf":
    "ef3a94f41cb1e91900a4ab81eb5747a8ee6b642d9dd49a3049d44caf38d495b0",
} as const;

export const SCENARIO_2_MIN_CTA_HOLD_SECONDS = 4;
export const SCENARIO_2_VIDEO_MIN_SECONDS = 20;
export const SCENARIO_2_VIDEO_MAX_SECONDS = 30;

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
    return {
      sentence,
      startSeconds: Number(start.toFixed(3)),
      endSeconds: Number(end.toFixed(3)),
      visualBeat: index + 1,
    };
  });
}

/**
 * Cut when the next spoken subject begins. Do not interrupt a sentence.
 * Hold the CTA plate through the remaining timeline so it can be read.
 */
export function buildSemanticBeatWindows(input: {
  timings: readonly NarrationSentenceTiming[];
  audioDurationSeconds: number;
}): { startSeconds: number; endSeconds: number }[] {
  if (input.timings.length !== 4) {
    throw new Error("SCENARIO_2_REQUIRES_FOUR_SPOKEN_BEATS");
  }
  const audio = input.audioDurationSeconds;
  const timeline = Number(
    Math.min(
      SCENARIO_2_VIDEO_MAX_SECONDS,
      Math.max(SCENARIO_2_VIDEO_MIN_SECONDS, audio + 0.4),
    ).toFixed(3),
  );
  const ctaStart = input.timings[3]!.startSeconds;
  const windows = input.timings.map((timing, index) => {
    const start = index === 0 ? 0 : timing.startSeconds;
    const end =
      index === 3
        ? timeline
        : input.timings[index + 1]!.startSeconds;
    return {
      startSeconds: Number(start.toFixed(3)),
      endSeconds: Number(end.toFixed(3)),
    };
  });
  const ctaHold = windows[3]!.endSeconds - windows[3]!.startSeconds;
  if (ctaHold < SCENARIO_2_MIN_CTA_HOLD_SECONDS) {
    windows[3] = {
      startSeconds: windows[3]!.startSeconds,
      endSeconds: Number(
        Math.min(
          SCENARIO_2_VIDEO_MAX_SECONDS,
          Math.max(timeline, ctaStart + SCENARIO_2_MIN_CTA_HOLD_SECONDS),
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
  const plates = scenario2VideoPlateCopy();
  return input.timings.map((timing, index) => {
    const plate = plates[index]!;
    const window = input.windows[index]!;
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
  stillHashes: Record<string, string>;
  scenario1HashesUnchanged: boolean;
}): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  const plates = scenario2VideoPlateCopy();

  if (input.timings.length !== 4 || input.windows.length !== 4) {
    findings.push("expected_four_beats");
  }
  const subjects = [
    /Harbor Roast Coffee Co\.|Autumn Single-Origin Box/,
    /three 8-ounce bags of whole-bean single-origin coffee/,
    /forty-eight dollars|October first/,
    /Shop the autumn box/,
  ];
  input.timings.forEach((timing, index) => {
    if (!subjects[index]!.test(timing.sentence)) {
      findings.push(`spoken_subject_mismatch_beat_${index + 1}`);
    }
    if (index > 0 && timing.startSeconds < input.timings[index - 1]!.endSeconds - 0.05) {
      findings.push(`sentence_overlap_beat_${index + 1}`);
    }
    const window = input.windows[index];
    if (!window) return;
    if (index > 0 && Math.abs(window.startSeconds - timing.startSeconds) > 0.08) {
      findings.push(`transition_interrupts_sentence_beat_${index + 1}`);
    }
    if (window.endSeconds <= window.startSeconds) {
      findings.push(`invalid_window_beat_${index + 1}`);
    }
  });

  const cta = input.windows[3];
  if (cta && cta.endSeconds - cta.startSeconds < SCENARIO_2_MIN_CTA_HOLD_SECONDS) {
    findings.push("cta_hold_too_short");
  }
  if (
    input.videoDurationSeconds < SCENARIO_2_VIDEO_MIN_SECONDS ||
    input.videoDurationSeconds > SCENARIO_2_VIDEO_MAX_SECONDS
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
    SCENARIO_2_NARRATION_SENTENCES.join(" ")
  ) {
    findings.push("narration_not_continuous");
  }
  if (!plates[1]?.line2?.includes("three 8-ounce bags")) {
    findings.push("three_bag_identity_missing_from_video_plate");
  }

  for (const [file, expected] of Object.entries(SCENARIO_2_APPROVED_STILL_HASHES)) {
    if (input.stillHashes[file] !== expected) {
      findings.push(`still_hash_changed:${file}`);
    }
  }
  if (!input.scenario1HashesUnchanged) {
    findings.push("scenario_1_hash_changed");
  }

  return { ok: findings.length === 0, findings };
}

export function approvedStillDeliverableRoot(repoRoot: string): string {
  return path.join(
    repoRoot,
    "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-2-harbor-roast/deliverables",
  );
}

export function readApprovedStillHashes(repoRoot: string): Record<string, string> {
  const root = approvedStillDeliverableRoot(repoRoot);
  const hashes: Record<string, string> = {};
  for (const file of Object.keys(SCENARIO_2_APPROVED_STILL_HASHES)) {
    hashes[file] = sha256File(path.join(root, file));
  }
  return hashes;
}

export function assertApprovedStillHashesUnchanged(repoRoot: string): void {
  const actual = readApprovedStillHashes(repoRoot);
  for (const [file, expected] of Object.entries(SCENARIO_2_APPROVED_STILL_HASHES)) {
    if (actual[file] !== expected) {
      throw new Error(`APPROVED_STILL_HASH_CHANGED:${file}`);
    }
  }
}
