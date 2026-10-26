/**
 * Narrow remaster: punch the picture, then burn stable opening captions.
 * Keeps Owner audio, Visit CTA tail, B-roll, music, and clip boundaries.
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";

import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import { applyHookPunchIn } from "@/lib/studio-flagship-short-form-edit/visual";

import { stabilizeOpeningCaptionPresentation } from "@/lib/studio-short-form-video-editing/caption-burn";
import type { TimedCaption } from "@/lib/studio-short-form-video-editing/types";

function probeDuration(file: string): number {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { encoding: "utf8" },
    ).trim(),
  );
}

function assTimeToSeconds(stamp: string): number {
  const match = stamp.match(/(\d+):(\d+):(\d+)\.(\d+)/);
  if (!match) return 0;
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4].padEnd(2, "0").slice(0, 2)) / 100
  );
}

export function parseAssSpeechCaptions(ass: string): TimedCaption[] {
  return ass
    .split(/\r?\n/)
    .filter((line) => line.startsWith("Dialogue:"))
    .map((line) => {
      const parts = line.split(",");
      return {
        start: assTimeToSeconds(parts[1] ?? "0:00:00.00"),
        end: assTimeToSeconds(parts[2] ?? "0:00:00.00"),
        role: "speech" as const,
        text: parts.slice(9).join(","),
      };
    });
}

export function remasterOpeningCaptionPresentation(input: {
  pictureAbsolutePath: string;
  assAbsolutePath: string;
  captionDirectory: string;
  ownerRevisedAbsolutePath: string;
  outputAbsolutePath: string;
  workDirectory: string;
}): { ok: true; speechEndSeconds: number } | { ok: false; message: string } {
  if (!existsSync(input.pictureAbsolutePath)) {
    return { ok: false, message: `Picture missing: ${input.pictureAbsolutePath}` };
  }
  if (!existsSync(input.ownerRevisedAbsolutePath)) {
    return { ok: false, message: "Owner revised MP4 missing." };
  }
  mkdirSync(input.workDirectory, { recursive: true });
  const punched = path.join(input.workDirectory, "punched-picture.mp4");
  const punch = applyHookPunchIn({
    videoAbsolutePath: input.pictureAbsolutePath,
    outputAbsolutePath: punched,
    hookSeconds: 2.2,
  });
  if (!punch.ok) return punch;
  const captions = stabilizeOpeningCaptionPresentation(
    parseAssSpeechCaptions(readFileSync(input.assAbsolutePath, "utf8")),
  );
  const overlayInputs: string[] = [];
  let filter = "";
  let last = "0:v";
  for (const [index, caption] of captions.entries()) {
    const png = path.join(input.captionDirectory, `cap-${index}.png`);
    if (!existsSync(png)) {
      return { ok: false, message: `Caption sprite missing: ${png}` };
    }
    overlayInputs.push("-i", png);
    const next = index === captions.length - 1 ? "vout" : `v${index + 1}`;
    filter += `[${last}][${index + 1}:v]overlay=0:H-h-72:enable='between(t,${caption.start},${caption.end})'[${next}];`;
    last = next;
  }
  if (!captions.length) {
    return { ok: false, message: "No speech captions to remaster." };
  }
  const captioned = path.join(input.workDirectory, "captioned.mp4");
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        punched,
        ...overlayInputs,
        "-filter_complex",
        filter.slice(0, -1),
        "-map",
        "[vout]",
        "-map",
        "0:a",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "copy",
        captioned,
      ],
      { stdio: "pipe" },
    );
    const hold = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
    const ownerDuration = probeDuration(input.ownerRevisedAbsolutePath);
    const speechEnd = Math.max(1, ownerDuration - hold);
    mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        captioned,
        "-i",
        input.ownerRevisedAbsolutePath,
        "-filter_complex",
        `[0:v]trim=0:${speechEnd.toFixed(3)},setpts=PTS-STARTPTS[v0];[1:v]trim=start=${speechEnd.toFixed(3)},setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[v]`,
        "-map",
        "[v]",
        "-map",
        "1:a",
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
    return { ok: true, speechEndSeconds: speechEnd };
  } catch (error) {
    return {
      ok: false,
      message: `Opening-caption remaster failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
