/**
 * First-pass QA of the three rendered Clip candidates. Does not repair them.
 * Deleted after the run.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { decideClip549QualityCorrection } from "@/lib/studio-549-clip-repurposing/quality";
import { reviewRenderedShort } from "@/lib/studio-short-form-content-pack/quality-review";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";

const CAMPAIGN_ID = "route-proof-clip-1791580066573";

type ReceiptFile = {
  clipId: string;
  idea: string;
  relativePath: string;
  contentSha256: string;
};

function verdictOf(input: {
  inspected: boolean;
  pass: boolean;
  route?: string;
}): "PASS" | "REVISE" | "REJECT" {
  if (!input.inspected) return "REJECT";
  if (input.pass) return "PASS";
  if (input.route === "production") return "REVISE";
  return "REJECT";
}

async function main() {
  const repoRoot = process.cwd();
  applyDotenvLocal(repoRoot);
  const receiptAbs = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    CAMPAIGN_ID,
    "dd_route-proof-clip-1791580066573_v2-rtu-clip-repurposing",
    "clip-repurposing-hook-receipt.json",
  );
  const receipt = JSON.parse(readFileSync(receiptAbs, "utf8")) as {
    files: ReceiptFile[];
  };
  const clips = [];
  for (const file of receipt.files) {
    const started = Date.now();
    const quality = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: path.join(repoRoot, file.relativePath),
      workDir: path.join(
        repoRoot,
        "data/campaign-design-artifacts",
        CAMPAIGN_ID,
        "clip-factory",
        "quality-first-pass",
        file.clipId,
      ),
    });
    if ("ok" in quality) {
      const row = {
        clipId: file.clipId,
        relativePath: file.relativePath,
        contentSha256: file.contentSha256,
        verdict: "REJECT" as const,
        defects: [quality.message],
        ms: Date.now() - started,
      };
      clips.push(row);
      console.log(JSON.stringify(row));
      continue;
    }
    const decision = decideClip549QualityCorrection({
      review: quality,
      loopIndex: 0,
      previousKinds: [],
    });
    const row = {
      clipId: file.clipId,
      relativePath: file.relativePath,
      contentSha256: file.contentSha256,
      verdict: verdictOf({
        inspected: true,
        pass: quality.pass,
        route: decision.route,
      }),
      defects: quality.findings.map((finding) => `${finding.code}: ${finding.detail}`),
      openingText: quality.openingText,
      endingText: quality.endingText,
      decisionRoute: decision.route,
      ms: Date.now() - started,
    };
    clips.push(row);
    console.log(JSON.stringify(row));
  }
  const proof = {
    campaignId: CAMPAIGN_ID,
    jobId: `${CAMPAIGN_ID}:v2-rtu-clip-repurposing`,
    pass: "first",
    repaired: false,
    recordedAt: new Date().toISOString(),
    clips,
  };
  const proofAbs = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    CAMPAIGN_ID,
    "clip-factory",
    "QUALITY-FIRST-PASS.json",
  );
  mkdirSync(path.dirname(proofAbs), { recursive: true });
  writeFileSync(proofAbs, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify({ step: "recorded", proofAbs, verdicts: clips.map((clip) => clip.verdict) }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "qa failed");
  process.exitCode = 1;
});
