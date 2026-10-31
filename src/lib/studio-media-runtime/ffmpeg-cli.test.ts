import { existsSync } from "fs";
import { describe, expect, it } from "vitest";

import {
  resolveFfmpegExecutable,
  resolveFfprobeExecutable,
  spawnFfmpeg,
} from "./ffmpeg-cli";

describe("studio-media-runtime ffmpeg-cli", () => {
  it("resolves bundled or PATH ffmpeg and runs -version", () => {
    const ffmpeg = resolveFfmpegExecutable();
    expect(ffmpeg.length).toBeGreaterThan(0);
    expect(existsSync(ffmpeg) || ffmpeg === "ffmpeg").toBe(true);
    const run = spawnFfmpeg(["-version"], { encoding: "utf8" });
    expect(run.status).toBe(0);
    expect(String(run.stdout ?? run.stderr)).toMatch(/ffmpeg version/i);
  });

  it("resolves ffprobe", () => {
    const ffprobe = resolveFfprobeExecutable();
    expect(ffprobe.length).toBeGreaterThan(0);
  });
});
