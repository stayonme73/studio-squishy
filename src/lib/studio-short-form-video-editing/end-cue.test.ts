import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { studioTalkingHeadEndCueV1 } from "@/config/studio-talking-head-end-cue-v1";
import { SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE } from "@/config/studio-short-form-video-editing-build-v1";

import { assembleBurnedShort, exactWords } from "./caption-burn";
import { chooseTalkingHeadEndCue } from "./end-cue";

function measureWindow(abs: string, start: number, seconds: number) {
  const run = spawnSync(
    "ffmpeg",
    [
      "-ss",
      String(start),
      "-t",
      String(seconds),
      "-i",
      abs,
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const text = `${run.stdout}\n${run.stderr}`;
  return {
    mean: Number(/mean_volume:\s+([-\d.]+)/.exec(text)?.[1] ?? NaN),
    max: Number(/max_volume:\s+([-\d.]+)/.exec(text)?.[1] ?? NaN),
  };
}

function probe(abs: string) {
  const json = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-show_entries",
      "stream=width,height,codec_type,sample_rate,channels",
      "-of",
      "json",
      abs,
    ],
    { encoding: "utf8" },
  );
  return JSON.parse(json) as {
    format?: { duration?: string };
    streams?: Array<{
      width?: number;
      height?: number;
      codec_type?: string;
      sample_rate?: string;
      channels?: number;
    }>;
  };
}

function writeTalkingHead(abs: string, seconds: number) {
  const run = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=0x224433:s=1080x1920:d=${seconds}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=220:sample_rate=48000:duration=${seconds},volume=12dB`,
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
      "-shortest",
      abs,
    ],
    { encoding: "utf8" },
  );
  if (run.status !== 0 || !existsSync(abs)) {
    throw new Error(run.stderr?.slice(-300) || "fixture failed");
  }
}

describe("Talking-head end-cue finishing", () => {
  it("picks one of the three approved cues from ending feel, never at random", () => {
    const snap = chooseTalkingHeadEndCue({
      lastSpeechText: "I do not.",
      lastSpeechDurationSeconds: 0.8,
    });
    const whoosh = chooseTalkingHeadEndCue({
      lastSpeechText: "I would rather keep the work quiet and finished.",
      lastSpeechDurationSeconds: 2.8,
    });
    const pop = chooseTalkingHeadEndCue({
      lastSpeechText: "Sell 10 things well than 50 we can barely manage.",
      lastSpeechDurationSeconds: 1.6,
    });
    expect(snap.id).toBe("soft_snap");
    expect(whoosh.id).toBe("airy_whoosh");
    expect(pop.id).toBe("soft_pop_tick");
    expect(snap).toEqual(
      chooseTalkingHeadEndCue({
        lastSpeechText: "I do not.",
        lastSpeechDurationSeconds: 0.8,
      }),
    );
    expect(studioTalkingHeadEndCueV1.noCustomerVisibleRandomness).toBe(true);
    expect(studioTalkingHeadEndCueV1.noMusicBed).toBe(true);
    expect(studioTalkingHeadEndCueV1.doNotApplyToStillsVideo).toBe(true);
    expect(SHORT_VIDEO_STILLS_SKU_DO_NOT_REUSE).toBe("v2-rtu-short-video");
    expect(studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount).toBe(11);
  });

  it("lands the cue at the visual ending without covering speech or changing 1080x1920", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "end-cue-"));
    const source = path.join(dir, "talking-head.mp4");
    const speechSeconds = 3;
    const hold = 2.5;
    writeTalkingHead(source, speechSeconds);
    const hookText = "They think a bigger menu looks";
    const landText = "I do not.";
    const burned = await assembleBurnedShort({
      sourceAbsolutePath: source,
      workDirectory: path.join(dir, "work"),
      outputAbsolutePath: path.join(dir, "finished.mp4"),
      approvedCta: "Book a Studio conversation",
      transcriptWordsInRange: exactWords(`${hookText} ${landText}`),
      edl: {
        ok: true,
        sourceDurationSeconds: speechSeconds,
        outputDurationSeconds: speechSeconds + hold,
        droppedFalseStarts: 0,
        droppedDeadSpaceSeconds: 0,
        selection: "performance_watch",
        clips: [
          {
            role: "hook",
            sourceTrim: 0,
            sourceLength: speechSeconds,
            timelineStart: 0,
            timelineLength: speechSeconds,
            text: `${hookText} ${landText}`,
          },
        ],
        captions: [
          {
            start: 0,
            end: 2.2,
            text: hookText,
            role: "hook",
          },
          {
            start: 2.2,
            end: speechSeconds,
            text: landText,
            role: "speech",
          },
          {
            start: speechSeconds,
            end: speechSeconds + hold,
            text: "Book a Studio conversation",
            role: "cta",
          },
        ],
      },
    });
    expect(burned.ok).toBe(true);
    if (!burned.ok) throw new Error(burned.message);
    expect(burned.endCue.id).toBe("soft_snap");

    const info = probe(burned.outputAbsolutePath);
    const video = info.streams?.find((stream) => stream.codec_type === "video");
    const audio = info.streams?.find((stream) => stream.codec_type === "audio");
    expect(video?.width).toBe(1080);
    expect(video?.height).toBe(1920);
    expect(audio?.codec_type).toBe("audio");
    expect(Number(audio?.sample_rate)).toBe(48000);
    expect(audio?.channels).toBe(2);
    expect(Number(info.format?.duration ?? 0)).toBeGreaterThan(speechSeconds + 1);

    const speech = measureWindow(burned.outputAbsolutePath, 0.2, 2.4);
    const cue = measureWindow(burned.outputAbsolutePath, speechSeconds + 0.9, 0.25);
    const laterCard = measureWindow(burned.outputAbsolutePath, speechSeconds + 1.3, 1.0);
    expect(speech.mean).toBeGreaterThan(-30);
    expect(cue.max).toBeGreaterThan(-40);
    expect(cue.max).toBeLessThan(speech.max);
    expect(laterCard.mean).toBeLessThan(cue.mean);

    const decision = JSON.parse(
      readFileSync(path.join(dir, "work", "end-cue.json"), "utf8"),
    ) as { id: string; noMusicBed: boolean };
    expect(decision.id).toBe("soft_snap");
    expect(decision.noMusicBed).toBe(true);
  }, 60_000);
});
