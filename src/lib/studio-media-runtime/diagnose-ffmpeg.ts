import { accessSync, constants, existsSync, mkdtempSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";
import { tmpdir } from "os";
import path from "path";

import {
  describeResolvedMediaBinaries,
  resolveFfprobeExecutable,
  resolveFfmpegExecutable,
} from "./ffmpeg-cli";

export type FfmpegBinaryProbe = {
  label: string;
  command: string;
  resolvedPath: string | null;
  exists: boolean;
  executable: boolean;
  versionExitCode: number | null;
  versionStdout: string;
  versionStderr: string;
  spawnError: string | null;
};

function probeBinary(label: string, command: string): FfmpegBinaryProbe {
  const resolvedPath = command;
  let exists = false;
  let executable = false;
  try {
    if (existsSync(resolvedPath)) {
      exists = true;
      accessSync(resolvedPath, constants.X_OK);
      executable = true;
    }
  } catch {
    executable = false;
  }

  const versionRun = spawnSync(resolvedPath, ["-version"], {
    encoding: "utf8",
    maxBuffer: 512 * 1024,
  });
  return {
    label,
    command,
    resolvedPath,
    exists,
    executable,
    versionExitCode: versionRun.status,
    versionStdout: String(versionRun.stdout ?? "").slice(0, 400),
    versionStderr: String(versionRun.stderr ?? "").slice(0, 800),
    spawnError: versionRun.error ? String(versionRun.error.message) : null,
  };
}

function probePathLookup(name: string): { whichExit: number | null; whichOut: string; whichErr: string } {
  const isWin = process.platform === "win32";
  const run = spawnSync(isWin ? "where" : "which", [name], { encoding: "utf8" });
  return {
    whichExit: run.status,
    whichOut: String(run.stdout ?? "").trim().slice(0, 400),
    whichErr: String(run.stderr ?? "").trim().slice(0, 400),
  };
}

/** Run volumedetect on a 1s sine — proves ffmpeg + audio filter path, not customer footage. */
export function probeVolumeDetectOnSyntheticWav(ffmpegCommand: string): {
  ok: boolean;
  exitCode: number | null;
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
  stderrTail: string;
  spawnError: string | null;
} {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-ffmpeg-probe-"));
  const wav = path.join(dir, "probe-tone.wav");
  const tone = spawnSync(
    ffmpegCommand,
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=48000:duration=1",
      wav,
    ],
    { encoding: "utf8" },
  );
  if (tone.status !== 0 || !existsSync(wav)) {
    return {
      ok: false,
      exitCode: tone.status,
      meanVolumeDb: null,
      maxVolumeDb: null,
      stderrTail: String(tone.stderr ?? "").slice(-600),
      spawnError: tone.error ? String(tone.error.message) : null,
    };
  }

  const detect = spawnSync(
    ffmpegCommand,
    ["-vn", "-i", wav, "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 512 * 1024 },
  );
  const text = `${detect.stdout ?? ""}\n${detect.stderr ?? ""}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  return {
    ok: detect.status === 0 && mean != null,
    exitCode: detect.status,
    meanVolumeDb: mean ? Number(mean[1]) : null,
    maxVolumeDb: max ? Number(max[1]) : null,
    stderrTail: String(detect.stderr ?? "").slice(-600),
    spawnError: detect.error ? String(detect.error.message) : null,
  };
}

export function diagnoseHostedFfmpegRuntime(): {
  at: string;
  platform: string;
  arch: string;
  vercel: boolean;
  pathEnvHead: string;
  pathLookupFfmpeg: ReturnType<typeof probePathLookup>;
  pathLookupFfprobe: ReturnType<typeof probePathLookup>;
  bundledFfmpeg: FfmpegBinaryProbe;
  bundledFfprobe: FfmpegBinaryProbe;
  pathOnlyFfmpeg: FfmpegBinaryProbe;
  pathOnlyFfprobe: FfmpegBinaryProbe;
  syntheticVolumeDetectBundled: ReturnType<typeof probeVolumeDetectOnSyntheticWav>;
  misclassificationNote: string;
  resolvedPaths: ReturnType<typeof describeResolvedMediaBinaries>;
} {
  const resolved = describeResolvedMediaBinaries();
  const bundledFfmpegPath = resolveFfmpegExecutable();
  const bundledFfprobePath = resolveFfprobeExecutable();

  return {
    resolvedPaths: resolved,
    at: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    vercel: Boolean(process.env.VERCEL),
    pathEnvHead: (process.env.PATH ?? "").split(path.delimiter).slice(0, 6).join(" | "),
    pathLookupFfmpeg: probePathLookup("ffmpeg"),
    pathLookupFfprobe: probePathLookup("ffprobe"),
    bundledFfmpeg: probeBinary("bundled-resolve", bundledFfmpegPath),
    bundledFfprobe: probeBinary("bundled-resolve", bundledFfprobePath),
    pathOnlyFfmpeg: probeBinary("PATH-ffmpeg", "ffmpeg"),
    pathOnlyFfprobe: probeBinary("PATH-ffprobe", "ffprobe"),
    syntheticVolumeDetectBundled: probeVolumeDetectOnSyntheticWav(bundledFfmpegPath),
    misclassificationNote:
      "If PATH-ffmpeg fails but bundled-resolve succeeds, SOURCE_AUDIO_REPLACEMENT_REQUIRED from measureSourceAudio was infrastructure misclassification (mean_volume null → hasAudio false).",
  };
}
