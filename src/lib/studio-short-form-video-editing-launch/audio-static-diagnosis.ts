/**
 * Compare audio at each live-staging stage. Does not reopen editorial, captions, or dispatch.
 */

import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

export const AUDIO_STATIC_PROOF_REL =
  "docs/launch/studio-operating-short-form-video-editing-launch-now-integration-1/audio-static-diagnosis";

const SPEECH_START = 83.505;
const SPEECH_LEN = 18.695;

export type StageMeasure = {
  id: string;
  relativePath: string;
  exists: boolean;
  durationSeconds?: number;
  codec?: string;
  sampleRateHz?: number;
  meanVolumeDb?: number | null;
  maxVolumeDb?: number | null;
  hissMeanDb?: number | null;
  hissMaxDb?: number | null;
  quietMeanDb?: number | null;
};

function probeDuration(abs: string): number {
  const raw = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", abs],
    { encoding: "utf8" },
  );
  return Number(raw.trim());
}

function probeAudio(abs: string): { codec: string; sampleRateHz: number } {
  const raw = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_name,sample_rate",
      "-of",
      "json",
      abs,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(raw) as {
    streams?: Array<{ codec_name?: string; sample_rate?: string }>;
  };
  return {
    codec: parsed.streams?.[0]?.codec_name ?? "none",
    sampleRateHz: Number(parsed.streams?.[0]?.sample_rate ?? 0),
  };
}

function volumeOf(abs: string, extraAf?: string): {
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
} {
  const af = extraAf ? `${extraAf},volumedetect` : "volumedetect";
  const run = spawnSync("ffmpeg", ["-i", abs, "-af", af, "-f", "null", "-"], {
    encoding: "utf8",
  });
  const text = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  return {
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
  };
}

function extractWindow(inputAbs: string, outAbs: string, start: number, length: number): void {
  mkdirSync(path.dirname(outAbs), { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(start),
      "-i",
      inputAbs,
      "-t",
      String(length),
      "-vn",
      "-ac",
      "1",
      "-ar",
      "48000",
      outAbs,
    ],
    { stdio: "pipe" },
  );
}

function spectrogram(inputAbs: string, outPng: string): void {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputAbs,
      "-lavfi",
      "showspectrumpic=s=1280x512:mode=combined:color=intensity:scale=log",
      outPng,
    ],
    { stdio: "pipe" },
  );
}

export function runAudioStaticDiagnosis(repoRoot: string): {
  stages: StageMeasure[];
  verdict: "source_side" | "studio_introduced" | "mixed";
  firstAppearsAt: string;
  note: string;
} {
  const outDir = path.join(repoRoot, AUDIO_STATIC_PROOF_REL);
  mkdirSync(outDir, { recursive: true });

  const stages: Array<{
    id: string;
    rel: string;
    windowStart: number;
    windowLen: number;
  }> = [
    {
      id: "source",
      rel: "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/source-talking-head.mp4",
      windowStart: SPEECH_START,
      windowLen: SPEECH_LEN,
    },
    {
      id: "loudnorm-finish",
      rel: "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/source-audio-finished.mp4",
      windowStart: SPEECH_START,
      windowLen: SPEECH_LEN,
    },
    {
      id: "local-caption-burn",
      rel: "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/local-text-proof.mp4",
      windowStart: 0,
      windowLen: SPEECH_LEN,
    },
    {
      id: "shotstack-composite",
      rel: "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/edited-talking-head.mp4",
      windowStart: 0,
      windowLen: SPEECH_LEN,
    },
  ];

  const measures: StageMeasure[] = [];
  for (const stage of stages) {
    const abs = path.join(repoRoot, stage.rel);
    if (!existsSync(abs)) {
      measures.push({ id: stage.id, relativePath: stage.rel, exists: false });
      continue;
    }
    const wav = path.join(outDir, `${stage.id}.wav`);
    extractWindow(abs, wav, stage.windowStart, stage.windowLen);
    spectrogram(wav, path.join(outDir, `${stage.id}-spectrogram.png`));
    const full = volumeOf(wav);
    const hiss = volumeOf(wav, "highpass=f=4000");
    const quiet = volumeOf(wav, "atrim=start=0:end=0.8");
    const audio = probeAudio(abs);
    measures.push({
      id: stage.id,
      relativePath: stage.rel,
      exists: true,
      durationSeconds: probeDuration(abs),
      codec: audio.codec,
      sampleRateHz: audio.sampleRateHz,
      meanVolumeDb: full.meanVolumeDb,
      maxVolumeDb: full.maxVolumeDb,
      hissMeanDb: hiss.meanVolumeDb,
      hissMaxDb: hiss.maxVolumeDb,
      quietMeanDb: quiet.meanVolumeDb,
    });
  }

  const source = measures.find((row) => row.id === "source");
  const loudnorm = measures.find((row) => row.id === "loudnorm-finish");
  const burn = measures.find((row) => row.id === "local-caption-burn");
  const shotstack = measures.find((row) => row.id === "shotstack-composite");

  const sourceQuiet = source?.quietMeanDb ?? -90;
  const loudQuiet = loudnorm?.quietMeanDb ?? -90;
  const burnHiss = burn?.hissMeanDb ?? -90;
  const stackHiss = shotstack?.hissMeanDb ?? -90;
  const sourceHiss = source?.hissMeanDb ?? -90;
  const loudHiss = loudnorm?.hissMeanDb ?? -90;

  const hissJumpAfterShotstack = stackHiss - burnHiss;
  const hissJumpAfterLoudnorm = loudHiss - sourceHiss;
  const quietJumpAfterLoudnorm = loudQuiet - sourceQuiet;

  let verdict: "source_side" | "studio_introduced" | "mixed" = "source_side";
  let firstAppearsAt = "source";
  let note =
    "Room/source hiss is already in the talking-head. Certified service does not include noise restoration.";

  if (hissJumpAfterShotstack > 4) {
    verdict = "studio_introduced";
    firstAppearsAt = "shotstack-composite";
    note = "High-frequency energy rises materially at Shotstack composite versus the local burned file.";
  } else if (burnHiss - loudHiss > 4) {
    verdict = "studio_introduced";
    firstAppearsAt = "local-caption-burn";
    note = "High-frequency energy rises materially at local AAC remux / caption concat.";
  } else if (quietJumpAfterLoudnorm > 8 && sourceQuiet < -40) {
    verdict = "source_side";
    firstAppearsAt = "source";
    note =
      "Source already has quiet-section noise. Loudnorm raises it to the frozen -14 LUFS target. That is gain of existing noise, not new restoration work and not a Shotstack defect.";
  } else if (hissJumpAfterLoudnorm > 6 && sourceHiss > -70) {
    verdict = "source_side";
    firstAppearsAt = "source";
    note =
      "Source already contains high-frequency hiss. Loudnorm makes it louder with the frozen loudness target. Restoration is outside certified scope.";
  }

  const report = {
    speechWindow: { start: SPEECH_START, length: SPEECH_LEN },
    stages: measures,
    deltas: {
      hissJumpAfterLoudnorm,
      hissJumpAfterShotstack,
      quietJumpAfterLoudnorm,
      burnMinusLoudnormHiss: burnHiss - loudHiss,
    },
    verdict,
    firstAppearsAt,
    note,
    certifiedExclusion: "noise_restoration_or_advanced_audio_repair",
  };
  writeFileSync(path.join(outDir, "diagnosis.json"), `${JSON.stringify(report, null, 2)}\n`);
  return { stages: measures, verdict, firstAppearsAt, note };
}
