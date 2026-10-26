import { describe, expect, it } from "vitest";

import {
  CHECKPOINT_8_CHERRIES_PLAN,
  parsePerformanceWatchPlan,
} from "./performance-watch";

describe("Performance-aware editorial brain", () => {
  it("rejects a Checkpoint 8 leftover-goodbye plan", () => {
    const frames = [82.2, 91.8, 100.6, 106.2];
    const leftover = parsePerformanceWatchPlan(
      JSON.stringify({
        centralIdea: "cherries",
        openingSourceSeconds: CHECKPOINT_8_CHERRIES_PLAN.openingSourceSeconds,
        exitSourceSeconds: CHECKPOINT_8_CHERRIES_PLAN.exitSourceSeconds,
        spokenBeats: [
          {
            start: 83.5,
            end: 100.7,
            text: "My favorite word in English is cherries",
            reason: "idea",
          },
          {
            start: 102.7,
            end: 109.8,
            text: "I hope you enjoyed hearing some words",
            reason: "next sentence",
          },
        ],
        dropSignOff: false,
        proposedDurationSeconds: 26.3,
        comparedToCheckpoint8: "same",
        materiallyBetterThanSentenceStop: false,
        performanceBeatsToLand: [{ at: 91.8, reason: "smile" }],
      }),
      frames,
    );
    expect(leftover).toBeNull();
  });

  it("accepts an ending on the idea that cites a watched frame", () => {
    const frames = [82.2, 91.8, 100.6, 106.2];
    const plan = parsePerformanceWatchPlan(
      JSON.stringify({
        centralIdea: "favorite English word is cherries",
        openingSourceSeconds: 83.5,
        exitSourceSeconds: 100.7,
        spokenBeats: [
          {
            start: 83.5,
            end: 100.7,
            text: "My favorite word in English is cherries, which means a small fruit that is delicious.",
            reason: "The thought lands on delicious at the 100.6s frame.",
          },
        ],
        pausesToKeep: [
          { start: 92.0, end: 92.6, reason: "Breath before the definition." },
        ],
        pausesToRemove: [],
        performanceBeatsToLand: [
          { at: 91.8, reason: "Eyes go up as he names cherries." },
        ],
        dropSignOff: true,
        proposedDurationSeconds: 17.2,
        comparedToCheckpoint8: "Ends on the word, not the leftover goodbye.",
        materiallyBetterThanSentenceStop: true,
      }),
      frames,
    );
    expect(plan?.ok).toBe(true);
    expect(plan?.dropSignOff).toBe(true);
    expect(plan?.exitSourceSeconds).toBeLessThan(107.8);
    expect(plan?.spokenBeats.some((beat) => /hope you enjoyed/i.test(beat.text))).toBe(
      false,
    );
  });
});

describe("factory lock", () => {
  it("does not reopen transcript-selector iteration", async () => {
    const { studioShortFormVideoEditingBuildV1 } = await import(
      "@/config/studio-short-form-video-editing-build-v1"
    );
    expect(studioShortFormVideoEditingBuildV1.factory.doNotIterateTranscriptSelector).toBe(
      true,
    );
  });
});
