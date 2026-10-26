import { execFileSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";
import { inspectFlagshipRender } from "@/lib/studio-flagship-short-form-edit/inspect";
import { paintExactCtaCard } from "@/lib/studio-short-form-video-editing/caption-burn";

export async function replacePackCtaCard(input: {
  repoRoot: string;
  videoAbsolutePath: string;
  outputAbsolutePath: string;
  workDirectory: string;
  nextCtaText: string;
}): Promise<
  | { ok: true; inspect: ReturnType<typeof inspectFlagshipRender> }
  | { ok: false; message: string }
> {
  if (!existsSync(input.videoAbsolutePath)) {
    return { ok: false, message: "Pack video missing for CTA revision." };
  }
  mkdirSync(input.workDirectory, { recursive: true });
  const hold = studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
  let duration = 0;
  try {
    duration = Number(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=nw=1:nk=1",
          input.videoAbsolutePath,
        ],
        { encoding: "utf8" },
      ).trim(),
    );
  } catch (error) {
    return {
      ok: false,
      message: `Could not probe pack video: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  const speechEnd = Math.max(1, duration - hold);
  const ctaPng = path.join(input.workDirectory, "cta-card.png");
  const painted = await paintExactCtaCard({
    text: input.nextCtaText,
    outputAbsolutePath: ctaPng,
    width: 1080,
    height: 1920,
    fontSize: 48,
    fill: pack.visual.ctaFill,
    background: pack.visual.ctaBackground,
  });
  if (!painted.ok) return painted;
  const card = path.join(input.workDirectory, "end-card.mp4");
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-loop",
        "1",
        "-i",
        ctaPng,
        "-f",
        "lavfi",
        "-i",
        `anullsrc=r=48000:cl=stereo:d=${hold}`,
        "-t",
        String(hold),
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
        card,
      ],
      { stdio: "pipe" },
    );
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.videoAbsolutePath,
        "-i",
        card,
        "-filter_complex",
        `[0:v]trim=0:${speechEnd.toFixed(3)},setpts=PTS-STARTPTS[v0];[1:v]setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[v]`,
        "-map",
        "[v]",
        "-map",
        "0:a",
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
        "-t",
        duration.toFixed(3),
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Set CTA revision failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return {
    ok: true,
    inspect: inspectFlagshipRender({
      repoRoot: input.repoRoot,
      videoAbsolutePath: input.outputAbsolutePath,
      workDirectory: path.join(input.workDirectory, "watch"),
    }),
  };
}
