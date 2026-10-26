/**
 * Quality-watch each finished short before customer review.
 * Does not publish.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import {
  CLIP_SOLD_RECERT_CAMPAIGN_ID,
  studioClipRepurposingFreshSoldContractRecertV1 as recert,
} from "@/config/studio-clip-repurposing-fresh-sold-contract-recert-v1";
import { reviewRenderedShort } from "@/lib/studio-short-form-content-pack/quality-review";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

export async function runClipSoldContractQuality(input: {
  repoRoot: string;
  lane: "first-cut" | "revision";
}) {
  applyDotenvLocal(input.repoRoot);
  const setAbs = path.join(
    input.repoRoot,
    "data/campaign-design-artifacts",
    CLIP_SOLD_RECERT_CAMPAIGN_ID,
    "clip-factory",
    "set-result.json",
  );
  if (!existsSync(setAbs)) {
    throw new Error("set-result.json is missing. First cut has not finished.");
  }
  const set = JSON.parse(readFileSync(setAbs, "utf8")) as {
    files: Array<{ clipId: string; idea: string; relativePath: string }>;
  };
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const clips = [];
  for (const file of set.files) {
    const videoAbs = path.join(input.repoRoot, file.relativePath);
    const clipStarted = Date.now();
    const quality = await reviewRenderedShort({
      repoRoot: input.repoRoot,
      videoAbsolutePath: videoAbs,
      workDir: path.join(
        input.repoRoot,
        recert.stampDir,
        "quality",
        input.lane,
        file.clipId,
      ),
    });
    if ("ok" in quality) {
      clips.push({
        clipId: file.clipId,
        idea: file.idea,
        relativePath: file.relativePath,
        ok: false,
        message: quality.message,
        ms: Date.now() - clipStarted,
      });
      continue;
    }
    clips.push({
      clipId: file.clipId,
      idea: file.idea,
      relativePath: file.relativePath,
      pass: quality.pass,
      findings: quality.findings,
      openingText: quality.openingText,
      endingText: quality.endingText,
      ms: Date.now() - clipStarted,
    });
  }
  const proof = {
    packageId: recert.packageId,
    campaignId: CLIP_SOLD_RECERT_CAMPAIGN_ID,
    lane: input.lane,
    startedAt,
    endedAt: new Date().toISOString(),
    ms: Date.now() - startedMs,
    pass: clips.every((clip) => "pass" in clip && clip.pass),
    clips,
  };
  writeJson(
    path.join(input.repoRoot, recert.stampDir, `QUALITY-${input.lane.toUpperCase()}.json`),
    proof,
  );
  return proof;
}
