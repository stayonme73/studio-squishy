/**
 * Material-damage clipping, not a whole-file 0 dBFS reject.
 * Isolated needle peaks may pass. Flattened, repeated, or widespread clipping reject.
 * Does not use STT as the judge.
 */

import { spawnFfmpeg } from "@/lib/studio-media-runtime/ffmpeg-cli";

import { studioSourceAudioPreflightV1 } from "@/config/studio-source-audio-preflight-v1";

import type {
  SourceAudioClippingCluster,
  SourceAudioClippingKind,
  SourceAudioClippingScan,
} from "./types";

const RULE = studioSourceAudioPreflightV1.clippingMaterialGate;

export function classifyClippingMaterial(scan: SourceAudioClippingScan): {
  material: boolean;
  kind: SourceAudioClippingKind;
} {
  if (scan.hitCount === 0 || scan.clusters.length === 0) {
    return { material: false, kind: "none" };
  }

  const plateau = scan.clusters.find(
    (cluster) =>
      cluster.durationMs >= RULE.plateauMinDurationMs &&
      cluster.clippedDensity >= RULE.plateauMinClippedDensity,
  );
  if (plateau) {
    return { material: true, kind: "sustained_plateau" };
  }

  if (scan.clippedSampleRatio >= RULE.maxClippedSampleRatio) {
    return { material: true, kind: "widespread_ratio" };
  }

  const longEnoughForRate = scan.durationSeconds >= 60;
  const repeatedByCount = scan.clusters.length > RULE.maxIsolatedClusters;
  const repeatedByRate =
    longEnoughForRate &&
    scan.clustersPerMinute > RULE.maxClustersPerMinuteAfter60s;
  if (repeatedByCount || repeatedByRate) {
    return { material: true, kind: "repeated_clusters" };
  }

  const onlyNeedles = scan.clusters.every(
    (cluster) => cluster.durationMs <= RULE.needleMaxClusterDurationMs,
  );
  if (onlyNeedles) {
    return { material: false, kind: "isolated_needles" };
  }

  return { material: true, kind: "sustained_plateau" };
}

export function scanClippingFromPcm(
  floats: Float32Array,
  sampleRate: number,
): SourceAudioClippingScan {
  const gap = RULE.clusterGapSeconds;
  const threshold = RULE.sampleThreshold;
  const clusters: SourceAudioClippingCluster[] = [];
  let hitCount = 0;
  let peak = 0;
  let clusterStart: number | null = null;
  let clusterEnd = 0;
  let clusterHits = 0;
  let clusterPeak = 0;

  const close = () => {
    if (clusterStart == null) return;
    const durationSeconds = Math.max(0, clusterEnd - clusterStart);
    const spanSamples = Math.max(1, Math.round(durationSeconds * sampleRate) + 1);
    clusters.push({
      startSeconds: Number(clusterStart.toFixed(3)),
      endSeconds: Number(clusterEnd.toFixed(3)),
      durationMs: Number((durationSeconds * 1000).toFixed(1)),
      hitCount: clusterHits,
      peak: Number(clusterPeak.toFixed(6)),
      clippedDensity: Number((clusterHits / spanSamples).toFixed(4)),
    });
    clusterStart = null;
    clusterHits = 0;
    clusterPeak = 0;
  };

  for (let i = 0; i < floats.length; i += 1) {
    const mag = Math.abs(floats[i]!);
    if (mag > peak) peak = mag;
    if (mag < threshold) continue;
    hitCount += 1;
    const sec = i / sampleRate;
    if (clusterStart == null || sec - clusterEnd > gap) {
      close();
      clusterStart = sec;
    }
    clusterEnd = sec;
    clusterHits += 1;
    if (mag > clusterPeak) clusterPeak = mag;
  }
  close();

  const durationSeconds = floats.length / sampleRate;
  return {
    durationSeconds: Number(durationSeconds.toFixed(3)),
    sampleRate,
    sampleCount: floats.length,
    hitCount,
    peak: Number(peak.toFixed(6)),
    clippedSampleRatio: Number((hitCount / Math.max(1, floats.length)).toFixed(8)),
    clusters,
    clustersPerMinute: Number(
      ((clusters.length / Math.max(durationSeconds, 1 / 60)) * 60).toFixed(3),
    ),
  };
}

export function scanSourceClipping(absolutePath: string): SourceAudioClippingScan | null {
  const run = spawnFfmpeg(
    [
      "-hide_banner",
      "-vn",
      "-i",
      absolutePath,
      "-map",
      "0:a:0",
      "-ac",
      "1",
      "-ar",
      String(RULE.analysisSampleRate),
      "-f",
      "f32le",
      "pipe:1",
    ],
    { maxBuffer: 512 * 1024 * 1024 },
  );
  const stdout = run.stdout;
  if (run.status !== 0 || !Buffer.isBuffer(stdout) || stdout.length < 4) {
    return null;
  }
  const floats = new Float32Array(
    stdout.buffer,
    stdout.byteOffset,
    Math.floor(stdout.length / 4),
  );
  return scanClippingFromPcm(floats, RULE.analysisSampleRate);
}
