import path from "path";
import { describe, expect, it } from "vitest";

import { writeCaptionBaselineProof } from "./caption-baseline-proof";

const LIVE = process.env.LIVE_CAPTION_BASELINE_PRODUCE === "1";

describe("Caption baseline local proof", () => {
  it("paints short, six-word, and descender lines on one shared height", async () => {
    const report = await writeCaptionBaselineProof(path.resolve(__dirname, "../../.."));
    expect(report.oneSharedHeight).toBe(true);
    expect(report.spacingPreservedPx).toBe(28);
    expect(report.lines).toHaveLength(3);
  });

  it.skipIf(!LIVE)("runs one Production composite to confirm baseline survives Shotstack", async () => {
    const { produceCaptionBaselineComposite } = await import("./caption-baseline-proof");
    const result = await produceCaptionBaselineComposite(
      path.resolve(__dirname, "../../.."),
    );
    expect(result.providerRenderId).toBeTruthy();
  }, 420_000);
});
