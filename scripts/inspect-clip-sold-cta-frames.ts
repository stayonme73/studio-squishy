import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { CLIP_SOLD_RECERT_CAMPAIGN_ID } from "@/config/studio-clip-repurposing-fresh-sold-contract-recert-v1";
import { studioClipRepurposingFreshSoldContractRecertV1 as recert } from "@/config/studio-clip-repurposing-fresh-sold-contract-recert-v1";
import { inspectQualityPng } from "@/lib/studio-short-form-content-pack/quality-review";

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const setAbs = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    CLIP_SOLD_RECERT_CAMPAIGN_ID,
    "clip-factory/set-result.json",
  );
  const set = JSON.parse(readFileSync(setAbs, "utf8")) as {
    files: Array<{ clipId: string; idea: string; relativePath: string }>;
  };
  const outDir = path.join(repoRoot, recert.stampDir, "cta-frames");
  mkdirSync(outDir, { recursive: true });
  const clips = [];
  for (const file of set.files) {
    const videoAbs = path.join(repoRoot, file.relativePath);
    if (!existsSync(videoAbs)) throw new Error(`Missing ${file.relativePath}`);
    const frameAbs = path.join(outDir, `${file.clipId}-end.png`);
    execFileSync(
      "ffmpeg",
      ["-y", "-sseof", "-0.4", "-i", videoAbs, "-frames:v", "1", frameAbs],
      { stdio: "pipe" },
    );
    const inspected = await inspectQualityPng(frameAbs);
    clips.push({
      clipId: file.clipId,
      idea: file.idea,
      champagne: inspected.cta.champagne,
      clipCard: inspected.cta.clipCard,
      ctaTreatmentPresent: inspected.cta.champagne || inspected.cta.clipCard,
    });
  }
  const proof = {
    packageId: recert.packageId,
    campaignId: CLIP_SOLD_RECERT_CAMPAIGN_ID,
    clips,
    allTreatmentsPresent: clips.every((clip) => clip.ctaTreatmentPresent),
    champagneFalsePositivePath: clips.every((clip) => !clip.champagne && clip.clipCard),
  };
  writeFileSync(
    path.join(repoRoot, recert.stampDir, "CTA-FRAME-INSPECT.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
