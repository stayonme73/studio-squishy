/**
 * Cut one window from the long Owner source and display it as native vertical.
 * Applies existing rotation 90. Does not reframe, crop, or follow a face.
 */

import { execFileSync } from "child_process";
import { mkdirSync, renameSync, unlinkSync } from "fs";
import path from "path";

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
  try {
    execFileSync(
      "ffmpeg",
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
  } catch (error) {
    return {
      ok: false,
      message: `ffmpeg extract failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return {
    ok: true,
    durationSeconds: Number((input.endSeconds - input.startSeconds).toFixed(3)),
  };
}

export function restorePortraitIfLandscape(absolutePath: string): {
  ok: true;
} | { ok: false; message: string } {
  const json = execFileSync(
    "ffprobe",
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
  const [width, height] = json.trim().split(",").map(Number);
  if (!width || !height || width <= height) return { ok: true };
  const temp = `${absolutePath}.portrait.mp4`;
  try {
    execFileSync(
      "ffmpeg",
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
    unlinkSync(absolutePath);
    renameSync(temp, absolutePath);
  } catch (error) {
    return {
      ok: false,
      message: `Portrait restore failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return { ok: true };
}
