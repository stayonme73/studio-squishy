import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { assembleBurnedShort, exactWords } from "./caption-burn";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

const REPO = path.resolve(__dirname, "../../..");
const SOURCE = path.join(
  REPO,
  "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/source-audio-finished.mp4",
);
const FROZEN = studioShortFormVideoEditingBuildV1.frozenCherriesEditorial;
const HOLD = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;

describe.skipIf(!existsSync(SOURCE))("Local cherries text burn", () => {
  it("burns exact word sprites onto the frozen cut", async () => {
    const clipText =
      "My favorite word in English is cherries, which means a small fruit that is delicious.";
    const sourceLength = FROZEN.holdExitSourceSeconds - FROZEN.openingSourceSeconds;
    const result = await assembleBurnedShort({
      sourceAbsolutePath: SOURCE,
      workDirectory: path.join(
        REPO,
        "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/burn-work",
      ),
      outputAbsolutePath: path.join(
        REPO,
        "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/local-text-proof.mp4",
      ),
      approvedCta: "Read the project notes",
      transcriptWordsInRange: exactWords(clipText),
      edl: {
        ok: true,
        sourceDurationSeconds: 156,
        outputDurationSeconds: sourceLength + HOLD,
        droppedFalseStarts: 0,
        droppedDeadSpaceSeconds: 0,
        selection: "performance_watch",
        clips: [
          {
            role: "hook",
            sourceTrim: FROZEN.openingSourceSeconds,
            sourceLength,
            timelineStart: 0,
            timelineLength: sourceLength,
            text: clipText,
          },
        ],
        captions: [
          {
            start: 0,
            end: 4.96,
            text: "My favorite word in English is",
            role: "hook",
          },
          {
            start: 5.53,
            end: 13.85,
            text: "cherries, which means a small fruit",
            role: "speech",
          },
          {
            start: 14.68,
            end: 17.16,
            text: "that is delicious.",
            role: "speech",
          },
          {
            start: sourceLength,
            end: sourceLength + HOLD,
            text: "Read the project notes",
            role: "cta",
          },
        ],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
  }, 120_000);

  it("applies the customer end-card hold revision without rewriting words", async () => {
    const clipText =
      "My favorite word in English is cherries, which means a small fruit that is delicious.";
    const sourceLength = FROZEN.holdExitSourceSeconds - FROZEN.openingSourceSeconds;
    const result = await assembleBurnedShort({
      sourceAbsolutePath: SOURCE,
      workDirectory: path.join(
        REPO,
        "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/burn-work-revision",
      ),
      outputAbsolutePath: path.join(
        REPO,
        "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/revised-end-card-hold.mp4",
      ),
      approvedCta: "Read the project notes",
      transcriptWordsInRange: exactWords(clipText),
      ctaHoldSeconds: 4,
      edl: {
        ok: true,
        sourceDurationSeconds: 156,
        outputDurationSeconds: sourceLength + 4,
        droppedFalseStarts: 0,
        droppedDeadSpaceSeconds: 0,
        selection: "performance_watch",
        clips: [
          {
            role: "hook",
            sourceTrim: FROZEN.openingSourceSeconds,
            sourceLength,
            timelineStart: 0,
            timelineLength: sourceLength,
            text: clipText,
          },
        ],
        captions: [
          {
            start: 0,
            end: 4.96,
            text: "My favorite word in English is",
            role: "hook",
          },
          {
            start: 5.53,
            end: 13.85,
            text: "cherries, which means a small fruit",
            role: "speech",
          },
          {
            start: 14.68,
            end: 17.16,
            text: "that is delicious.",
            role: "speech",
          },
          {
            start: sourceLength,
            end: sourceLength + 4,
            text: "Read the project notes",
            role: "cta",
          },
        ],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
  }, 120_000);
});
