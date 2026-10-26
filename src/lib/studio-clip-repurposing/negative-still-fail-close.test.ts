import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

import { discoverClipSet } from "./set-discovery";

describe("negative live fail-close stays frozen", () => {
  it("still refuses a fake third on the saved negative transcript", () => {
    const wordsPath = path.join(
      process.cwd(),
      "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/negative-transcript-words.json",
    );
    if (!existsSync(wordsPath)) return;
    const saved = JSON.parse(readFileSync(wordsPath, "utf8")) as {
      words: SpeechWord[];
      durationSeconds: number;
    };
    const result = discoverClipSet({
      sourceDurationSeconds: saved.durationSeconds,
      sentences: buildTranscriptSentences(saved.words),
    });
    expect(result.ok).toBe(false);
    expect(result.productionAllowed).toBe(false);
    expect(result.viableCount).toBeLessThan(3);
    expect(result.selected.length).toBeLessThan(3);
  });
});
