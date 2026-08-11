/**
 * Run STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1 end-to-end and write a summary JSON.
 *
 * Usage: npx tsx scripts/run-design-renderer-proof.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";

import {
  buildHarborOakFlyerProjectTruth,
  runDesignRendererProofPipeline,
  PROOF_ARTIFACT_ROOT,
} from "../src/lib/studio-design-renderer";

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const truth = buildHarborOakFlyerProjectTruth({ repoRoot });
  const preferAnthropic = process.env.DESIGN_RENDERER_PREFER_ANTHROPIC !== "0";

  const result = await runDesignRendererProofPipeline({
    repoRoot,
    truth,
    preferAnthropic,
  });

  const outDir = path.join(repoRoot, PROOF_ARTIFACT_ROOT);
  mkdirSync(outDir, { recursive: true });
  const summaryPath = path.join(outDir, "proof-run-summary.json");
  writeFileSync(
    summaryPath,
    `${JSON.stringify(
      {
        packageId: "STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1",
        ranAt: new Date().toISOString(),
        preferAnthropic,
        result,
        ownerRoutineProduction: "NONE",
        canvaRequired: false,
        makeRequired: false,
      },
      null,
      2,
    )}\n`,
  );

  console.log(JSON.stringify({ summaryPath, ok: result.ok, verdict: result.verdict }, null, 2));
  if (!result.ok) {
    console.error(result.message);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
