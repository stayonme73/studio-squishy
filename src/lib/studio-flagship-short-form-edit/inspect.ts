import { execFileSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

export type FlagshipWatchInspect = {
  durationSeconds: number;
  width: number;
  height: number;
  hasAudio: boolean;
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
  frameRelativePaths: string[];
  soundOffFirst: true;
  notes: string[];
};

export function inspectFlagshipRender(input: {
  repoRoot: string;
  videoAbsolutePath: string;
  workDirectory: string;
}): FlagshipWatchInspect {
  mkdirSync(input.workDirectory, { recursive: true });
  const probe = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-show_entries",
      "stream=codec_type,width,height",
      "-of",
      "json",
      input.videoAbsolutePath,
    ],
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(probe) as {
    streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
    format?: { duration?: string };
  };
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  const hasAudio = Boolean(
    parsed.streams?.some((stream) => stream.codec_type === "audio"),
  );
  let meanVolumeDb: number | null = null;
  let maxVolumeDb: number | null = null;
  try {
    const vol = execFileSync(
      "ffmpeg",
      ["-i", input.videoAbsolutePath, "-af", "volumedetect", "-f", "null", "-"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const text = `${vol}`;
    const mean = text.match(/mean_volume:\s*(-?[\d.]+)/);
    const max = text.match(/max_volume:\s*(-?[\d.]+)/);
    if (mean) meanVolumeDb = Number(mean[1]);
    if (max) maxVolumeDb = Number(max[1]);
  } catch (error) {
    const text = error instanceof Error ? `${error}` : "";
    const mean = text.match(/mean_volume:\s*(-?[\d.]+)/);
    const max = text.match(/max_volume:\s*(-?[\d.]+)/);
    if (mean) meanVolumeDb = Number(mean[1]);
    if (max) maxVolumeDb = Number(max[1]);
  }

  const stamps = [0.4, 2.2, 5.6, 6.5, 14, 16.9, 18.2];
  const frameRelativePaths: string[] = [];
  for (const [index, stamp] of stamps.entries()) {
    const fileName = `watch-${index + 1}-${String(stamp).replace(".", "p")}.png`;
    const abs = path.join(input.workDirectory, fileName);
    try {
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-ss",
          String(stamp),
          "-i",
          input.videoAbsolutePath,
          "-frames:v",
          "1",
          abs,
        ],
        { stdio: "pipe" },
      );
      frameRelativePaths.push(path.relative(input.repoRoot, abs).replace(/\\/g, "/"));
    } catch {
      /* keep going */
    }
  }

  const notes: string[] = [
    "Sound-off first: captions and ending must read without audio.",
    "Sound-on second: speech must stay above the bed. Music must not own the mix.",
  ];
  const inspect: FlagshipWatchInspect = {
    durationSeconds: Number(parsed.format?.duration ?? 0),
    width: video?.width ?? 0,
    height: video?.height ?? 0,
    hasAudio,
    meanVolumeDb,
    maxVolumeDb,
    frameRelativePaths,
    soundOffFirst: true,
    notes,
  };
  writeFileSync(
    path.join(input.workDirectory, "watch-inspect.json"),
    `${JSON.stringify(inspect, null, 2)}\n`,
  );
  return inspect;
}
