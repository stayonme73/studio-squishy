/**
 * Single caption-finish path for Clip factory burn and production probes.
 */

import { existsSync } from "fs";

import { buildEditDecisionList } from "@/lib/studio-short-form-video-editing/edl";
import { probeFootageSource } from "@/lib/studio-short-form-video-editing/probe";
import type { EditDecisionList, FootageIntake, SpeechWord } from "@/lib/studio-short-form-video-editing/types";

import { finishClipDecisionList, splitSpeechCaptionsForBurn } from "./caption-finish";

function offsetWords(
  words: readonly SpeechWord[],
  extractStart: number,
  extractEnd: number,
): SpeechWord[] {
  return words
    .filter(
      (word) =>
        word.end > extractStart && word.start < extractStart + 180 && word.start < extractEnd,
    )
    .map((word) => ({
      ...word,
      start: Number(Math.max(0, word.start - extractStart).toFixed(3)),
      end: Number(Math.max(0.01, word.end - extractStart).toFixed(3)),
    }));
}

export function finishCertifiedClipCaptionEdl(input: {
  words: readonly SpeechWord[];
  extractAbsolutePath: string | null;
  extractStart: number;
  opening: number;
  exit: number;
  ctaText: string;
  mustKeepLine: string;
  sourceRelativePath?: string;
}):
  | { ok: true; edl: EditDecisionList }
  | { ok: false; message: string } {
  const localWords = offsetWords(input.words, input.extractStart, input.extractStart + 180);
  const intake: FootageIntake = {
    skuId: "v2-rtu-short-form-video-edit",
    sourceRelativePath: input.sourceRelativePath ?? "clip-factory",
    ctaText: input.ctaText,
    mustKeepLine: input.mustKeepLine,
    rightsCleared: true,
    language: "en",
  };

  let sourceDurationSeconds: number | null = null;
  if (input.extractAbsolutePath && existsSync(input.extractAbsolutePath)) {
    const probe = probeFootageSource(input.extractAbsolutePath);
    if ("error" in probe) {
      return { ok: false, message: probe.error };
    }
    sourceDurationSeconds = probe.durationSeconds;
  }
  if (sourceDurationSeconds == null) {
    sourceDurationSeconds = Number(Math.max(input.exit + 8, 18).toFixed(3));
  }

  const edl = buildEditDecisionList({
    words: localWords,
    intake,
    sourceDurationSeconds,
    lockContinuousRange: { start: input.opening, end: input.exit },
  });
  if (!edl.ok) {
    return { ok: false, message: edl.message };
  }
  const captionFinish = finishClipDecisionList(edl, localWords, {
    start: input.opening,
    end: input.exit,
  });
  if (!captionFinish.ok) {
    return {
      ok: false,
      message: `Clip caption finish rejected: ${captionFinish.findings.join("; ")}`,
    };
  }
  return {
    ok: true,
    edl: {
      ...captionFinish.edl,
      captions: splitSpeechCaptionsForBurn(captionFinish.edl.captions),
    },
  };
}
