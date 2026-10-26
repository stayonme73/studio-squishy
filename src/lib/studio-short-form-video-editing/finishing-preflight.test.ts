import { describe, expect, it } from "vitest";

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import { buildEditDecisionList } from "./edl";
import { evaluateFinishingPreflight } from "./finishing-preflight";
import {
  formatFootageCaptionText,
  readableCaptionText,
} from "./footage-payload";
import { TALKING_HEAD_INTAKE } from "./talking-head-fixture";

const FROZEN = studioShortFormVideoEditingBuildV1.frozenCherriesEditorial;

describe("Checkpoint 10 finishing preflight", () => {
  it("keeps CTA words exact after shared spacing", () => {
    const approved = "Read the project notes";
    expect(readableCaptionText(formatFootageCaptionText(approved))).toBe(
      approved,
    );
    expect(formatFootageCaptionText(approved)).not.toMatch(/Readed|notess|theproject/);
  });

  it("holds the landing and puts CTA after the performance", () => {
    const edl = buildEditDecisionList({
      words: [
        { word: "favorite", start: 83.5, end: 84.2, punctuatedWord: "My" },
        { word: "cherries", start: 88.2, end: 90.1, punctuatedWord: "cherries," },
        { word: "delicious", start: 99.8, end: 100.66, punctuatedWord: "delicious." },
      ],
      intake: {
        ...TALKING_HEAD_INTAKE,
        ctaText: "Read the project notes",
      },
      sourceDurationSeconds: 156,
      lockContinuousRange: {
        start: FROZEN.openingSourceSeconds,
        end: FROZEN.holdExitSourceSeconds,
      },
    });
    expect(edl.ok).toBe(true);
    if (!edl.ok) return;
    const preflight = evaluateFinishingPreflight({
      edl,
      approvedCta: "Read the project notes",
    });
    expect(preflight.ok).toBe(true);
    if (!preflight.ok) return;
    expect(preflight.holdExitSourceSeconds).toBe(FROZEN.holdExitSourceSeconds);
    expect(preflight.holdExitSourceSeconds).toBeLessThan(
      FROZEN.leftoverStartsSourceSeconds,
    );
    expect(preflight.ctaStart).toBeGreaterThanOrEqual(preflight.performanceEnd);
    expect(preflight.ctaText).toBe("Read the project notes");
  });
});
