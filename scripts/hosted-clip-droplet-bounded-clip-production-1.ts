/**
 * Bounded single-clip production on DO Test worker (reuse intermediates; complete missing stages).
 *
 * Usage:
 *   STUDIO_HOSTED_CLIP_WORKER=1 npx tsx scripts/hosted-clip-droplet-bounded-clip-production-1.ts [clipId]
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import { readHostedClipProductionCheckpoint } from "@/lib/studio-hosted-cert/clip-production-checkpoint";
import { renderOneCertifiedSetClip } from "@/lib/studio-clip-repurposing/live-factory";
import { buildTranscriptSentences } from "@/lib/studio-short-form-video-editing/sentences";
import { sourceAudioWorkDirectory } from "@/lib/studio-source-audio-preflight";
import {
  probeStreamDurations,
  resolveFfmpegExecutable,
  resolveFfprobeExecutable,
} from "@/lib/studio-media-runtime/ffmpeg-cli";
import type { EditDecisionList } from "@/lib/studio-short-form-video-editing/types";
import type { SetCandidate } from "@/lib/studio-clip-repurposing/types";

const PRODUCTION_DB_REF = "txgzguzlojlhndkbncc";
const TEST_DB_REF = "tzyglhypseyokhbeozjw";
const campaignId = "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipId = process.argv[2]?.trim() || "c-82-641";
const WALL_MS = Number(process.env.STUDIO_HOSTED_CLIP_BOUNDED_WALL_MS ?? 900_000);
const POLL_MAX = Number(process.env.STUDIO_HOSTED_CLIP_SHOTSTACK_MAX_ATTEMPTS ?? 120);

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
  process.env.STUDIO_HOSTED_CLIP_SHOTSTACK_MAX_ATTEMPTS = String(POLL_MAX);
  process.env.STUDIO_HOSTED_CLIP_SHOTSTACK_POLL_DELAY_MS = "2000";
  process.env.STUDIO_HOSTED_CLIP_CONCAT_TIMEOUT_MS = "120000";
  process.env.STUDIO_PERSISTENCE_BACKEND ??= "postgres";
  process.env.DATABASE_URL ??= process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL;
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

function resolveCampaignSourceAbsolute(repoRoot: string, campaignId: string): string {
  const tried: string[] = [];
  const checkpoint = readHostedClipProductionCheckpoint(repoRoot, campaignId);
  if (checkpoint?.sourceRelativePath) {
    const abs = path.join(repoRoot, checkpoint.sourceRelativePath);
    tried.push(abs);
    if (existsSync(abs)) return abs;
  }
  const decisionAbs = path.join(sourceAudioWorkDirectory(repoRoot, campaignId), "decision.json");
  if (existsSync(decisionAbs)) {
    try {
      const decision = JSON.parse(readFileSync(decisionAbs, "utf8")) as {
        selectedSourceRelativePath?: string;
      };
      if (decision.selectedSourceRelativePath) {
        const abs = path.join(repoRoot, decision.selectedSourceRelativePath);
        tried.push(abs);
        if (existsSync(abs)) return abs;
      }
    } catch {
      // continue
    }
  }
  throw new Error(`campaign_source_not_found:${tried.join("|")}`);
}

function resolveApprovedCta(edl: EditDecisionList | null, fallback: string): string {
  const fromEdl = edl?.captions.find((c) => c.role === "cta")?.text?.trim();
  return fromEdl || fallback;
}

function extractQualityFrames(videoAbs: string, outDir: string, timestampsSec: number[]): string[] {
  mkdirSync(outDir, { recursive: true });
  const ffmpeg = resolveFfmpegExecutable();
  const written: string[] = [];
  for (const ts of timestampsSec) {
    const out = path.join(outDir, `production-frame-${String(Math.round(ts * 10)).padStart(4, "0")}.jpg`);
    const r = spawnSync(
      ffmpeg,
      ["-y", "-ss", String(ts), "-i", videoAbs, "-frames:v", "1", "-q:v", "2", out],
      { encoding: "utf8" },
    );
    if (r.status === 0 && existsSync(out)) written.push(out);
  }
  return written;
}

function evaluateProductionQuality(productionAbs: string, expectedDurationSec: number | null) {
  const probe = probeStreamDurations(productionAbs);
  const formatDur = probe.formatDuration;
  const avDelta =
    probe.videoDuration != null && probe.audioDuration != null
      ? Math.abs(probe.videoDuration - probe.audioDuration)
      : null;
  const durationOk =
    expectedDurationSec != null && formatDur != null
      ? formatDur >= expectedDurationSec - 1.2 && formatDur <= expectedDurationSec + 2.5
      : formatDur != null && formatDur >= 12 && formatDur <= 35;
  const avSyncOk = avDelta == null || avDelta <= 0.35;
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
      productionAbs,
    ],
    { encoding: "utf8" },
  );
  let resolutionOk = false;
  if (r.status === 0) {
    try {
      const parsed = JSON.parse(r.stdout) as { streams?: Array<{ width?: number; height?: number }> };
      const s = parsed.streams?.[0];
      resolutionOk = s?.width === 1080 && s?.height === 1920;
    } catch {
      resolutionOk = false;
    }
  }
  return {
    ftypOk: ftypOk(productionAbs),
    durationOk,
    avSyncOk,
    resolutionOk,
    formatDuration: formatDur,
    expectedDurationSec,
    avDelta,
    probe,
    qualityGateOk: ftypOk(productionAbs) && durationOk && avSyncOk && resolutionOk,
  };
}

function artifactSnapshot(clipDir: string) {
  const burnWork = path.join(clipDir, "burn-work");
  return {
    extractVertical: existsSync(path.join(clipDir, "extract-vertical.mp4")),
    audioFinished: existsSync(path.join(clipDir, "audio-finished.mp4")),
    paintedWords: existsSync(path.join(burnWork, "painted-words.json")),
    burnedCued: existsSync(path.join(burnWork, "burned-cued.mp4")),
    endCard: existsSync(path.join(burnWork, "end-card.mp4")),
    localTextProof: existsSync(path.join(clipDir, "local-text-proof.mp4")),
    productionMp4: existsSync(path.join(clipDir, "production.mp4")),
    probeLadderOnly: existsSync(path.join(clipDir, "probe-ladder")),
  };
}

async function main(): Promise<void> {
  bootstrapEnv();
  const startedAt = Date.now();
  const outDir = path.join(process.cwd(), "docs/launch/studio-hosted-production-team-readiness-1");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const report: Record<string, unknown> = {
    package: "BOUNDED-DO-SINGLE-CLIP-PRODUCTION",
    campaignId,
    clipId,
    wallMs: WALL_MS,
    pollMaxAttempts: POLL_MAX,
    startedAt: new Date(startedAt).toISOString(),
  };

  try {
    const result = await withCampaignArtifactProductionWorkspace(campaignId, async (repoRoot) => {
      const factoryRoot = path.join(repoRoot, "data/campaign-design-artifacts", campaignId, "clip-factory");
      const snapshotAbs = path.join(factoryRoot, "discovery-snapshot.json");
      const transcriptAbs = path.join(factoryRoot, "transcript-words.json");
      const clipDir = path.join(factoryRoot, "clips", clipId);
      const localProofAbs = path.join(clipDir, "local-text-proof.mp4");
      const productionAbs = path.join(clipDir, "production.mp4");
      const edlAbs = path.join(clipDir, "caption-edl.json");

      const beforeArtifacts = artifactSnapshot(clipDir);

      if (!existsSync(snapshotAbs) || !existsSync(transcriptAbs)) {
        throw new Error("missing_factory_snapshot_or_transcript");
      }

      const snapshot = JSON.parse(readFileSync(snapshotAbs, "utf8")) as { selected: SetCandidate[] };
      const candidate = snapshot.selected.find((c) => c.id === clipId);
      if (!candidate) throw new Error("candidate_not_in_discovery_snapshot");

      const transcript = JSON.parse(readFileSync(transcriptAbs, "utf8")) as {
        words: Parameters<typeof buildTranscriptSentences>[0];
        durationSeconds: number;
      };
      const checkpoint = readHostedClipProductionCheckpoint(repoRoot, campaignId);
      const edlBefore = existsSync(edlAbs)
        ? (JSON.parse(readFileSync(edlAbs, "utf8")) as EditDecisionList)
        : null;
      const ctaText = resolveApprovedCta(edlBefore, checkpoint?.ctaText?.trim() || "Book a consult");

      let expectedDurationSec: number | null = null;
      if (existsSync(localProofAbs) && ftypOk(localProofAbs)) {
        expectedDurationSec = probeStreamDurations(localProofAbs).formatDuration;
      }

      if (existsSync(productionAbs) && ftypOk(productionAbs) && existsSync(path.join(clipDir, "spend.json"))) {
        const bytes = readFileSync(productionAbs);
        const exp =
          expectedDurationSec ?? probeStreamDurations(productionAbs).formatDuration ?? 18;
        return {
          reusedExistingProduction: true,
          beforeArtifacts,
          afterArtifacts: artifactSnapshot(clipDir),
          outputBytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          quality: evaluateProductionQuality(productionAbs, exp),
          approvedCta: ctaText,
        };
      }

      const extractAbs = path.join(clipDir, "extract-vertical.mp4");
      const sourceAbsolutePath = existsSync(extractAbs)
        ? extractAbs
        : resolveCampaignSourceAbsolute(repoRoot, campaignId);

      const renderStarted = Date.now();
      const rendered = await renderOneCertifiedSetClip({
        repoRoot,
        campaignId,
        sourceAbsolutePath,
        sourceDurationSeconds: checkpoint?.sourceDurationSeconds ?? transcript.durationSeconds,
        sentences: buildTranscriptSentences(transcript.words),
        words: [...transcript.words],
        ctaText,
        candidate,
      });

      const renderElapsedMs = Date.now() - renderStarted;
      if (Date.now() - startedAt > WALL_MS) {
        throw new Error(`wall_clock_exceeded:${renderElapsedMs}ms`);
      }
      if ("inProgress" in rendered && rendered.inProgress) {
        throw new Error(`render_incomplete:${rendered.message}`);
      }
      if (!("clipId" in rendered)) {
        throw new Error("message" in rendered ? rendered.message : "render_failed");
      }
      if (!existsSync(productionAbs) || !ftypOk(productionAbs)) {
        throw new Error("production_mp4_missing_or_not_ftyp");
      }

      if (existsSync(localProofAbs) && ftypOk(localProofAbs)) {
        expectedDurationSec = probeStreamDurations(localProofAbs).formatDuration;
      }
      const edlAfter = existsSync(edlAbs)
        ? (JSON.parse(readFileSync(edlAbs, "utf8")) as EditDecisionList)
        : null;
      const approvedCta = resolveApprovedCta(edlAfter, ctaText);
      const expDur = expectedDurationSec ?? probeStreamDurations(productionAbs).formatDuration ?? 18;

      const bytes = readFileSync(productionAbs);
      const quality = evaluateProductionQuality(productionAbs, expDur);
      const frameDir = path.join(clipDir, "bounded-production-validation-frames");
      const speechDur = (expDur ?? 18) - 2.5;
      const frames = extractQualityFrames(productionAbs, frameDir, [
        1.5,
        Math.max(1, speechDur * 0.5),
        Math.max(1, speechDur + 0.35),
        (expDur ?? 18) - 0.25,
      ]);

      let shotstackTrace: unknown = null;
      const tracePath = path.join(clipDir, "shotstack-final-trace.json");
      if (existsSync(tracePath)) {
        try {
          shotstackTrace = JSON.parse(readFileSync(tracePath, "utf8"));
        } catch {
          shotstackTrace = { parseError: true };
        }
      }
      let muxTrace: unknown = null;
      const muxPath = path.join(clipDir, "burn-work/mux-concat-trace.json");
      if (existsSync(muxPath)) {
        try {
          muxTrace = JSON.parse(readFileSync(muxPath, "utf8"));
        } catch {
          muxTrace = { parseError: true };
        }
      }

      return {
        renderElapsedMs,
        reusedExistingProduction: false,
        beforeArtifacts,
        afterArtifacts: artifactSnapshot(clipDir),
        relativePath: rendered.relativePath,
        contentSha256: rendered.contentSha256,
        outputBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        quality,
        approvedCta,
        qualityFramesRelative: frames.map((f) => path.relative(repoRoot, f).replace(/\\/g, "/")),
        shotstackTrace,
        muxConcatTrace: muxTrace,
        localProofSha256:
          existsSync(localProofAbs) && ftypOk(localProofAbs)
            ? createHash("sha256").update(readFileSync(localProofAbs)).digest("hex")
            : null,
      };
    });

    report.ok = Boolean((result.quality as { qualityGateOk?: boolean }).qualityGateOk);
    report.result = result;
    report.totalElapsedMs = Date.now() - startedAt;
    if (!report.ok) report.failure = "quality_gate_failed";
  } catch (err) {
    report.ok = false;
    report.failure = err instanceof Error ? err.message : String(err);
    report.totalElapsedMs = Date.now() - startedAt;
  }

  const outPath = path.join(outDir, `HOSTED-CLIP-DO-BOUNDED-PRODUCTION-${clipId}-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
