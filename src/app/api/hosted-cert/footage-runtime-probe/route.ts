import { NextResponse } from "next/server";

import { diagnoseHostedFfmpegRuntime } from "@/lib/studio-media-runtime/diagnose-ffmpeg";
import { readShotstackApiKey } from "@/lib/studio-kitchen-production/video-integration/config";
import { resolveCaptionBoldFontPath } from "@/lib/studio-short-form-video-editing/caption-burn";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Preview-only — FFmpeg/FFprobe availability + synthetic volumedetect (not customer footage). */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ffmpeg = diagnoseHostedFfmpegRuntime();
  const deepgramConfigured = Boolean(process.env.DEEPGRAM_API_KEY?.trim());
  let shotstackConfigured = false;
  try {
    shotstackConfigured = Boolean(readShotstackApiKey()?.trim());
  } catch {
    shotstackConfigured = false;
  }

  let captionBoldFontPath: string | null = null;
  try {
    captionBoldFontPath = resolveCaptionBoldFontPath();
  } catch {
    captionBoldFontPath = null;
  }

  return NextResponse.json({
    ffmpeg,
    caption: {
      boldFontPath: captionBoldFontPath,
      boldFontExists: captionBoldFontPath ? existsSync(captionBoldFontPath) : false,
    },
    downstream: {
      deepgramApiKeyConfigured: deepgramConfigured,
      shotstackApiKeyConfigured: shotstackConfigured,
    },
  });
}
