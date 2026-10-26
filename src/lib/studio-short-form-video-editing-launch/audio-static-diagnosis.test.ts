import path from "path";
import { describe, expect, it } from "vitest";

import { runAudioStaticDiagnosis } from "./audio-static-diagnosis";

const LIVE = process.env.LIVE_AUDIO_STATIC_DIAGNOSIS === "1";
const REPO = path.resolve(__dirname, "../../..");

describe.skipIf(!LIVE)("Live staging audio static diagnosis", () => {
  it("measures the same speech window at each stage", () => {
    const result = runAudioStaticDiagnosis(REPO);
    expect(result.stages.filter((stage) => stage.exists)).toHaveLength(4);
    expect(["source_side", "studio_introduced", "mixed"]).toContain(result.verdict);
  });
});
