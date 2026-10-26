import path from "path";
import { describe, expect, it } from "vitest";

import { applyDotenvLocal } from "./load-env-local";
import { LIVE_PROOF_SOURCE_REL } from "./source-prep";
import {
  watchPerformanceForEdit,
  writePerformanceWatchProof,
} from "./performance-watch";

const REPO = path.resolve(__dirname, "../../..");
const LIVE = process.env.LIVE_PERFORMANCE_WATCH === "1";

describe.skipIf(!LIVE)("Performance-watch prototype — no Production spend", () => {
  it("asks the existing multimodal model to watch the cherries performance", async () => {
    applyDotenvLocal(REPO);
    const source = path.join(REPO, LIVE_PROOF_SOURCE_REL);
    const plan = await watchPerformanceForEdit({
      sourceAbsolutePath: source,
      frameDirectory: path.join(
        REPO,
        "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/frames/performance-watch",
      ),
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    writePerformanceWatchProof({ repoRoot: REPO, plan });
    expect(plan.estimatedUsd).toBeGreaterThanOrEqual(0);
    if (!plan.ok) {
      expect(["KEY_ABSENT", "NOT_BETTER_THAN_SENTENCE_STOP", "PROVIDER_REJECTED"]).toContain(
        plan.reason,
      );
      return;
    }
    expect(plan.dropSignOff).toBe(true);
    expect(plan.exitSourceSeconds).toBeLessThan(107.8);
    expect(plan.materiallyBetterThanSentenceStop).toBe(true);
  }, 180_000);
});
