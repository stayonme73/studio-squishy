import { existsSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { fixtureRepetitiveSource, fixtureWeakSource } from "./fixtures";
import { discoverClipSet } from "./set-discovery";
import { rerankSavedPositiveTranscript } from "./semantic-rerank";

describe("Clip Repurposing semantic re-rank", () => {
  it("keeps negative-style fail-close on weak and repetitive fixtures", () => {
    const weak = discoverClipSet(fixtureWeakSource());
    const repetitive = discoverClipSet(fixtureRepetitiveSource());
    expect(weak.ok).toBe(false);
    expect(weak.productionAllowed).toBe(false);
    expect(repetitive.ok).toBe(false);
    expect(repetitive.productionAllowed).toBe(false);
    expect(repetitive.viableCount).toBeLessThan(3);
  });

  it("re-ranks the saved positive live transcript without Deepgram or Shotstack", () => {
    const wordsPath = path.join(
      process.cwd(),
      "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/positive-transcript-words.json",
    );
    if (!existsSync(wordsPath)) {
      throw new Error("Saved positive transcript missing");
    }
    const report = rerankSavedPositiveTranscript(process.cwd());
    expect(report.paidProduction).toBe(false);
    expect(report.transcriptUnchanged).toBe(true);
    expect(report.sourceSeconds).toBeGreaterThan(800);
    expect(report.ok).toBe(true);
    expect(report.selected).toHaveLength(3);
    expect(report.selectedWithoutHookWords).toBe(3);
    expect(report.selected.every((row) => row.shortFormScore < 5)).toBe(true);
    expect(report.selected.every((row) => row.hookWordBonus === 0)).toBe(true);
  });
});
