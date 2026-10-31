/**
 * Bounded DigitalOcean clip-2 concat-only validation (Test Supabase only).
 *
 * Usage (on droplet):
 *   STUDIO_HOSTED_CLIP_WORKER=1 npx tsx scripts/hosted-clip-droplet-concat-only-validation-1.ts
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import {
  probeFormatDurationSeconds,
  probeStreamDurations,
  resolveFfmpegExecutable,
  resolveFfprobeExecutable,
} from "@/lib/studio-media-runtime/ffmpeg-cli";
import {
  CLIP_CAPTION_PRESENTATION,
  paintClipCustomerEndCard,
} from "@/lib/studio-clip-repurposing/caption-finish";
import { CERTIFICATION_SHARED_CTA } from "@/lib/studio-clip-repurposing/frozen-selection";
import { assembleBurnedShort, exactWords } from "@/lib/studio-short-form-video-editing/caption-burn";
import type { EditDecisionList } from "@/lib/studio-short-form-video-editing/types";

const PRODUCTION_DB_REF = "txgzguzlojlhndkbncc";
const TEST_DB_REF = "tzyglhypseyokhbeozjw";
const campaignId = "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipId = "c-17-127";
const WALL_MS = 120_000;
const STRATEGY_B_MARKERS = ["fps=30,format=yuv420p", "-preset", "veryfast", "-crf", "23"];

function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    process.env[key] ??= t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

function bootstrapEnv(): void {
  const workerEnv =
    process.env.STUDIO_HOSTED_CLIP_WORKER_ENV?.trim() ?? "/home/studioadmin/studio/worker.env";
  loadEnvFile(workerEnv);
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  process.env.STUDIO_HOSTED_CLIP_WORKER = "1";
  process.env.STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE = "1";
  process.env.STUDIO_HOSTED_CLIP_CONCAT_TIMEOUT_MS = String(WALL_MS);
  process.env.STUDIO_PERSISTENCE_BACKEND ??= "postgres";
  process.env.DATABASE_URL ??= process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  process.env.VERCEL_ENV = "preview";
  const urls = [process.env.DATABASE_URL, process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL]
    .filter(Boolean)
    .join(" ");
  if (urls.includes(PRODUCTION_DB_REF)) {
    throw new Error("Refusing Production Supabase ref.");
  }
  const ref = process.env.STUDIO_PERSISTENCE_TEST_PROJECT_REF?.trim();
  if (ref && ref !== TEST_DB_REF) {
    throw new Error(`Unexpected test project ref: ${ref}`);
  }
}

function ftypOk(abs: string): boolean {
  if (!existsSync(abs)) return false;
  const head = readFileSync(abs).subarray(0, 12);
  return head.length >= 8 && head.subarray(4, 8).toString("ascii") === "ftyp";
}

function workerCaptionBurnFingerprint(): {
  captionBurnPath: string;
  sha256: string;
  strategyBPresent: boolean;
  spawnFfmpegWithTimeoutPresent: boolean;
  workerPreviewMuxGatePresent: boolean;
} {
  const captionBurnPath = path.join(
    process.cwd(),
    "src/lib/studio-short-form-video-editing/caption-burn.ts",
  );
  const src = readFileSync(captionBurnPath, "utf8");
  return {
    captionBurnPath,
    sha256: createHash("sha256").update(src).digest("hex"),
    strategyBPresent: STRATEGY_B_MARKERS.every((m) => src.includes(m)),
    spawnFfmpegWithTimeoutPresent: src.includes("spawnFfmpegWithTimeout"),
    workerPreviewMuxGatePresent: src.includes('STUDIO_HOSTED_CLIP_WORKER === "1"'),
  };
}

function resolveApprovedCta(edl: EditDecisionList): string {
  const fromEdl = edl.captions.find((c) => c.role === "cta")?.text?.trim();
  if (fromEdl) return fromEdl;
  return CERTIFICATION_SHARED_CTA;
}

function extractQualityFrames(input: {
  videoAbs: string;
  outDir: string;
  timestampsSec: number[];
}): string[] {
  mkdirSync(input.outDir, { recursive: true });
  const ffmpeg = resolveFfmpegExecutable();
  const written: string[] = [];
  for (const ts of input.timestampsSec) {
    const out = path.join(input.outDir, `frame-${String(Math.round(ts * 10)).padStart(4, "0")}.jpg`);
    const r = spawnSync(
      ffmpeg,
      [
        "-y",
        "-ss",
        String(ts),
        "-i",
        input.videoAbs,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        out,
      ],
      { encoding: "utf8" },
    );
    if (r.status === 0 && existsSync(out)) written.push(out);
  }
  return written;
}

function evaluateOutputQuality(input: {
  localProofAbs: string;
  expectedDurationSec: number;
}): Record<string, unknown> {
  const probe = probeStreamDurations(input.localProofAbs);
  const formatDur = probe.formatDuration;
  const avDelta =
    probe.videoDuration != null && probe.audioDuration != null
      ? Math.abs(probe.videoDuration - probe.audioDuration)
      : null;
  const durationOk =
    formatDur != null &&
    formatDur >= input.expectedDurationSec - 1 &&
    formatDur <= input.expectedDurationSec + 2.5;
  const avSyncOk = avDelta == null || avDelta <= 0.35;
  const resolutionOk = (() => {
    const ffprobe = resolveFfprobeExecutable();
    const r = spawnSync(
      ffprobe,
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        input.localProofAbs,
      ],
      { encoding: "utf8" },
    );
    if (r.status !== 0) return false;
    try {
      const parsed = JSON.parse(r.stdout) as { streams?: Array<{ width?: number; height?: number }> };
      const s = parsed.streams?.[0];
      return s?.width === 1080 && s?.height === 1920;
    } catch {
      return false;
    }
  })();
  return {
    ftypOk: ftypOk(input.localProofAbs),
    durationOk,
    avSyncOk,
    resolutionOk,
    formatDuration: formatDur,
    expectedDurationSec: input.expectedDurationSec,
    avDelta,
    probe,
    qualityGateOk: ftypOk(input.localProofAbs) && durationOk && avSyncOk && resolutionOk,
  };
}

async function main(): Promise<void> {
  bootstrapEnv();
  const startedAt = Date.now();
  const outDir = path.join(process.cwd(), "docs/launch/studio-hosted-production-team-readiness-1");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const workerImplementation = workerCaptionBurnFingerprint();
  const report: Record<string, unknown> = {
    package: "BOUNDED-DO-CLIP2-CONCAT-VALIDATION",
    campaignId,
    clipId,
    startedAt: new Date(startedAt).toISOString(),
    wallMs: WALL_MS,
    workerImplementation,
    engineeringGaps: {
      ffmpegProgressLogs: false,
      enforcedTimeout: false,
      deskDoParity: workerImplementation.strategyBPresent,
    },
  };

  try {
    if (!workerImplementation.strategyBPresent) {
      throw new Error("worker_missing_strategy_B_caption_burn");
    }

    const result = await withCampaignArtifactProductionWorkspace(campaignId, async (repoRoot) => {
      const clipDir = path.join(
        repoRoot,
        "data/campaign-design-artifacts",
        campaignId,
        "clip-factory/clips",
        clipId,
      );
      const burnWork = path.join(clipDir, "burn-work");
      const localProofAbs = path.join(clipDir, "local-text-proof.mp4");
      const audioAbs = path.join(clipDir, "audio-finished.mp4");
      const edlAbs = path.join(clipDir, "caption-edl.json");
      const burnedCued = path.join(burnWork, "burned-cued.mp4");
      const endCard = path.join(burnWork, "end-card.mp4");
      const paintedWords = path.join(burnWork, "painted-words.json");
      const tracePath = path.join(burnWork, "mux-concat-trace.json");
      const progressLog = path.join(burnWork, "mux-concat-ffmpeg-progress.log");
      const stderrLog = path.join(burnWork, "mux-concat-ffmpeg-stderr.log");

      const intermediates = {
        audioFinished: existsSync(audioAbs),
        captionEdl: existsSync(edlAbs),
        burnedCued: existsSync(burnedCued),
        endCard: existsSync(endCard),
        paintedWords: existsSync(paintedWords),
      };
      if (!intermediates.burnedCued || !intermediates.endCard || !intermediates.paintedWords) {
        throw new Error(`missing_intermediates:${JSON.stringify(intermediates)}`);
      }
      if (!intermediates.captionEdl || !intermediates.audioFinished) {
        throw new Error(`missing_edl_or_audio:${JSON.stringify(intermediates)}`);
      }

      const speechDur = probeFormatDurationSeconds(burnedCued);
      const cardDur = probeFormatDurationSeconds(endCard);
      const expectedDurationSec =
        speechDur != null && cardDur != null ? speechDur + cardDur : 18.95;

      if (existsSync(localProofAbs) && !ftypOk(localProofAbs)) {
        unlinkSync(localProofAbs);
        report.removedPartialLocalProof = true;
      } else if (existsSync(localProofAbs)) {
        unlinkSync(localProofAbs);
        report.replacedExistingLocalProof = true;
      }

      const edl = JSON.parse(readFileSync(edlAbs, "utf8")) as EditDecisionList;
      const approvedCta = resolveApprovedCta(edl);

      const muxStarted = Date.now();
      const burned = await assembleBurnedShort({
        sourceAbsolutePath: audioAbs,
        edl,
        workDirectory: burnWork,
        outputAbsolutePath: localProofAbs,
        approvedCta,
        transcriptWordsInRange: exactWords(edl.clips[0]?.text ?? ""),
        captionBackground: CLIP_CAPTION_PRESENTATION.background,
        captionStroke: CLIP_CAPTION_PRESENTATION.stroke,
        captionBottomPx: CLIP_CAPTION_PRESENTATION.bottomPx,
        captionBandHeight: CLIP_CAPTION_PRESENTATION.bandHeight,
        paintEndCard: paintClipCustomerEndCard,
        resumeMuxFromPainted: true,
      });

      const muxElapsedMs = Date.now() - muxStarted;
      if (Date.now() - startedAt > WALL_MS) {
        throw new Error(`wall_clock_exceeded:${muxElapsedMs}ms`);
      }
      if (!burned.ok) {
        throw new Error(burned.message);
      }
      if (!existsSync(localProofAbs) || !ftypOk(localProofAbs)) {
        throw new Error("local_text_proof_missing_or_not_ftyp");
      }

      const quality = evaluateOutputQuality({ localProofAbs, expectedDurationSec });
      const frameDir = path.join(burnWork, "concat-validation-frames");
      const midSpeech = Math.max(1, (speechDur ?? 16) * 0.5);
      const endCardStart = (speechDur ?? 16) + 0.4;
      const frames = extractQualityFrames({
        videoAbs: localProofAbs,
        outDir: frameDir,
        timestampsSec: [1.5, midSpeech, endCardStart, expectedDurationSec - 0.3],
      });

      let trace: Record<string, unknown> | null = null;
      if (existsSync(tracePath)) {
        try {
          trace = JSON.parse(readFileSync(tracePath, "utf8")) as Record<string, unknown>;
        } catch {
          trace = { parseError: true };
        }
      }

      const bytes = readFileSync(localProofAbs);
      return {
        muxElapsedMs,
        approvedCta,
        outputBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        quality,
        qualityFramesRelative: frames.map((f) => path.relative(repoRoot, f).replace(/\\/g, "/")),
        trace,
        ffmpegLogs: {
          progressLogExists: existsSync(progressLog),
          stderrLogExists: existsSync(stderrLog),
          progressTail: existsSync(progressLog)
            ? readFileSync(progressLog, "utf8").slice(-1500)
            : null,
          stderrTail: existsSync(stderrLog) ? readFileSync(stderrLog, "utf8").slice(-1500) : null,
        },
        intermediates,
        expectedDurationSec,
      };
    });

    const gaps = report.engineeringGaps as Record<string, boolean>;
    gaps.ffmpegProgressLogs = Boolean(
      result.ffmpegLogs.progressLogExists || result.ffmpegLogs.stderrLogExists,
    );
    gaps.enforcedTimeout =
      workerCaptionBurnFingerprint().spawnFfmpegWithTimeoutPresent &&
      Boolean(result.ffmpegLogs.stderrLogExists);
    gaps.deskDoParity =
      workerCaptionBurnFingerprint().strategyBPresent &&
      result.trace?.branch === "concat_only_ok";

    report.ok = Boolean(result.quality.qualityGateOk);
    report.result = result;
    report.totalElapsedMs = Date.now() - startedAt;
    if (!report.ok) {
      report.failure = "quality_gate_failed";
    }
  } catch (err) {
    report.ok = false;
    report.failure = err instanceof Error ? err.message : String(err);
    report.totalElapsedMs = Date.now() - startedAt;
  }

  (report.engineeringGaps as Record<string, boolean>).allClosed = Object.entries(
    report.engineeringGaps as Record<string, boolean>,
  )
    .filter(([k]) => k !== "allClosed")
    .every(([, v]) => v === true);

  const outPath = path.join(outDir, `HOSTED-CLIP-DO-CONCAT-ONLY-VALIDATION-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
