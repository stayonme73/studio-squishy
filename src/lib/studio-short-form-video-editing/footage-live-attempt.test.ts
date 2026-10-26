import path from "path";
import { describe, expect, it } from "vitest";

import { runFootageEditingPipeline } from "./footage-pipeline";
import { writeFootageReviewProof } from "./footage-review-proof";
import { applyDotenvLocal } from "./load-env-local";
import { probeFootageSource } from "./probe";
import { ensureLiveProofSource, LIVE_PROOF_SOURCE_META } from "./source-prep";
import { readDeepgramApiKey } from "./deepgram";

const REPO = path.resolve(__dirname, "../../..");
const LIVE = process.env.LIVE_FOOTAGE_PROOF === "1";

describe.skipIf(!LIVE)("Live footage proof attempt", () => {
  it("runs the new footage spine and stops honestly if Deepgram is absent", async () => {
    applyDotenvLocal(REPO);
    const source = await ensureLiveProofSource({ repoRoot: REPO });
    expect(source.ok).toBe(true);
    if (!source.ok) return;

    const probe = probeFootageSource(source.absolutePath);
    expect("error" in probe).toBe(false);

    const result = await runFootageEditingPipeline({
      repoRoot: REPO,
      sourceAbsolutePath: source.absolutePath,
      sourceRelativePath: source.relativePath,
      intake: {
        ctaText: LIVE_PROOF_SOURCE_META.customerCta,
        rightsCleared: LIVE_PROOF_SOURCE_META.rightsClearedForTest,
      },
      applyRevision: false,
      dryRun: process.env.LIVE_FOOTAGE_DRY_RUN === "1",
    });
    writeFootageReviewProof({ repoRoot: REPO, result });

    if (!readDeepgramApiKey()) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.verdict).toBe("DEEPGRAM_KEY_ABSENT");
        expect(result.spend.renders).toBe(0);
      }
      return;
    }

    if (!result.ok) {
      throw new Error(`${result.verdict}: ${result.message}`);
    }
    expect(result.spend.renders).toBe(process.env.LIVE_FOOTAGE_DRY_RUN === "1" ? 0 : 1);
    expect(result.edl.ok).toBe(true);
  }, 420_000);
});
