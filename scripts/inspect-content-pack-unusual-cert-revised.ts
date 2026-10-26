/**
 * Quality inspects the revised MP4s Owner will watch. Does not hand-edit.
 */
import { execFileSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studio349ShortFormContentPackOwnerUnusualCertV1 as cert } from "../src/config/studio-349-short-form-content-pack-owner-unusual-cert-v1";
import { applyDotenvLocal } from "../src/lib/studio-short-form-video-editing/load-env-local";
import { reviewRenderedShort } from "../src/lib/studio-short-form-content-pack/quality-review";

const repoRoot = process.cwd();
const clips = ["clip-01-intro", "clip-02-cherries", "clip-03-learned"] as const;

async function main() {
  applyDotenvLocal(repoRoot);
  const inspectDir = path.join(repoRoot, cert.stampDir, "quality", "revised-owner");
  mkdirSync(inspectDir, { recursive: true });
  const rows = [];
  for (const clipId of clips) {
    const video = path.join(repoRoot, cert.stampDir, "delivery", `${clipId}-revised.mp4`);
    const duration = Number(
      execFileSync(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", video],
        { encoding: "utf8" },
      ).trim(),
    );
    const ending = path.join(inspectDir, `${clipId}-ending.png`);
    const mid = path.join(inspectDir, `${clipId}-mid.png`);
    execFileSync("ffmpeg", [
      "-y",
      "-ss",
      Math.max(0.2, duration - 1.2).toFixed(2),
      "-i",
      video,
      "-frames:v",
      "1",
      ending,
    ]);
    execFileSync("ffmpeg", [
      "-y",
      "-ss",
      (duration / 2).toFixed(2),
      "-i",
      video,
      "-frames:v",
      "1",
      mid,
    ]);
    const review = await reviewRenderedShort({
      repoRoot,
      videoAbsolutePath: video,
      workDir: path.join(inspectDir, clipId),
    });
    rows.push({
      clipId,
      duration,
      endingFrame: path.relative(repoRoot, ending).replace(/\\/g, "/"),
      midFrame: path.relative(repoRoot, mid).replace(/\\/g, "/"),
      review:
        "ok" in review
          ? review
          : {
              pass: review.pass,
              findings: review.findings,
            },
    });
  }
  writeFileSync(
    path.join(repoRoot, cert.stampDir, "REVISED-QUALITY.json"),
    `${JSON.stringify(rows, null, 2)}\n`,
  );
  console.log(JSON.stringify(rows, null, 2));
}

void main();
