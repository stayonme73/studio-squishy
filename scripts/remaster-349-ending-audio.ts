/**
 * Certification-set remaster: Clip 2 only.
 * Dedicated original Eleven Music sting. Clips 1 and 3 stay unchanged.
 */
import { copyFileSync, existsSync, writeFileSync } from "fs";
import path from "path";

import { studio349ShortFormContentPackOwnerUnusualCertV1 as cert } from "../src/config/studio-349-short-form-content-pack-owner-unusual-cert-v1";
import { studioShortFormContentPackFactoryV1 as pack } from "../src/config/studio-short-form-content-pack-factory-v1";
import { studioShortFormVideoEditingBuildV1 } from "../src/config/studio-short-form-video-editing-build-v1";
import { composeElevenMusicInstrumental } from "../src/lib/studio-kitchen-production/music-production/eleven-music";
import {
  finishPackEndingAudio,
  packEndStingAbsolutePath,
  packMusicBedAbsolutePath,
  probeMediaDuration,
} from "../src/lib/studio-short-form-content-pack/ending-audio";
import { applyDotenvLocal } from "../src/lib/studio-short-form-video-editing/load-env-local";

const repoRoot = process.cwd();
applyDotenvLocal(repoRoot);
const stamp = path.join(repoRoot, cert.stampDir);
const hold = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
const clipId = "clip-02-cherries";

async function ensureDedicatedSting(): Promise<{
  stingAbsolutePath: string;
  minted: boolean;
  estimatedCredits: number | null;
}> {
  const stingAbsolutePath = packEndStingAbsolutePath(repoRoot);
  if (existsSync(stingAbsolutePath)) {
    return { stingAbsolutePath, minted: false, estimatedCredits: 0 };
  }
  const minted = await composeElevenMusicInstrumental({
    prompt: pack.endingAudio.stingPrompt,
    durationMs: 3000,
    outputRelativePath: pack.endingAudio.stingRel,
    repoRoot,
    accountTier: "Starter",
  });
  if (!minted.ok) {
    throw new Error(`Eleven Music sting failed: ${minted.message}`);
  }
  writeFileSync(
    path.join(path.dirname(stingAbsolutePath), "pack-end-sting-rights.json"),
    `${JSON.stringify({ ...minted.rights, estimatedCredits: minted.estimatedCredits }, null, 2)}\n`,
  );
  return {
    stingAbsolutePath,
    minted: true,
    estimatedCredits: minted.estimatedCredits,
  };
}

async function main() {
  const sting = await ensureDedicatedSting();
  const owner = path.join(stamp, "owner-handoff", `${clipId}.mp4`);
  const total = probeMediaDuration(owner);
  const result = finishPackEndingAudio({
    videoAbsolutePath: owner,
    speechAudioAbsolutePath: path.join(stamp, "work", clipId, "range-cut.mp4"),
    musicAbsolutePath: packMusicBedAbsolutePath(repoRoot),
    stingAbsolutePath: sting.stingAbsolutePath,
    outputAbsolutePath: path.join(stamp, "delivery", `${clipId}-ending-audio.mp4`),
    workDirectory: path.join(stamp, "quality", "ending-audio", clipId),
    speechEndSeconds: Math.max(1, total - hold),
    totalDurationSeconds: total,
    useCue: true,
    cueMixDb: pack.endingAudio.subtleCueMixDb,
  });
  if (!result.ok) {
    throw new Error(`${clipId}: ${result.message}`);
  }
  copyFileSync(path.join(stamp, "delivery", `${clipId}-ending-audio.mp4`), owner);
  console.log(
    JSON.stringify(
      {
        clipId,
        ...result,
        total,
        cueMixDb: pack.endingAudio.subtleCueMixDb,
        stingMinted: sting.minted,
        estimatedCredits: sting.estimatedCredits,
        stingRel: pack.endingAudio.stingRel,
        clipsLeftUnchanged: ["clip-01-intro", "clip-03-learned"],
      },
      null,
      2,
    ),
  );
}

void main();
