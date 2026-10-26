/**
 * Native-vertical customer-style source that is NOT the Cherries cert cut.
 * Uses the same Wikitongues Daniel recording as a continuous 165s take,
 * not the Cherries certification concat.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { LIVE_PROOF_SOURCE_META } from "@/lib/studio-short-form-video-editing/source-prep";

export const FLAGSHIP_SOURCE_REL =
  "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/source/customer-style-talking-head.mp4" as const;

export const FLAGSHIP_SOURCE_META = {
  ...LIVE_PROOF_SOURCE_META,
  keepFirstSeconds: 165,
  excludeCherriesCertCut: true,
  note:
    "Continuous first 165 seconds of the phone recording. Not the Cherries cert concat (0-45 + 15-35 + 80-165). Editorial may still choose cherries if that is the strongest spoken idea.",
  customerCta: "Start at thestudiocompany7.com",
} as const;

export function prepareFlagshipCustomerStyleSource(input: {
  repoRoot: string;
}):
  | { ok: true; absolutePath: string; relativePath: string }
  | { ok: false; message: string } {
  const rawWebm = path.join(
    input.repoRoot,
    "docs/launch/studio-operating-short-form-video-editing-build-1/live-proof/source-raw.webm",
  );
  if (!existsSync(rawWebm)) {
    return {
      ok: false,
      message:
        "Raw Wikitongues webm missing. Restore the $349 live-proof source-raw.webm first.",
    };
  }
  const relativePath = FLAGSHIP_SOURCE_REL;
  const absolutePath = path.join(input.repoRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  const identityPath = path.join(path.dirname(absolutePath), "source-identity.json");
  const identity = {
    title: FLAGSHIP_SOURCE_META.title,
    license: FLAGSHIP_SOURCE_META.license,
    page: FLAGSHIP_SOURCE_META.sourcePage,
    keepFirstSeconds: FLAGSHIP_SOURCE_META.keepFirstSeconds,
    excludeCherriesCertCut: true,
    nativeVertical: true,
  };
  if (existsSync(absolutePath) && existsSync(identityPath)) {
    try {
      const current = JSON.parse(readFileSync(identityPath, "utf8")) as {
        keepFirstSeconds?: number;
      };
      if (current.keepFirstSeconds === FLAGSHIP_SOURCE_META.keepFirstSeconds) {
        return { ok: true, absolutePath, relativePath };
      }
    } catch {
      /* rebuild */
    }
  }
  const scale =
    "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1";
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        rawWebm,
        "-t",
        String(FLAGSHIP_SOURCE_META.keepFirstSeconds),
        "-vf",
        scale,
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
        absolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Flagship source prep failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  writeFileSync(identityPath, `${JSON.stringify(identity, null, 2)}\n`);
  return { ok: true, absolutePath, relativePath };
}
