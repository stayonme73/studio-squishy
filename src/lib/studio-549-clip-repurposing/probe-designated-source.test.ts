import path from "path";
import { describe, expect, it } from "vitest";

import { discoverDesignatedClipSource } from "./probe-designated-source";

const REPO = path.resolve(__dirname, "../../..");

describe("designated Clip source discovery probe", () => {
  it("reports real viable distinct count from the Owner-designated transcript", () => {
    const { saved, discovery } = discoverDesignatedClipSource(REPO);
    expect(saved.durationSeconds).toBeGreaterThan(120);
    expect(saved.words.length).toBeGreaterThan(100);
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          durationSeconds: saved.durationSeconds,
          estimatedUsdList: saved.estimatedUsdList,
          requestId: saved.requestId,
          viableDistinctCount: discovery.viableDistinctCount,
          productionAllowed: discovery.productionAllowed,
          selected: discovery.selected.map((clip) => ({
            id: clip.id,
            start: clip.windowStart,
            end: clip.windowEnd,
            score: clip.semanticScore,
            idea: clip.idea,
          })),
          alternates: discovery.alternates.map((clip) => ({
            id: clip.id,
            start: clip.windowStart,
            end: clip.windowEnd,
            score: clip.semanticScore,
            idea: clip.idea,
          })),
        },
        null,
        2,
      ),
    );
  });
});
