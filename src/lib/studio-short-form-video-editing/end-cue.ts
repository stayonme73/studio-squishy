/**
 * Tasteful end-of-clip cue for talking-head lanes.
 * Lands with the CTA card. Stays under speech. Never the main event.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import {
  studioTalkingHeadEndCueV1,
  type TalkingHeadEndCueId,
} from "@/config/studio-talking-head-end-cue-v1";

const MIX = studioTalkingHeadEndCueV1.mix;
const FAMILY = studioTalkingHeadEndCueV1.family;

export type TalkingHeadEndCueChoice = {
  id: TalkingHeadEndCueId;
  reason: string;
  durationSeconds: number;
};

function lastSpeechWords(text: string): string[] {
  return text
    .replace(/[\u2000-\u200b\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

export function chooseTalkingHeadEndCue(input: {
  lastSpeechText: string;
  lastSpeechDurationSeconds: number;
}): TalkingHeadEndCueChoice {
  const text = input.lastSpeechText.toLowerCase();
  const words = lastSpeechWords(input.lastSpeechText);

  if (
    /\b(than|versus|instead|or)\b/.test(text) ||
    /\d/.test(text)
  ) {
    return {
      id: "soft_pop_tick",
      reason: "Contrast or numbered landing.",
      durationSeconds: FAMILY.soft_pop_tick.maxSeconds,
    };
  }

  if (words.length >= 8 || input.lastSpeechDurationSeconds >= 2.4) {
    return {
      id: "airy_whoosh",
      reason: "Longer, smoother landing.",
      durationSeconds: FAMILY.airy_whoosh.maxSeconds,
    };
  }

  return {
    id: "soft_snap",
    reason: "Short, clean landing.",
    durationSeconds: FAMILY.soft_snap.maxSeconds,
  };
}

function cueLavfi(id: TalkingHeadEndCueId): string {
  if (id === "soft_snap") {
    return "aevalsrc='0.16*sin(2*PI*1750*t)*exp(-t*90)':s=48000:d=0.10";
  }
  if (id === "airy_whoosh") {
    return "anoisesrc=d=0.16:c=pink:a=0.07:r=48000,highpass=f=500,lowpass=f=2200,afade=t=in:st=0:d=0.03,afade=t=out:st=0.08:d=0.08";
  }
  return "aevalsrc='0.18*sin(2*PI*2300*t)*exp(-t*130)+0.07*sin(2*PI*980*t)*exp(-t*70)':s=48000:d=0.08";
}

export function writeTalkingHeadEndCueWav(input: {
  id: TalkingHeadEndCueId;
  outputAbsolutePath: string;
}): { ok: true } | { ok: false; message: string } {
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        cueLavfi(input.id),
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
      message: `End cue synth failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  if (!existsSync(input.outputAbsolutePath)) {
    return { ok: false, message: "End cue wav missing." };
  }
  return { ok: true };
}

export function mixEndCueOntoEndCardAudio(input: {
  cueAbsolutePath: string;
  outputAbsolutePath: string;
  holdSeconds: number;
  delaySeconds?: number;
}): { ok: true } | { ok: false; message: string } {
  mkdirSync(path.dirname(input.outputAbsolutePath), { recursive: true });
  const delayMs = Math.max(0, Math.round((input.delaySeconds ?? 0) * 1000));
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.cueAbsolutePath,
        "-f",
        "lavfi",
        "-i",
        `anullsrc=r=48000:cl=stereo:d=${input.holdSeconds}`,
        "-filter_complex",
        `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,adelay=${delayMs}|${delayMs},volume=${MIX.cueMixDb}dB[cue];[1:a][cue]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`,
        "-map",
        "[a]",
        "-c:a",
        "pcm_s16le",
        "-ar",
        "48000",
        "-ac",
        "2",
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `End-card cue mix failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return existsSync(input.outputAbsolutePath)
    ? { ok: true }
    : { ok: false, message: "End-card cue audio missing." };
}

export function mixEndCueUnderLastSpeech(input: {
  videoAbsolutePath: string;
  cueAbsolutePath: string;
  outputAbsolutePath: string;
  speechDurationSeconds: number;
}): { ok: true } | { ok: false; message: string } {
  const delayMs = Math.max(
    0,
    Math.round((input.speechDurationSeconds - MIX.underLastSpeechMs / 1000) * 1000),
  );
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        input.videoAbsolutePath,
        "-i",
        input.cueAbsolutePath,
        "-filter_complex",
        `[1:a]adelay=${delayMs}|${delayMs},volume=${MIX.underSpeechMixDb}dB[cue];[0:a][cue]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`,
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
        "-b:a",
        "192k",
        input.outputAbsolutePath,
      ],
      { stdio: "pipe" },
    );
  } catch (error) {
    return {
      ok: false,
      message: `Under-speech cue mix failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return existsSync(input.outputAbsolutePath)
    ? { ok: true }
    : { ok: false, message: "Under-speech mix missing." };
}

export function writeEndCueDecision(input: {
  workDirectory: string;
  choice: TalkingHeadEndCueChoice;
  lastSpeechText: string;
}): void {
  writeFileSync(
    path.join(input.workDirectory, "end-cue.json"),
    `${JSON.stringify(
      {
        packageId: studioTalkingHeadEndCueV1.packageId,
        ...input.choice,
        lastSpeechText: input.lastSpeechText,
        noMusicBed: true,
        noCustomerVisibleRandomness: true,
      },
      null,
      2,
    )}\n`,
  );
}
