/**
 * Cut one window from the long Owner source and display it as native vertical.
 * Applies existing rotation 90. Does not reframe, crop, or follow a face.
 */

import { mkdirSync, renameSync, unlinkSync } from "fs";
import path from "path";

import {
  execFileFfmpegArgs,
  spawnFfmpeg,
  spawnFfprobe,
} from "@/lib/studio-media-runtime/ffmpeg-cli";

export function extractVerticalWindow(input: {
  sourceAbsolutePath: string;
  outputAbsolutePath: string;
  startSeconds: number;
  endSeconds: number;
}): { ok: true; durationSeconds: number } | { ok: false; message: string } {
  if (input.endSeconds <= input.startSeconds) {
    return { ok: false, message: "Extract window is empty." };
  }
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const ff = spawnFfmpeg(
    [
      "-y",
      "-i",
      input.sourceAbsolutePath,
      "-ss",
      input.startSeconds.toFixed(3),
      "-to",
      input.endSeconds.toFixed(3),
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      input.outputAbsolutePath,
    ],
    { stdio: "pipe" },
  );
  if (ff.status !== 0) {
    const detail = ff.stderr?.toString().slice(-240) || ff.error?.message || "unknown";
    return { ok: false, message: `ffmpeg extract failed: ${detail}` };
  }
  return {
    ok: true,
    durationSeconds: Number((input.endSeconds - input.startSeconds).toFixed(3)),
  };
}

export function restorePortraitIfLandscape(absolutePath: string): {
  ok: true;
} | { ok: false; message: string } {
  const probe = spawnFfprobe(
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      absolutePath,
    ],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) {
    return {
      ok: false,
      message: `Portrait probe failed: ${probe.stderr?.toString().slice(-200) || "ffprobe error"}`,
    };
  }
  const json = probe.stdout?.toString() ?? "";
  const [width, height] = json.trim().split(",").map(Number);
  if (!width || !height || width <= height) return { ok: true };
  const temp = `${absolutePath}.portrait.mp4`;
  const { ffmpeg } = execFileFfmpegArgs();
  const rotated = spawnFfmpeg(
    [
      "-y",
      "-noautorotate",
      "-i",
      absolutePath,
      "-vf",
      "transpose=2",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-ar",
      "48000",
      "-ac",
      "2",
      temp,
    ],
    { stdio: "pipe" },
  );
  if (rotated.status !== 0) {
    return {
      ok: false,
      message: `Portrait restore failed: ${
        rotated.stderr?.toString().slice(-200) || rotated.error?.message || ffmpeg
      }`,
    };
  }
  unlinkSync(absolutePath);
  renameSync(temp, absolutePath);
  return { ok: true };
}
