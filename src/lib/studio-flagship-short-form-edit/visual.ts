import { execFileSync } from "child_process";
import { copyFileSync, mkdirSync } from "fs";
import path from "path";

/** Peak extra scale. 1080 → 1166. */
export const FLAGSHIP_PUNCH_PEAK = 0.08;
export const FLAGSHIP_PUNCH_EASE_SECONDS = 0.5;

/** Cosine ease 0→1, then hold. Frame zero is 1.0. Does not zoom back out. */
export function punchZoomExtra(
  t: number,
  hookSeconds = 2.2,
  riseSeconds = FLAGSHIP_PUNCH_EASE_SECONDS,
): number {
  const hook = Math.max(1.2, Math.min(3.2, hookSeconds));
  const rise = Math.min(riseSeconds, hook / 2);
  if (t <= 0) return 0;
  if (t < rise) return 0.5 - 0.5 * Math.cos((Math.PI * t) / rise);
  return 1;
}

function punchZoomFilter(hookSeconds: number): string {
  const hook = Math.max(1.2, Math.min(3.2, hookSeconds));
  const rise = Math.min(FLAGSHIP_PUNCH_EASE_SECONDS, hook / 2);
  const extra =
    `if(lte(t\\,0)\\,0\\,if(lt(t\\,${rise})\\,0.5-0.5*cos(PI*t/${rise})\\,1))`;
  return `[0:v]scale=w='trunc(iw*(1+${FLAGSHIP_PUNCH_PEAK}*(${extra}))/2)*2':h='trunc(ih*(1+${FLAGSHIP_PUNCH_PEAK}*(${extra}))/2)*2':eval=frame,crop=1080:1920:(in_w-1080)/2:(in_h-1920)/2,format=yuv420p[v]`;
}

/** Subtle hook punch-in. Eases in and holds. Not a zoom in-and-out pulse. */
export function applyHookPunchIn(input: {
  videoAbsolutePath: string;
  outputAbsolutePath: string;
  hookSeconds?: number;
}): { ok: true } | { ok: false; message: string } {
  const hook = Math.max(1.2, Math.min(3.2, input.hookSeconds ?? 2.2));
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.videoAbsolutePath,
        "-filter_complex",
        punchZoomFilter(hook),
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
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch {
    try {
      copyFileSync(input.videoAbsolutePath, input.outputAbsolutePath);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: `Punch-in failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
  return { ok: true };
}
