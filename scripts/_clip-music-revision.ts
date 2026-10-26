/**
 * Music-only revision of c-115-993. Does not touch the two passing clips.
 * Deleted after the run.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import path from "path";

import { decideClip549QualityCorrection } from "@/lib/studio-549-clip-repurposing/quality";
import {
  FLAGSHIP_UPBEAT_BED_REL,
  mixMusicUnderSpeech,
} from "@/lib/studio-flagship-short-form-edit/music";
import { reviewRenderedShort } from "@/lib/studio-short-form-content-pack/quality-review";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { execFileSync } from "child_process";

const CAMPAIGN_ID = "route-proof-clip-1791580066573";
const CLIP_ID = "c-115-993";
const CTA_HOLD_SECONDS = 2.5;

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function durationSeconds(file: string): number {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { encoding: "utf8" },
    ).trim(),
  );
}

async function main() {
  const repoRoot = process.cwd();
  applyDotenvLocal(repoRoot);
  const clipDir = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    CAMPAIGN_ID,
    "clip-factory/clips",
    CLIP_ID,
  );
  const current = path.join(clipDir, "production.mp4");
  const firstPass = path.join(clipDir, "production-first-pass.mp4");
  const revised = path.join(clipDir, "production.mp4");
  const bed = path.join(repoRoot, FLAGSHIP_UPBEAT_BED_REL);
  if (!existsSync(bed)) {
    console.log(JSON.stringify({ step: "bed", ok: false, message: "Upbeat Studio bed is missing." }));
    return;
  }
  if (!existsSync(firstPass)) copyFileSync(current, firstPass);
  const beforeHash = sha256(firstPass);
  const speechEnd = Math.max(1, durationSeconds(firstPass) - CTA_HOLD_SECONDS);
  const mixed = path.join(clipDir, "production-music-revision.mp4");
  const mix = mixMusicUnderSpeech({
    videoAbsolutePath: firstPass,
    musicAbsolutePath: bed,
    outputAbsolutePath: mixed,
    speechEndSeconds: speechEnd,
  });
  if (!mix.ok) {
    console.log(JSON.stringify({ step: "mix", ok: false, message: mix.message }));
    return;
  }
  copyFileSync(mixed, revised);
  const afterHash = sha256(revised);
  const quality = await reviewRenderedShort({
    repoRoot,
    videoAbsolutePath: revised,
    workDir: path.join(
      repoRoot,
      "data/campaign-design-artifacts",
      CAMPAIGN_ID,
      "clip-factory/quality-revision",
      CLIP_ID,
    ),
  });
  const other = ["c-96-865", "c-22-228"].map((id) => {
    const file = path.join(clipDir, "..", id, "production.mp4");
    return { clipId: id, sha256: sha256(file) };
  });
  let verdict: "PASS" | "REVISE" | "REJECT" = "REJECT";
  let defects: string[] = [];
  let openingText = "";
  let endingText = "";
  let heard = "";
  if ("ok" in quality) {
    defects = [quality.message];
  } else {
    const decision = decideClip549QualityCorrection({
      review: quality,
      loopIndex: 0,
      previousKinds: [],
    });
    verdict = quality.pass ? "PASS" : decision.route === "production" ? "REVISE" : "REJECT";
    defects = quality.findings.map((finding) => `${finding.code}: ${finding.detail}`);
    openingText = quality.openingText;
    endingText = quality.endingText;
    heard = quality.heardMusicKind;
  }
  const receiptAbs = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    CAMPAIGN_ID,
    "dd_route-proof-clip-1791580066573_v2-rtu-clip-repurposing",
    "clip-repurposing-hook-receipt.json",
  );
  const receipt = JSON.parse(readFileSync(receiptAbs, "utf8")) as {
    files: Array<{ clipId: string; contentSha256: string; relativePath: string }>;
  };
  const row = receipt.files.find((file) => file.clipId === CLIP_ID);
  if (row) row.contentSha256 = afterHash;
  writeFileSync(receiptAbs, `${JSON.stringify(receipt, null, 2)}\n`);
  const proof = {
    campaignId: CAMPAIGN_ID,
    jobId: `${CAMPAIGN_ID}:v2-rtu-clip-repurposing`,
    clipId: CLIP_ID,
    revised: "music_tone_only",
    bed: FLAGSHIP_UPBEAT_BED_REL,
    firstPassSha256: beforeHash,
    revisedSha256: afterHash,
    verdict,
    defects,
    openingText,
    endingText,
    heardMusicKind: heard,
    otherClips: other,
    recordedAt: new Date().toISOString(),
  };
  writeFileSync(
    path.join(clipDir, "..", "..", "QUALITY-REVISION.json"),
    `${JSON.stringify(proof, null, 2)}\n`,
  );
  console.log(JSON.stringify(proof));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "revision failed");
  process.exitCode = 1;
});
