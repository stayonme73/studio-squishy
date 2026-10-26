/**
 * B-roll: customer-supplied rights-cleared, or Studio Pexels catalog.
 * Decorative inserts without a spoken-story match are refused.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

export type FlagshipBrollAsset = {
  absolutePath: string;
  rightsCleared: boolean;
  customerOwnsOrHasPermission: boolean;
  studioLicensed?: boolean;
  source?: "customer" | "studio_pexels";
  mediaKind?: "still" | "video";
  supportsSpokenIdea: string;
};

export function evaluateFlagshipBroll(input: {
  asset: FlagshipBrollAsset | null;
  spokenIdea: string;
  allowDecorative?: boolean;
}):
  | { ok: true; use: false; reason: string }
  | { ok: true; use: true; asset: FlagshipBrollAsset }
  | { ok: false; message: string } {
  if (!input.asset) {
    return { ok: true, use: false, reason: "No B-roll supplied. Talking-head stays." };
  }
  const licensed =
    input.asset.customerOwnsOrHasPermission || input.asset.studioLicensed === true;
  if (!input.asset.rightsCleared || !licensed) {
    return {
      ok: false,
      message: "B-roll is not rights-cleared. Do not insert it.",
    };
  }
  if (!existsSync(input.asset.absolutePath)) {
    return { ok: false, message: "B-roll file is missing." };
  }
  const idea = input.spokenIdea.toLowerCase();
  const support = input.asset.supportsSpokenIdea.toLowerCase().trim();
  if (!support) {
    return { ok: false, message: "B-roll must name the spoken idea it supports." };
  }
  const matched = support
    .split(/[\s,/]+/)
    .filter((token) => token.length > 3)
    .some((token) => idea.includes(token));
  if (!matched && !input.allowDecorative) {
    return {
      ok: true,
      use: false,
      reason: "B-roll does not support the spoken story. Not inserted.",
    };
  }
  return { ok: true, use: true, asset: input.asset };
}

export function cutFlagshipRange(input: {
  sourceAbsolutePath: string;
  outputAbsolutePath: string;
  startSeconds: number;
  durationSeconds: number;
}): { ok: true } | { ok: false; message: string } {
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(input.startSeconds),
        "-i",
        input.sourceAbsolutePath,
        "-t",
        String(input.durationSeconds),
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
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Range cut failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return { ok: true };
}

function isStillPath(filePath: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(filePath);
}

export type FlagshipBrollTreatment = "picture_in_picture" | "short_fullframe";

/** Lower than chin. Above captions. Same 520×360 size. */
export const FLAGSHIP_PIP_TOP = 1320;

export function chooseFlagshipBrollTreatment(asset: FlagshipBrollAsset): FlagshipBrollTreatment {
  const story = `${asset.supportsSpokenIdea} ${asset.absolutePath}`.toLowerCase();
  if (asset.mediaKind === "still") return "picture_in_picture";
  if (/cherry|close-up|closeup|dictionary|flashcard/.test(story)) {
    return "picture_in_picture";
  }
  return "short_fullframe";
}

function brollFilter(
  treatment: FlagshipBrollTreatment,
  startSeconds: number,
  endSeconds: number,
): string {
  const window = `enable='between(t,${startSeconds.toFixed(2)},${endSeconds.toFixed(2)})'`;
  if (treatment === "picture_in_picture") {
    return [
      `[1:v]scale=520:360:force_original_aspect_ratio=increase,crop=520:360,format=yuv420p[br]`,
      `[0:v][br]overlay=W-w-36:${FLAGSHIP_PIP_TOP}:${window}[v]`,
    ].join(";");
  }
  return [
    `[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p[br]`,
    `[0:v][br]overlay=0:0:${window}[v]`,
  ].join(";");
}

export function overlayFlagshipBroll(input: {
  videoAbsolutePath: string;
  brollAbsolutePath: string;
  outputAbsolutePath: string;
  startSeconds: number;
  endSeconds: number;
  treatment?: FlagshipBrollTreatment;
  mediaKind?: FlagshipBrollAsset["mediaKind"];
}): { ok: true; treatment: FlagshipBrollTreatment } | { ok: false; message: string } {
  if (input.endSeconds <= input.startSeconds + 0.4) {
    return { ok: false, message: "B-roll window is too short." };
  }
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const still = isStillPath(input.brollAbsolutePath);
  const treatment =
    input.treatment ??
    chooseFlagshipBrollTreatment({
      absolutePath: input.brollAbsolutePath,
      rightsCleared: true,
      customerOwnsOrHasPermission: true,
      mediaKind: input.mediaKind ?? (still ? "still" : "video"),
      supportsSpokenIdea: path.basename(input.brollAbsolutePath),
    });
  const brollInput = still
    ? ["-loop", "1", "-i", input.brollAbsolutePath]
    : ["-stream_loop", "-1", "-i", input.brollAbsolutePath];
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.videoAbsolutePath,
        ...brollInput,
        "-filter_complex",
        brollFilter(treatment, input.startSeconds, input.endSeconds),
        "-map",
        "[v]",
        "-map",
        "0:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        "-shortest",
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `B-roll overlay failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return { ok: true, treatment };
}
