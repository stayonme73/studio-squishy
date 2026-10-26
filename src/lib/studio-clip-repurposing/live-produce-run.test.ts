import path from "path";
import { describe, expect, it } from "vitest";

import { runPositiveLiveCertification } from "./live-produce";

const LIVE = process.env.LIVE_CLIP_REPURPOSE === "1";
const STAGE = (process.env.LIVE_CLIP_STAGE ?? "review") as "review" | "produce" | "revise";

describe.skipIf(!LIVE)("Clip Repurposing resumed positive live certification", () => {
  it(`runs stage ${STAGE}`, async () => {
    const report = await runPositiveLiveCertification(path.resolve(__dirname, "../../.."), STAGE);
    expect(report.reviewed.qa.frozenIds).toHaveLength(3);
    if (STAGE === "review") {
      expect(report.reviewed.notes).toHaveLength(3);
    }
  }, 900_000);
});
