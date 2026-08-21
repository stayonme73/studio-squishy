import { mkdirSync } from "fs";
import { spawnSync } from "child_process";
import path from "path";

export type ExtractedVideoFrame = {
  id: string;
  seconds: number;
  absolutePath: string;
  role: string;
  beat: number;
};

export function extractVideoFrame(input: {
  videoAbs: string;
  destAbs: string;
  seconds: number;
}): { ok: true } | { ok: false; message: string } {
  mkdirSync(path.dirname(input.destAbs), { recursive: true });
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      input.seconds.toFixed(3),
      "-i",
      input.videoAbs,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      input.destAbs,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    return {
      ok: false,
      message: (result.stderr || result.stdout || "ffmpeg frame extract failed").slice(
        0,
        400,
      ),
    };
  }
  return { ok: true };
}
