import { spawnSync } from "child_process";

import { probeMp4WithFfprobe } from "@/lib/studio-kitchen-production/video-operational/bind-export";

import type { FootageProbe } from "./types";

export function probeFootageSource(absolutePath: string): FootageProbe | { error: string } {
  const basic = probeMp4WithFfprobe(absolutePath);
  if ("error" in basic) return basic;
  const volume = spawnSync(
    "ffmpeg",
    ["-i", absolutePath, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = `${volume.stdout ?? ""}\n${volume.stderr ?? ""}`;
  const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
  return {
    durationSeconds: basic.durationSeconds,
    width: basic.width,
    height: basic.height,
    hasAudio: basic.hasAudio,
    meanVolumeDb: mean ? Number(mean[1]) : undefined,
    maxVolumeDb: max ? Number(max[1]) : undefined,
  };
}
