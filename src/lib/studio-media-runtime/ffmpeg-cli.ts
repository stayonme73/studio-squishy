import { createHash } from "crypto";
import { accessSync, chmodSync, constants, copyFileSync, existsSync, writeFileSync } from "fs";
import { spawn, spawnSync, type SpawnSyncOptions } from "child_process";
import path from "path";

import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

type FfprobeStaticModule = { path?: string };

let cachedFfmpeg: string | null | undefined;
let cachedFfprobe: string | null | undefined;

function envOverride(name: "STUDIO_FFMPEG_PATH" | "STUDIO_FFPROBE_PATH"): string | null {
  const v = process.env[name]?.trim();
  return v || null;
}

function bundledFfmpegPath(): string | null {
  const p = typeof ffmpegStatic === "string" ? ffmpegStatic.trim() : "";
  return p || null;
}

function bundledFfprobePath(): string | null {
  const mod = ffprobeStatic as FfprobeStaticModule;
  const p = mod.path?.trim();
  return p || null;
}

function normalizeBundledPath(raw: string): string {
  if (raw.startsWith("/ROOT")) {
    return path.join(process.cwd(), raw.slice("/ROOT".length));
  }
  return raw;
}

function bundledPathCandidates(raw: string | null, fallbacks: string[]): string[] {
  const out: string[] = [];
  if (raw?.trim()) {
    out.push(normalizeBundledPath(raw.trim()));
    out.push(raw.trim());
  }
  for (const rel of fallbacks) {
    out.push(path.join(process.cwd(), rel));
  }
  return [...new Set(out)];
}

function materializeExecutable(label: "ffmpeg" | "ffprobe", candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    if (process.env.VERCEL) {
      const hash = createHash("sha256").update(candidate).digest("hex").slice(0, 10);
      const dest = path.join("/tmp", `studio-${label}-${hash}`);
      if (!existsSync(dest)) {
        copyFileSync(candidate, dest);
      }
      try {
        chmodSync(dest, 0o755);
      } catch {
        // ignore
      }
      return dest;
    }
    return candidate;
  }
  return null;
}

function isRunnable(abs: string | null | undefined): abs is string {
  if (!abs?.trim()) return false;
  if (!existsSync(abs)) return false;
  if (process.env.VERCEL) {
    try {
      chmodSync(abs, 0o755);
    } catch {
      // traced binaries may already be executable
    }
  }
  try {
    accessSync(abs, constants.X_OK);
    return true;
  } catch {
    return existsSync(abs);
  }
}

/** Prefer env override, then npm static binary, then PATH name. */
export function resolveFfmpegExecutable(): string {
  if (cachedFfmpeg !== undefined) return cachedFfmpeg ?? "ffmpeg";
  const env = envOverride("STUDIO_FFMPEG_PATH");
  const materialized = materializeExecutable("ffmpeg", bundledPathCandidates(bundledFfmpegPath(), [
    "node_modules/ffmpeg-static/ffmpeg",
    "node_modules/ffmpeg-static/ffmpeg.exe",
  ]));
  cachedFfmpeg = isRunnable(env)
    ? env
    : materialized && isRunnable(materialized)
      ? materialized
      : null;
  return cachedFfmpeg ?? "ffmpeg";
}

export function resolveFfprobeExecutable(): string {
  if (cachedFfprobe !== undefined) return cachedFfprobe ?? "ffprobe";
  const env = envOverride("STUDIO_FFPROBE_PATH");
  const raw = bundledFfprobePath();
  const materialized = materializeExecutable(
    "ffprobe",
    bundledPathCandidates(raw, [
      "node_modules/ffprobe-static/bin/linux/x64/ffprobe",
      "node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe",
      "node_modules/ffprobe-static/bin/darwin/x64/ffprobe",
    ]),
  );
  cachedFfprobe = isRunnable(env)
    ? env
    : materialized && isRunnable(materialized)
      ? materialized
      : null;
  return cachedFfprobe ?? "ffprobe";
}

export function spawnFfmpeg(args: readonly string[], options?: SpawnSyncOptions) {
  return spawnSync(resolveFfmpegExecutable(), [...args], options);
}

/** Redact likely secrets/tokens from FFmpeg logs before durable persistence. */
export function redactFfmpegLog(text: string): string {
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(?:apikey|authorization|password|secret)[=:]\s*\S+/gi, (m) =>
      m.replace(/\S+$/, "[redacted]"),
    )
    .replace(/[A-Za-z0-9_\-]{48,}/g, "[redacted]");
}

export type FfmpegTimedRunResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  terminated: boolean;
  stdout: string;
  stderr: string;
  elapsedMs: number;
  progressLogPath: string | null;
  stderrLogPath: string | null;
};

/**
 * Async FFmpeg with wall-clock timeout, SIGTERM → SIGKILL, and optional durable logs.
 */
export function spawnFfmpegWithTimeout(input: {
  args: readonly string[];
  timeoutMs: number;
  progressLogPath?: string;
  stderrLogPath?: string;
}): Promise<FfmpegTimedRunResult> {
  const started = Date.now();
  const progressLogPath = input.progressLogPath?.trim() || null;
  const stderrLogPath = input.stderrLogPath?.trim() || null;
  const ffmpegArgs = [...input.args];
  if (progressLogPath) {
    ffmpegArgs.unshift("-progress", progressLogPath, "-nostats");
  }

  return new Promise((resolve) => {
    const child = spawn(resolveFfmpegExecutable(), ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let terminated = false;

    const timer = setTimeout(() => {
      timedOut = true;
      terminated = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 2000);
    }, input.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > 4 * 1024 * 1024) stdout = stdout.slice(-4 * 1024 * 1024);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
      if (stderr.length > 4 * 1024 * 1024) stderr = stderr.slice(-4 * 1024 * 1024);
    });

    child.on("close", (status, signal) => {
      clearTimeout(timer);
      const elapsedMs = Date.now() - started;
      const redactedStderr = redactFfmpegLog(stderr);
      const redactedStdout = redactFfmpegLog(stdout);
      if (stderrLogPath) {
        try {
          writeFileSync(
            stderrLogPath,
            `# elapsedMs=${elapsedMs} timedOut=${timedOut} status=${status ?? "null"} signal=${signal ?? "null"}\n${redactedStderr}\n`,
            "utf8",
          );
        } catch {
          // ignore log write failure
        }
      }
      resolve({
        status: status ?? null,
        signal: signal ?? null,
        timedOut,
        terminated,
        stdout: redactedStdout,
        stderr: redactedStderr,
        elapsedMs,
        progressLogPath,
        stderrLogPath,
      });
    });
  });
}

export function spawnFfprobe(args: readonly string[], options?: SpawnSyncOptions) {
  return spawnSync(resolveFfprobeExecutable(), [...args], options);
}

export function probeFormatDurationSeconds(absolutePath: string): number | null {
  const r = spawnFfprobe(
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absolutePath,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return null;
  const n = Number(String(r.stdout ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function probeStreamDurations(absolutePath: string): {
  formatDuration: number | null;
  videoDuration: number | null;
  audioDuration: number | null;
} {
  const r = spawnFfprobe(
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,duration",
      "-of",
      "json",
      absolutePath,
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return { formatDuration: null, videoDuration: null, audioDuration: null };
  }
  try {
    const parsed = JSON.parse(String(r.stdout)) as {
      format?: { duration?: string };
      streams?: Array<{ codec_type?: string; duration?: string }>;
    };
    const formatDuration = Number(parsed.format?.duration ?? NaN);
    const video = parsed.streams?.find((s) => s.codec_type === "video");
    const audio = parsed.streams?.find((s) => s.codec_type === "audio");
    return {
      formatDuration: Number.isFinite(formatDuration) ? formatDuration : null,
      videoDuration: video?.duration ? Number(video.duration) : null,
      audioDuration: audio?.duration ? Number(audio.duration) : null,
    };
  } catch {
    return { formatDuration: null, videoDuration: null, audioDuration: null };
  }
}

export function execFileFfmpegArgs(): { ffmpeg: string; ffprobe: string } {
  return {
    ffmpeg: resolveFfmpegExecutable(),
    ffprobe: resolveFfprobeExecutable(),
  };
}

/** Introspection for hosted probes — does not log secrets. */
export function describeResolvedMediaBinaries(): {
  ffmpeg: string;
  ffprobe: string;
  cwd: string;
  bundledFfmpegPath: string | null;
  bundledFfprobePath: string | null;
  bundledFfmpegExists: boolean;
  bundledFfprobeExists: boolean;
  ffmpegCandidates: { path: string; exists: boolean }[];
  ffprobeCandidates: { path: string; exists: boolean }[];
} {
  const bundledF = bundledFfmpegPath();
  const bundledP = bundledFfprobePath();
  const ffmpegCandidates = bundledPathCandidates(bundledF, [
    "node_modules/ffmpeg-static/ffmpeg",
    "node_modules/ffmpeg-static/ffmpeg.exe",
  ]).map((p) => ({ path: p, exists: existsSync(p) }));
  const ffprobeCandidates = bundledPathCandidates(bundledP, [
    "node_modules/ffprobe-static/bin/linux/x64/ffprobe",
    "node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe",
  ]).map((p) => ({ path: p, exists: existsSync(p) }));
  return {
    ffmpeg: resolveFfmpegExecutable(),
    ffprobe: resolveFfprobeExecutable(),
    cwd: process.cwd(),
    bundledFfmpegPath: bundledF,
    bundledFfprobePath: bundledP,
    bundledFfmpegExists: ffmpegCandidates.some((c) => c.exists),
    bundledFfprobeExists: ffprobeCandidates.some((c) => c.exists),
    ffmpegCandidates,
    ffprobeCandidates,
  };
}
