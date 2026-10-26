import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studio349ShortFormContentPackOwnerUnusualCertV1 as cert } from "../src/config/studio-349-short-form-content-pack-owner-unusual-cert-v1";
import { reviewRenderedShort } from "../src/lib/studio-short-form-content-pack/quality-review";
import { applyDotenvLocal } from "../src/lib/studio-short-form-video-editing/load-env-local";

const repoRoot = process.cwd();
const clips = ["clip-01-intro", "clip-02-cherries", "clip-03-learned"] as const;

async function main() {
  applyDotenvLocal(repoRoot);
  const rows = [];
  for (const clipId of clips) {
    const video = path.join(repoRoot, cert.ownerHandoffDir, `${clipId}.mp4`);
    const workDir = path.join(repoRoot, cert.stampDir, "quality", "opening-caption-quality", clipId);
    mkdirSync(workDir, { recursive: true });
    const review = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: video,
      workDir,
    });
    rows.push({
      clipId,
      review: "ok" in review ? review : { pass: review.pass, findings: review.findings },
    });
  }
  writeFileSync(
    path.join(repoRoot, cert.stampDir, "OPENING-CAPTION-QUALITY.json"),
    `${JSON.stringify(rows, null, 2)}\n`,
  );
  console.log(JSON.stringify(rows, null, 2));
}

void main();
