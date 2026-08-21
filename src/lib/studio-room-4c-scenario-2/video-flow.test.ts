import { describe, expect, it } from "vitest";

import { SCENARIO_2_NARRATION_SENTENCES } from "./copy";
import {
  SCENARIO_2_APPROVED_STILL_HASHES,
  buildSemanticBeatWindows,
  buildSemanticTimingTable,
  evaluateSemanticVideoFlow,
  mapSentencesToAlignment,
  readApprovedStillHashes,
} from "./video-flow";

function alignmentFor(sentences: readonly string[]) {
  const characters: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let t = 0;
  const full = sentences.join(" ");
  for (const ch of full) {
    characters.push(ch);
    starts.push(t);
    t += ch === " " ? 0.04 : 0.07;
    ends.push(t);
  }
  return {
    characters,
    character_start_times_seconds: starts,
    character_end_times_seconds: ends,
  };
}

describe("Room 4C Scenario 2 — semantic video flow", () => {
  const timings = mapSentencesToAlignment(
    SCENARIO_2_NARRATION_SENTENCES,
    alignmentFor(SCENARIO_2_NARRATION_SENTENCES),
  );

  it("maps visual changes to the spoken subject and does not cut inside a sentence", () => {
    expect(timings).toHaveLength(4);
    expect(timings[0]?.sentence).toContain("Harbor Roast Coffee Co.");
    expect(timings[1]?.sentence).toContain(
      "three 8-ounce bags of whole-bean single-origin coffee",
    );
    expect(timings[2]?.sentence).toContain("forty-eight dollars");
    expect(timings[3]?.sentence).toBe("Shop the autumn box this October.");
    for (let i = 1; i < timings.length; i += 1) {
      expect(timings[i]!.startSeconds).toBeGreaterThanOrEqual(
        timings[i - 1]!.endSeconds - 0.02,
      );
    }
    const windows = buildSemanticBeatWindows({
      timings,
      audioDurationSeconds: timings[3]!.endSeconds + 0.3,
    });
    expect(windows[1]!.startSeconds).toBe(timings[1]!.startSeconds);
    expect(windows[2]!.startSeconds).toBe(timings[2]!.startSeconds);
    expect(windows[3]!.startSeconds).toBe(timings[3]!.startSeconds);
    expect(windows[3]!.endSeconds - windows[3]!.startSeconds).toBeGreaterThanOrEqual(
      4,
    );
    const table = buildSemanticTimingTable({ timings, windows });
    expect(table[3]?.onScreenText).toContain("Shop the autumn box");
  });

  it("proves duration band, unclipped audio, facts, still hashes, and Scenario 1 freeze", () => {
    const windows = buildSemanticBeatWindows({
      timings,
      audioDurationSeconds: 18.2,
    });
    const stillHashes = readApprovedStillHashes(process.cwd());
    const result = evaluateSemanticVideoFlow({
      timings,
      windows,
      audioDurationSeconds: 18.2,
      videoDurationSeconds: windows[3]!.endSeconds,
      maxVolumeDb: -1.4,
      stillHashes,
      scenario1HashesUnchanged: true,
    });
    expect(result).toEqual({ ok: true, findings: [] });
    expect(stillHashes).toEqual(SCENARIO_2_APPROVED_STILL_HASHES);
  });

  it("fails a one-bag visual or a mid-sentence cut", () => {
    const interrupted = buildSemanticBeatWindows({
      timings,
      audioDurationSeconds: 18.2,
    });
    interrupted[1] = {
      startSeconds: (timings[0]!.startSeconds + timings[0]!.endSeconds) / 2,
      endSeconds: interrupted[1]!.endSeconds,
    };
    const fail = evaluateSemanticVideoFlow({
      timings,
      windows: interrupted,
      audioDurationSeconds: 18.2,
      videoDurationSeconds: 20,
      maxVolumeDb: -1,
      stillHashes: SCENARIO_2_APPROVED_STILL_HASHES,
      scenario1HashesUnchanged: true,
    });
    expect(fail.ok).toBe(false);
    expect(fail.findings).toContain("transition_interrupts_sentence_beat_2");
  });
});
