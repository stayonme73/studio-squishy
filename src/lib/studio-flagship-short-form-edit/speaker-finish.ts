/**
 * Ordinary-speaker finish for the $349 flagship proof.
 * Does not change the shared talking-head end-cue package used by other lanes.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

export function writeFlagshipSpeakerEndCue(outputAbsolutePath: string):
  | { ok: true }
  | { ok: false; message: string } {
  mkdirSync(path.dirname(outputAbsolutePath), { recursive: true });
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "aevalsrc='0.58*sin(2*PI*1380*t)*exp(-t*12)+0.22*sin(2*PI*690*t)*exp(-t*8)':s=48000:d=0.28",
        "-ac",
        "2",
        "-ar",
        "48000",
        "-c:a",
        "pcm_s16le",
        outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Speaker end cue failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return existsSync(outputAbsolutePath)
    ? { ok: true }
    : { ok: false, message: "Speaker end cue missing." };
}

export function landFlagshipSpeakerEndCue(input: {
  videoAbsolutePath: string;
  cueAbsolutePath: string;
  outputAbsolutePath: string;
  atSeconds: number;
}): { ok: true } | { ok: false; message: string } {
  if (!existsSync(input.videoAbsolutePath) || !existsSync(input.cueAbsolutePath)) {
    return { ok: false, message: "Speaker end-cue inputs missing." };
  }
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const delayMs = Math.max(0, Math.round(input.atSeconds * 1000));
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.videoAbsolutePath,
        "-i",
        input.cueAbsolutePath,
        "-filter_complex",
        `[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${delayMs}|${delayMs}[cue];[0:a][cue]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`,
        "-map",
        "0:v",
        "-map",
        "[a]",
        "-c:v",
        "copy",
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
      message: `Speaker end-cue land failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return { ok: true };
}
