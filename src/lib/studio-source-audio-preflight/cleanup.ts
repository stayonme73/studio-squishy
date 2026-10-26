import { spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

import { studioSourceAudioPreflightV1 } from "@/config/studio-source-audio-preflight-v1";

import { measureSourceAudio } from "./evaluate";

const LIGHT_FILTERS = [
  "highpass=f=80,afftdn=nr=8:nf=-45",
  "highpass=f=80,afftdn=nr=12:nf=-50",
] as const;

export type LightCleanupDecision = {
  selectedAbsolutePath: string;
  selectedRelativePath: string;
  passesAttempted: number;
  cleanupKept: boolean;
  revertedToOriginal: boolean;
};

function remuxCleanedAudio(input: {
  sourceAbsolutePath: string;
  destAbsolutePath: string;
  filter: string;
}): boolean {
  mkdirSync(path.dirname(input.destAbsolutePath), { recursive: true });
  const run = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      input.sourceAbsolutePath,
      "-af",
      input.filter,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      input.destAbsolutePath,
    ],
    { encoding: "utf8" },
  );
  return run.status === 0 && existsSync(input.destAbsolutePath);
}

export function speechDamagedByCleanup(
  originalMean: number | null,
  cleanedMean: number | null,
): boolean {
  if (originalMean == null || cleanedMean == null) return true;
  return originalMean - cleanedMean > 3;
}

export function hissImprovedByCleanup(
  originalHiss: number | null,
  cleanedHiss: number | null,
): boolean {
  if (originalHiss == null || cleanedHiss == null) return false;
  return originalHiss - cleanedHiss >= 2;
}

export function chooseCleanupVersusOriginal(input: {
  originalAbsolutePath: string;
  cleanedAbsolutePath: string;
}): "cleaned" | "original" {
  const original = measureSourceAudio(input.originalAbsolutePath);
  const cleaned = measureSourceAudio(input.cleanedAbsolutePath);
  if (speechDamagedByCleanup(original.meanVolumeDb, cleaned.meanVolumeDb)) {
    return "original";
  }
  if (hissImprovedByCleanup(original.hissMeanDb, cleaned.hissMeanDb)) {
    return "cleaned";
  }
  return "original";
}

function cleanupSufficient(hissMeanDb: number | null, speechToHissDb: number | null): boolean {
  return (hissMeanDb ?? 0) <= -50 || (speechToHissDb ?? 0) >= 20;
}

export function applyLightSourceAudioCleanup(input: {
  repoRoot: string;
  sourceAbsolutePath: string;
  workDirectory: string;
}): LightCleanupDecision {
  const original = measureSourceAudio(input.sourceAbsolutePath);
  if (cleanupSufficient(original.hissMeanDb, original.speechToHissDb)) {
    return {
      selectedAbsolutePath: input.sourceAbsolutePath,
      selectedRelativePath: path
        .relative(input.repoRoot, input.sourceAbsolutePath)
        .replace(/\\/g, "/"),
      passesAttempted: 0,
      cleanupKept: false,
      revertedToOriginal: false,
    };
  }

  let bestPath = input.sourceAbsolutePath;
  let bestMeasure = original;
  let passesAttempted = 0;
  let cleanupKept = false;

  const maxPasses = studioSourceAudioPreflightV1.maxLightCleanupPasses;
  for (let i = 0; i < maxPasses; i += 1) {
    if (cleanupSufficient(bestMeasure.hissMeanDb, bestMeasure.speechToHissDb) && i > 0) {
      break;
    }
    const dest = path.join(input.workDirectory, `light-cleanup-pass-${i + 1}.mp4`);
    if (!remuxCleanedAudio({
      sourceAbsolutePath: input.sourceAbsolutePath,
      destAbsolutePath: dest,
      filter: LIGHT_FILTERS[i] ?? LIGHT_FILTERS[0],
    })) {
      break;
    }
    passesAttempted += 1;
    const next = measureSourceAudio(dest);
    if (speechDamagedByCleanup(original.meanVolumeDb, next.meanVolumeDb)) {
      continue;
    }
    const betterThanBest = hissImprovedByCleanup(bestMeasure.hissMeanDb, next.hissMeanDb);
    if (betterThanBest) {
      bestPath = dest;
      bestMeasure = next;
      cleanupKept = true;
    } else if (i === 0) {
      break;
    }
  }

  const selectedRelativePath = path
    .relative(input.repoRoot, bestPath)
    .replace(/\\/g, "/");
  return {
    selectedAbsolutePath: bestPath,
    selectedRelativePath,
    passesAttempted,
    cleanupKept,
    revertedToOriginal: !cleanupKept,
  };
}
