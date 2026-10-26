/**
 * Shared pack ending: music holds through last speech and fades on the CTA.
 * End cue is optional and decided from the finished fade, not from B-roll.
 */
import { execFileSync, spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";

import {
  FLAGSHIP_UPBEAT_BED_REL,
  planFlagshipMusicFade,
  planFlagshipMusicGain,
  measureAudioVolume,
  leadingMusicSilenceSeconds,
} from "@/lib/studio-flagship-short-form-edit/music";
import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";

function measureWindowMaxDb(file: string, startSeconds: number, windowSeconds: number): number {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-ss",
      startSeconds.toFixed(3),
      "-t",
      windowSeconds.toFixed(3),
      "-i",
      file,
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const match = `${result.stdout}\n${result.stderr}`.match(/max_volume:\s+([-\d.]+)/);
  return match ? Number(match[1]) : -120;
}

export function pickBrightestCueOffset(file: string, windowSeconds: number): number {
  const duration = probeDuration(file);
  const last = Math.max(0, duration - windowSeconds);
  let bestAt = 0;
  let bestMax = -120;
  for (let t = 0; t <= last + 0.0001; t += 0.04) {
    const maxDb = measureWindowMaxDb(file, t, windowSeconds);
    if (maxDb > bestMax) {
      bestMax = maxDb;
      bestAt = t;
    }
  }
  return bestAt;
}

function writePackSubtleEndCueWav(input: {
  stingAbsolutePath: string;
  outputAbsolutePath: string;
}): { ok: true; cueOffsetSeconds: number } | { ok: false; message: string } {
  if (!existsSync(input.stingAbsolutePath)) {
    return { ok: false, message: `Dedicated end sting missing: ${input.stingAbsolutePath}` };
  }
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const window = pack.endingAudio.subtleCueDurationSeconds;
  const offset = pickBrightestCueOffset(input.stingAbsolutePath, window);
  const fadeOutStart = Math.max(0.05, window - 0.04);
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        offset.toFixed(3),
        "-t",
        window.toFixed(3),
        "-i",
        input.stingAbsolutePath,
        "-af",
        `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,afade=t=in:st=0:d=0.006,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=0.04`,
        "-ac",
        "2",
        "-ar",
        "48000",
        "-c:a",
        "pcm_s16le",
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Pack end cue cut failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  if (!existsSync(input.outputAbsolutePath)) {
    return { ok: false, message: "Pack end cue wav missing." };
  }
  return { ok: true, cueOffsetSeconds: offset };
}

export function measureCtaOnsetSeconds(videoAbsolutePath: string): number | null {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-i",
      videoAbsolutePath,
      "-filter:v",
      "select='gt(scene,0.25)',showinfo",
      "-an",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const times = [...`${result.stdout}\n${result.stderr}`.matchAll(/pts_time:([0-9.]+)/g)].map((m) =>
    Number(m[1]),
  );
  const duration = probeDuration(videoAbsolutePath);
  const afterMid = times.filter((t) => t >= duration * 0.45);
  if (afterMid.length === 0) return null;
  return afterMid[afterMid.length - 1] ?? null;
}

export function measureLastSpeechEndSeconds(speechAudioAbsolutePath: string): number | null {
  if (!existsSync(speechAudioAbsolutePath)) return null;
  const duration = probeDuration(speechAudioAbsolutePath);
  const window = 0.08;
  let lastVoice = 0;
  for (let t = Math.max(0, duration - 1.4); t < duration; t += 0.04) {
    const maxDb = measureWindowMaxDb(speechAudioAbsolutePath, t, window);
    if (maxDb > -22) lastVoice = t + window;
  }
  return lastVoice > 0 ? Math.min(duration, lastVoice) : duration;
}

export function planPackCueAtSeconds(speechEndSeconds: number): number {
  return speechEndSeconds + pack.endingAudio.subtleCueAfterSpeechSeconds;
}

export type PackEndingTreatment = "fade_only" | "fade_plus_subtle_cue";

export function decidePackEndingTreatment(input: {
  fadeMeanDb: number | null;
}): { treatment: PackEndingTreatment; reason: string } {
  const fadeMeanDb = input.fadeMeanDb;
  if (fadeMeanDb != null && fadeMeanDb <= pack.endingAudio.emptyFadeMeanDb) {
    return {
      treatment: "fade_plus_subtle_cue",
      reason: "Finished fade leaves the ending empty. Subtle punctuation.",
    };
  }
  return {
    treatment: "fade_only",
    reason: "Music fade already lands. No end cue.",
  };
}

export function measureCtaFadeMeanDb(input: {
  videoAbsolutePath: string;
  speechEndSeconds: number;
}): number | null {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-ss",
      input.speechEndSeconds.toFixed(3),
      "-t",
      "0.7",
      "-i",
      input.videoAbsolutePath,
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const match = `${result.stdout}\n${result.stderr}`.match(/mean_volume:\s+([-\d.]+)/);
  return match ? Number(match[1]) : null;
}

function probeDuration(file: string): number {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { encoding: "utf8" },
    ).trim(),
  );
}

export function finishPackEndingAudio(input: {
  videoAbsolutePath: string;
  speechAudioAbsolutePath: string;
  musicAbsolutePath: string;
  outputAbsolutePath: string;
  workDirectory: string;
  speechEndSeconds: number;
  totalDurationSeconds: number;
  useCue?: boolean;
  cueMixDb?: number;
  stingAbsolutePath?: string;
}):
  | {
      ok: true;
      cueAtSeconds: number;
      usedCue: boolean;
      cueOffsetSeconds: number | null;
      ctaOnsetSeconds: number;
      speechEndSeconds: number;
    }
  | { ok: false; message: string } {
  if (!existsSync(input.videoAbsolutePath) || !existsSync(input.speechAudioAbsolutePath)) {
    return { ok: false, message: "Ending-audio inputs missing." };
  }
  if (!existsSync(input.musicAbsolutePath)) {
    return { ok: false, message: `Music bed missing: ${input.musicAbsolutePath}` };
  }
  mkdirSync(input.workDirectory, { recursive: true });
  const ctaOnsetSeconds =
    measureCtaOnsetSeconds(input.videoAbsolutePath) ?? input.speechEndSeconds;
  const measuredSpeechEnd =
    measureLastSpeechEndSeconds(input.speechAudioAbsolutePath) ?? input.speechEndSeconds;
  const fade = planFlagshipMusicFade(ctaOnsetSeconds);
  const cueAtSeconds = planPackCueAtSeconds(measuredSpeechEnd);
  const bedVolume = measureAudioVolume(input.musicAbsolutePath);
  if (bedVolume.meanVolumeDb == null) {
    return { ok: false, message: "Could not measure the music bed." };
  }
  const gain = planFlagshipMusicGain(bedVolume.meanVolumeDb);
  const useCue = input.useCue === true;
  const cueWav = path.join(input.workDirectory, "end-cue.wav");
  let cueOffsetSeconds: number | null = null;
  if (useCue) {
    const sting = input.stingAbsolutePath;
    if (!sting) {
      return { ok: false, message: "Dedicated end sting path missing." };
    }
    const cue = writePackSubtleEndCueWav({
      stingAbsolutePath: sting,
      outputAbsolutePath: cueWav,
    });
    if (!cue.ok) return cue;
    cueOffsetSeconds = cue.cueOffsetSeconds;
  }
  const skip = leadingMusicSilenceSeconds(input.musicAbsolutePath);
  const cueDelayMs = Math.max(0, Math.round(cueAtSeconds * 1000));
  const cueDb = input.cueMixDb ?? pack.endingAudio.subtleCueMixDb;
  const cueInputs = useCue ? ["-i", cueWav] : [];
  const cueFilter = useCue
    ? `[3:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${cueDelayMs}|${cueDelayMs},volume=${cueDb}dB[cue];[speech][bed][cue]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.97[a]`
    : `[speech][bed]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.97[a]`;
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.videoAbsolutePath,
        "-i",
        input.speechAudioAbsolutePath,
        "-stream_loop",
        "-1",
        "-ss",
        skip.toFixed(3),
        "-i",
        input.musicAbsolutePath,
        ...cueInputs,
        "-filter_complex",
        [
          `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,apad=pad_dur=8[speech]`,
          `[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=0:${input.totalDurationSeconds.toFixed(2)},asetpts=PTS-STARTPTS,volume=${gain.toFixed(3)},afade=t=in:st=0:d=0.25,afade=t=out:st=${fade.fadeOutStartSeconds.toFixed(2)}:d=${fade.fadeOutDurationSeconds.toFixed(2)}[bed]`,
          cueFilter,
        ].join(";"),
        "-map",
        "0:v",
        "-map",
        "[a]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-t",
        input.totalDurationSeconds.toFixed(3),
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Ending-audio finish failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return {
    ok: true,
    cueAtSeconds,
    usedCue: useCue,
    cueOffsetSeconds,
    ctaOnsetSeconds,
    speechEndSeconds: measuredSpeechEnd,
  };
}

export function packMusicBedAbsolutePath(repoRoot: string): string {
  return path.join(repoRoot, FLAGSHIP_UPBEAT_BED_REL);
}

export function packEndStingAbsolutePath(repoRoot: string): string {
  return path.join(repoRoot, pack.endingAudio.stingRel);
}

export function probeMediaDuration(file: string): number {
  return probeDuration(file);
}
