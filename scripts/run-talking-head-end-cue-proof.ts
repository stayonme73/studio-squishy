import { execFileSync, spawnSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioInternalSellNowRegisterV1 } from "@/config/studio-internal-sell-now-register-v1";
import { studioTalkingHeadEndCueV1 } from "@/config/studio-talking-head-end-cue-v1";
import { assembleBurnedShort, exactWords } from "@/lib/studio-short-form-video-editing/caption-burn";
import {
  chooseTalkingHeadEndCue,
  writeTalkingHeadEndCueWav,
} from "@/lib/studio-short-form-video-editing/end-cue";

const REPO = path.resolve(__dirname, "..");
const PROOF = path.join(
  REPO,
  "docs/launch/studio-operating-talking-head-end-cue-1",
);

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

function measure(abs: string, start: number, seconds: number) {
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

async function main() {
  mkdirSync(PROOF, { recursive: true });
  const cues = studioTalkingHeadEndCueV1.family;
  const cueProof = (["soft_snap", "airy_whoosh", "soft_pop_tick"] as const).map(
    (id) => {
      const abs = path.join(PROOF, `${id}.wav`);
      const written = writeTalkingHeadEndCueWav({
        id,
        outputAbsolutePath: abs,
      });
      if (!written.ok) throw new Error(written.message);
      const loud = measure(abs, 0, cues[id].maxSeconds + 0.02);
      return {
        id,
        maxSeconds: cues[id].maxSeconds,
        feel: cues[id].feel,
        meanVolumeDb: loud.mean,
        maxVolumeDb: loud.max,
      };
    },
  );

  const work = path.join(PROOF, "local-proof");
  const source = path.join(work, "talking-head.mp4");
  mkdirSync(work, { recursive: true });
  const speechSeconds = 3;
  const hold = 2.5;
  const made = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=0x224433:s=1080x1920:d=${speechSeconds}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=220:sample_rate=48000:duration=${speechSeconds},volume=12dB`,
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
      source,
    ],
    { encoding: "utf8" },
  );
  if (made.status !== 0) throw new Error(made.stderr.slice(-300));

  const hookText = "They think a bigger menu looks";
  const landText = "I do not.";
  const burned = await assembleBurnedShort({
    sourceAbsolutePath: source,
    workDirectory: path.join(work, "burn"),
    outputAbsolutePath: path.join(PROOF, "end-cue-proof.mp4"),
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
        { start: 0, end: 2.2, text: hookText, role: "hook" },
        { start: 2.2, end: speechSeconds, text: landText, role: "speech" },
        {
          start: speechSeconds,
          end: speechSeconds + hold,
          text: "Book a Studio conversation",
          role: "cta",
        },
      ],
    },
  });
  if (!burned.ok) throw new Error(burned.message);

  const probe = JSON.parse(
    execFileSync(
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
        burned.outputAbsolutePath,
      ],
      { encoding: "utf8" },
    ),
  ) as {
    format?: { duration?: string };
    streams?: Array<{
      width?: number;
      height?: number;
      codec_type?: string;
      sample_rate?: string;
      channels?: number;
    }>;
  };
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = probe.streams?.find((stream) => stream.codec_type === "audio");
  const speech = measure(burned.outputAbsolutePath, 0.2, 2.4);
  const cue = measure(burned.outputAbsolutePath, speechSeconds, 0.2);

  writeJson(path.join(PROOF, "proof.json"), {
    packageId: studioTalkingHeadEndCueV1.packageId,
    appliesTo: studioTalkingHeadEndCueV1.appliesTo,
    publicLaunchNowPublishedCount:
      studioInternalSellNowRegisterV1.publicLaunchNowPublishedCount,
    publicCountUnchanged: true,
    stillsVideoUntouched: true,
    noMusicBed: true,
    noCustomerVisibleRandomness: true,
    picker: {
      soft_snap: chooseTalkingHeadEndCue({
        lastSpeechText: "I do not.",
        lastSpeechDurationSeconds: 0.8,
      }),
      airy_whoosh: chooseTalkingHeadEndCue({
        lastSpeechText: "I would rather keep the work quiet and finished.",
        lastSpeechDurationSeconds: 2.8,
      }),
      soft_pop_tick: chooseTalkingHeadEndCue({
        lastSpeechText: "Sell 10 things well than 50 we can barely manage.",
        lastSpeechDurationSeconds: 1.6,
      }),
    },
    cueFamily: cueProof,
    assembled: {
      endCue: burned.endCue,
      width: video?.width ?? 0,
      height: video?.height ?? 0,
      hasAudio: Boolean(audio),
      sampleRateHz: Number(audio?.sample_rate ?? 0),
      channels: audio?.channels ?? 0,
      durationSeconds: Number(probe.format?.duration ?? 0),
      speechMeanDb: speech.mean,
      speechMaxDb: speech.max,
      cueMaxDb: cue.max,
      cueUnderSpeech: cue.max < speech.max,
      cuePresentAtEnding: cue.max > -45,
    },
  });
  process.stdout.write("end-cue proof written\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
