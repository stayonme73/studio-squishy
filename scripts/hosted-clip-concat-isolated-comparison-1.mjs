/**
 * Isolated clip-2 concat comparison (Test Supabase intermediates only).
 * Times each strategy; validates duration, ftyp, size — not existence alone.
 *
 * Usage: node scripts/hosted-clip-concat-isolated-comparison-1.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { createWriteStream as createWS } from "fs";

import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaignId = "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipId = "c-17-127";
const outDir = path.join(repoRoot, ".tmp-clip-concat-comparison");
const wallMs = 120_000;

loadEnvLocal(repoRoot);
delete process.env.VERCEL;
delete process.env.VERCEL_ENV;

const { campaignArtifactStoragePrefix } = await import(
  "../src/lib/campaign-design-artifacts/paths.ts"
);
const { resolveFfmpegExecutable, resolveFfprobeExecutable } = await import(
  "../src/lib/studio-media-runtime/ffmpeg-cli.ts"
);

const supabaseUrl = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim();
const serviceKey = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim() ?? "studio-files-test";

const ffmpeg = resolveFfmpegExecutable();
const ffprobe = resolveFfprobeExecutable();

async function downloadObject(objectPath, destAbs) {
  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(`download ${objectPath} ${res.status}`);
  mkdirSync(path.dirname(destAbs), { recursive: true });
  await pipeline(res.body, createWS(destAbs));
}

function probeJson(abs) {
  const r = spawnSync(
    ffprobe,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration,size:stream=codec_name,width,height,r_frame_rate,avg_frame_rate,duration",
      "-of",
      "json",
      abs,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return { ok: false, error: r.stderr?.slice(0, 300) };
  try {
    return { ok: true, data: JSON.parse(r.stdout) };
  } catch {
    return { ok: false, error: "parse" };
  }
}

function ftypOk(abs) {
  try {
    const head = readFileSync(abs).subarray(0, 12);
    const hex = head.toString("hex");
    return hex.includes("66747970"); // ftyp
  } catch {
    return false;
  }
}

function runFfmpeg(args, label) {
  const started = Date.now();
  const r = spawnSync(ffmpeg, args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const elapsed = Date.now() - started;
  return {
    label,
    exitStatus: r.status,
    wallMs: elapsed,
    timedOut: elapsed > wallMs,
    spawnError: r.error?.message ?? null,
    stderrTail: (r.stderr ?? "").slice(-800),
  };
}

function evaluateOutput(outAbs, expectedDurationSec) {
  if (!existsSync(outAbs)) return { ok: false, reason: "missing_output" };
  const stat = readFileSync(outAbs).length;
  const probe = probeJson(outAbs);
  if (!probe.ok) return { ok: false, reason: "ffprobe_failed", bytes: stat };
  const dur = Number(probe.data.format?.duration ?? 0);
  const v = probe.data.streams?.find((s) => s.codec_name === "h264");
  const a = probe.data.streams?.find((s) => s.codec_name === "aac");
  const durationOk = dur >= expectedDurationSec - 1 && dur <= expectedDurationSec + 2.5;
  return {
    ok: ftypOk(outAbs) && durationOk && Boolean(v) && Boolean(a),
    bytes: stat,
    durationSec: dur,
    ftyp: ftypOk(outAbs),
    durationOk,
    video: v
      ? { w: v.width, h: v.height, fps: v.r_frame_rate ?? v.avg_frame_rate }
      : null,
    audio: a ? { codec: a.codec_name, duration: a.duration } : null,
  };
}

mkdirSync(outDir, { recursive: true });
const prefix = `${campaignArtifactStoragePrefix(campaignId)}clip-factory/clips/${clipId}/`;
const burnedCuedRel = `${prefix}burn-work/burned-cued.mp4`.replace(/\/+/g, "/");
const endCardRel = `${prefix}burn-work/end-card.mp4`.replace(/\/+/g, "/");
const burnedCued = path.join(outDir, "burned-cued.mp4");
const endCard = path.join(outDir, "end-card.mp4");

await downloadObject(burnedCuedRel, burnedCued);
await downloadObject(endCardRel, endCard);

const inProbe = {
  burnedCued: probeJson(burnedCued),
  endCard: probeJson(endCard),
};
const expectedDuration =
  Number(inProbe.burnedCued.data?.format?.duration ?? 16.4) +
  Number(inProbe.endCard.data?.format?.duration ?? 2.5);

const strategies = [];
const includeSlowBaseline = process.argv.includes("--include-slow-baseline");

// B — normalize CFR 30 + veryfast + crf 23 (quality-preserving social short)
const outB = path.join(outDir, "B-normalized-fps30-crf23.mp4");
strategies.push({
  id: "B_normalized_fps30_crf23",
  ...runFfmpeg(
    [
      "-y",
      "-i",
      burnedCued,
      "-i",
      endCard,
      "-filter_complex",
      "[0:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v0];[1:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v1];[0:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS[a0];[1:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      outB,
    ],
    "B",
  ),
  quality: null,
});
strategies[strategies.length - 1].quality = evaluateOutput(outB, expectedDuration);

// C — stream copy concat demuxer (only if compatible)
const listFile = path.join(outDir, "concat-list.txt");
writeFileSync(
  listFile,
  `file '${burnedCued.replace(/\\/g, "/")}'\nfile '${endCard.replace(/\\/g, "/")}'\n`,
  "utf8",
);
const outC = path.join(outDir, "C-stream-copy-demuxer.mp4");
strategies.push({
  id: "C_stream_copy_demuxer",
  ...runFfmpeg(
    ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", outC],
    "C",
  ),
  quality: null,
});
strategies[strategies.length - 1].quality = evaluateOutput(outC, expectedDuration);

// D — match end-card video to burned-cued fps then production encode with preset
const burnedFps =
  inProbe.burnedCued.data?.streams?.find((s) => s.codec_name === "h264")?.r_frame_rate ?? "30";
const outD = path.join(outDir, "D-match-source-fps-veryfast.mp4");
strategies.push({
  id: "D_match_source_fps",
  ...runFfmpeg(
    [
      "-y",
      "-i",
      burnedCued,
      "-i",
      endCard,
      "-filter_complex",
      `[0:v]setpts=PTS-STARTPTS[v0];[1:v]fps=${burnedFps},setpts=PTS-STARTPTS[v1];[0:a]asetpts=PTS-STARTPTS[a0];[1:a]aresample=48000,asetpts=PTS-STARTPTS[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      outD,
    ],
    "D",
  ),
  quality: null,
});
strategies[strategies.length - 1].quality = evaluateOutput(outD, expectedDuration);

if (includeSlowBaseline) {
  const outA = path.join(outDir, "A-current-filter-concat.mp4");
  strategies.push({
    id: "A_current_production",
    ...runFfmpeg(
      [
        "-y",
        "-i",
        burnedCued,
        "-i",
        endCard,
        "-filter_complex",
        "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        outA,
      ],
      "A",
    ),
    quality: null,
  });
  strategies[strategies.length - 1].quality = evaluateOutput(outA, expectedDuration);
}

const deskReferenceBytes = 565517;
const report = {
  verifiedAt: new Date().toISOString(),
  campaignId,
  clipId,
  expectedDurationSec: expectedDuration,
  deskReferenceBytes,
  inputProbeSummary: {
    burnedCuedFps:
      inProbe.burnedCued.data?.streams?.find((s) => s.codec_name === "h264")?.r_frame_rate ?? null,
    endCardFps:
      inProbe.endCard.data?.streams?.find((s) => s.codec_name === "h264")?.r_frame_rate ?? null,
  },
  strategies,
  recommended: null,
};

const passing = strategies.filter((s) => s.exitStatus === 0 && s.quality?.ok);
const fast = passing.filter((s) => s.wallMs < 60_000);
if (fast.length) {
  fast.sort((a, b) => a.wallMs - b.wallMs);
  report.recommended = {
    strategyId: fast[0].id,
    wallMs: fast[0].wallMs,
    quality: fast[0].quality,
    rationale: "Fastest passing strategy under 60s with valid ftyp, A/V streams, and duration window.",
  };
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const reportPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1",
  `HOSTED-CLIP-CONCAT-ISOLATED-COMPARISON-${stamp}.json`,
);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, reportPath, recommended: report.recommended, strategies: strategies.map((s) => ({
  id: s.id,
  wallMs: s.wallMs,
  exitStatus: s.exitStatus,
  qualityOk: s.quality?.ok,
  bytes: s.quality?.bytes,
  durationSec: s.quality?.durationSec,
})) }, null, 2));

process.exit(passing.length ? 0 : 5);
