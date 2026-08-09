/**
 * KITCHEN-PRODUCTION-CERT-VIDEO-1 — generate SKU-appropriate V5 narration.
 * Uses certified ElevenLabs path. Does NOT mutate voice-cert artifacts.
 * Never prints API keys. No commit.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { execFileSync } from "child_process";

import {
  generateVoiceArtifact,
  resolveApprovedVoiceConfiguration,
} from "../src/lib/studio-kitchen-production/voice-production";
import { CERT_VOICE_PROVIDER } from "../src/lib/studio-kitchen-production/cert-voice/fixtures";

function loadEnvLocal(repoRoot: string) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const repoRoot = path.resolve(__dirname, "..");
loadEnvLocal(repoRoot);

/** Approved customer-facing short-video narration (display facts). */
export const CERT_VIDEO_NARRATION_APPROVED =
  "Cedar Lane Studio. Refresh your portrait for $99 when you book by May 3rd, 2026. Sessions begin at 10:30 AM. Call (555) 018-4421 or visit cedar-lane-studio.example/book. Book your visit today.";

/** Exact TTS generation text (spoken forms). */
export const CERT_VIDEO_NARRATION_GENERATION =
  "Cedar Lane Studio. Refresh your portrait for ninety-nine dollars when you book by May third, twenty twenty-six. Sessions begin at ten thirty in the morning. Call five five five, zero one eight, four four two one, or visit cedar lane studio dot example slash book. Book your visit today.";

export const CERT_VIDEO_NARRATION_SCRIPT_ID = "cert-video-narration";
export const CERT_VIDEO_NARRATION_SCRIPT_VERSION_ID = "cert-video-narration-v1";
export const CERT_VIDEO_NARRATION_CAMPAIGN_ID = "cert-video-1-cedar-lane";

const ARTIFACT_ROOT =
  "docs/launch/kitchen-production-cert-video-1/artifacts/voice";

function probeDurationSeconds(absPath: string): number {
  const out = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absPath,
    ],
    { encoding: "utf8" },
  ).trim();
  const n = Number(out);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`ffprobe duration failed for ${absPath}: ${out}`);
  }
  return n;
}

/** Character-proportional beat map against actual MP3 duration. */
function buildBeatMap(durationSeconds: number) {
  const units: Array<{ id: string; text: string; designed: string }> = [
    {
      id: "brand",
      text: "Cedar Lane Studio.",
      designed: "Cedar Lane Studio",
    },
    {
      id: "offer",
      text: " Refresh your portrait for ninety-nine dollars",
      designed: "Portrait Refresh · $99",
    },
    {
      id: "deadline",
      text: " when you book by May third, twenty twenty-six.",
      designed: "Before May 3rd, 2026",
    },
    {
      id: "sessions",
      text: " Sessions begin at ten thirty in the morning.",
      designed: "Sessions from 10:30 AM",
    },
    {
      id: "contact",
      text: " Call five five five, zero one eight, four four two one, or visit cedar lane studio dot example slash book.",
      designed: "(555) 018-4421 · cedar-lane-studio.example/book",
    },
    {
      id: "cta",
      text: " Book your visit today.",
      designed: "Book your visit today",
    },
  ];
  const total = units.reduce((a, u) => a + u.text.length, 0);
  let t = 0;
  return units.map((u) => {
    const len = (durationSeconds * u.text.length) / total;
    const start = Number(t.toFixed(3));
    t += len;
    const end = Number(Math.min(durationSeconds, t).toFixed(3));
    return {
      beatId: u.id,
      startSeconds: start,
      endSeconds: end,
      narration: u.text.trim(),
      designedText: u.designed,
    };
  });
}

async function main() {
  const forbidden = [
    /certification fixture/i,
    /internal test/i,
    /not customer deliverable/i,
    /quinoa/i,
    /hvac/i,
    /pronunciation/i,
  ];
  for (const re of forbidden) {
    if (re.test(CERT_VIDEO_NARRATION_GENERATION) || re.test(CERT_VIDEO_NARRATION_APPROVED)) {
      throw new Error(`Forbidden certification-only language matched: ${re}`);
    }
  }

  const voice = resolveApprovedVoiceConfiguration();
  // Lock to the same certified Studio voice/model as voice cert unless env overrides.
  const voiceConfiguration = {
    provider: "elevenlabs" as const,
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || CERT_VOICE_PROVIDER.voiceId,
    modelId: process.env.ELEVENLABS_MODEL_ID?.trim() || CERT_VOICE_PROVIDER.modelId,
    source: process.env.ELEVENLABS_VOICE_ID?.trim()
      ? ("env" as const)
      : ("default_candidate" as const),
  };

  const result = await generateVoiceArtifact({
    campaignId: CERT_VIDEO_NARRATION_CAMPAIGN_ID,
    // Generation uses the proven voice SKU path; binding is for short-video cert.
    skuId: "ap-001",
    approvedScript: CERT_VIDEO_NARRATION_GENERATION,
    scriptVersionId: CERT_VIDEO_NARRATION_SCRIPT_VERSION_ID,
    outputFormat: "mp3",
    repoRoot,
    internalTest: true,
    artifactRoot: ARTIFACT_ROOT,
    voiceConfiguration,
  });

  if (!result.ok) {
    const summary = {
      ok: false,
      code: result.code,
      message: result.message,
      note: "Do not paste API keys. Ensure ELEVENLABS_API_KEY is in .env.local.",
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  const durationSeconds = probeDurationSeconds(result.artifact.absolutePath);
  const beatMap = buildBeatMap(durationSeconds);

  const binding = {
    id: "cert-video-narration-v1",
    scriptId: CERT_VIDEO_NARRATION_SCRIPT_ID,
    scriptVersionId: CERT_VIDEO_NARRATION_SCRIPT_VERSION_ID,
    approvedScript: CERT_VIDEO_NARRATION_APPROVED,
    generationScript: CERT_VIDEO_NARRATION_GENERATION,
    relativePath: result.artifact.relativePath,
    contentSha256: result.artifact.contentSha256,
    byteLength: result.artifact.byteLength,
    durationSeconds,
    extension: "mp3" as const,
    campaignId: CERT_VIDEO_NARRATION_CAMPAIGN_ID,
    generationSkuId: "ap-001",
    bindsForSkuId: "v2-rtu-short-video",
    provider: "elevenlabs" as const,
    providerModelId: result.evidence.providerModelId,
    providerVoiceId: result.evidence.providerVoiceId,
    providerOutputFormat: result.evidence.providerOutputFormat,
    providerRequestId: result.evidence.providerRequestId ?? null,
    generatedAt: result.artifact.generatedAt,
    label: result.artifact.label,
    qaState: "qa_ready" as const,
    customerReady: false,
    certified: false,
    certificationOnlyLanguageRemoved: true,
    voiceCertArtifactPreserved: true,
    voiceCertSha256:
      "d283144563a6fe2075be956fd144fe1c0bb4de29ec55ca308c5b8060c94647e4",
    beatMapMethod: "character_proportional_against_actual_mp3_duration",
    beatMap,
    fitsSkuBand15to30: durationSeconds >= 15 && durationSeconds <= 30,
    targetBandNote: "prefer ~22–27s; hard max 30s",
  };

  const outDir = path.join(repoRoot, ARTIFACT_ROOT);
  mkdirSync(outDir, { recursive: true });
  const bindingRel = `${ARTIFACT_ROOT}/BINDING-MANIFEST-v1.json`;
  writeFileSync(
    path.join(repoRoot, bindingRel),
    `${JSON.stringify(binding, null, 2)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        bindingPath: bindingRel,
        relativePath: binding.relativePath,
        contentSha256: binding.contentSha256,
        byteLength: binding.byteLength,
        durationSeconds: binding.durationSeconds,
        fitsSkuBand15to30: binding.fitsSkuBand15to30,
        providerRequestId: binding.providerRequestId,
        voiceId: binding.providerVoiceId,
        modelId: binding.providerModelId,
        beatMap,
      },
      null,
      2,
    ),
  );

  if (!binding.fitsSkuBand15to30) {
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
