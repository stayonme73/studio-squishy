/**
 * Clip-only caption and end-card finish.
 * Does not change Short-Form chunking. Uses only words already in the captions.
 */

import { mkdirSync } from "fs";
import path from "path";

import sharp from "sharp";

import { exactWords, paintExactTextLine } from "@/lib/studio-short-form-video-editing/caption-burn";
import type { EditDecisionList, SpeechWord, TimedCaption } from "@/lib/studio-short-form-video-editing/types";

const MAX_WORDS = 6;
const SOFT_MAX = 7;
const CONNECTORS = new Set([
  "a",
  "an",
  "the",
  "for",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "at",
  "with",
  "from",
  "than",
  "we",
  "&",
]);
const CLAUSE_START = new Set(["because", "if", "when", "while", "although", "though"]);

const PLATE = { r: 31, g: 74, b: 68, alpha: 1 };

/** Clip burn only. Short-Form keeps its own bar, stroke, and bottom margin. */
export const CLIP_CAPTION_PRESENTATION = {
  background: "transparent",
  stroke: "#111111",
  bottomPx: 148,
  bandHeight: 120,
  fontSize: 44,
} as const;

type WordTime = { text: string; start: number; end: number };

function bare(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9&]/g, "");
}

function endsSentence(word: string): boolean {
  return /[.!?]$/.test(word);
}

function endsClause(word: string): boolean {
  return /,$/.test(word);
}

function isConnector(word: string): boolean {
  return CONNECTORS.has(bare(word));
}

function isClauseStart(word: string): boolean {
  return CLAUSE_START.has(bare(word));
}

function wordsFromSpeech(captions: readonly TimedCaption[]): WordTime[] {
  const out: WordTime[] = [];
  for (const caption of captions) {
    if (caption.role === "cta") continue;
    const words = exactWords(caption.text);
    if (!words.length) continue;
    const span = Math.max(0.2, caption.end - caption.start);
    const slice = span / words.length;
    words.forEach((text, index) => {
      const start = caption.start + slice * index;
      const end =
        index === words.length - 1 ? caption.end : caption.start + slice * (index + 1);
      out.push({ text, start, end });
    });
  }
  return out;
}

function closeForLength(current: WordTime[]): { closed: WordTime[]; held: WordTime[] } {
  const held: WordTime[] = [];
  const closed = [...current];
  while (
    closed.length > 1 &&
    isConnector(closed[closed.length - 1]!.text) &&
    !endsSentence(closed[closed.length - 1]!.text)
  ) {
    held.unshift(closed.pop()!);
  }
  return { closed, held };
}

function sentenceRest(words: readonly WordTime[], fromIndex: number): number {
  let count = 0;
  for (let index = fromIndex; index < words.length; index += 1) {
    count += 1;
    if (endsSentence(words[index]!.text)) break;
  }
  return count;
}

export function groupSpeechWords(words: readonly WordTime[]): WordTime[][] {
  const chunks: WordTime[][] = [];
  let current: WordTime[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    const completesSentence = endsSentence(word.text);
    const completesClause = endsClause(word.text);
    if (
      current.length >= 4 &&
      isClauseStart(word.text) &&
      sentenceRest(words, index) <= SOFT_MAX
    ) {
      chunks.push(current);
      current = [];
    }
    const nextLength = current.length + 1;
    const extendForSentence = completesSentence && current.length === MAX_WORDS && nextLength <= SOFT_MAX;
    const extendForComma = completesClause && current.length >= 4 && nextLength <= SOFT_MAX;
    const next = words[index + 1];
    const extendDanglingConnector =
      current.length === MAX_WORDS &&
      current.length < SOFT_MAX &&
      isConnector(current[current.length - 1]?.text ?? "") &&
      !isConnector(word.text) &&
      !isClauseStart(word.text) &&
      Boolean(next && (isClauseStart(next.text) || endsSentence(word.text)));
    if (
      current.length >= MAX_WORDS &&
      !extendForSentence &&
      !extendForComma &&
      !extendDanglingConnector
    ) {
      let peeled: WordTime[] = [];
      if (isConnector(word.text) && sentenceRest(words, index) <= 4) {
        const last = current[current.length - 1];
        if (
          last &&
          current.length > 3 &&
          !isConnector(last.text) &&
          !endsSentence(last.text)
        ) {
          peeled = [current.pop()!];
        }
      }
      const split = closeForLength(current);
      if (split.closed.length) chunks.push(split.closed);
      current = [...split.held, ...peeled];
    }
    current.push(word);
    if (
      completesSentence ||
      (completesClause && current.length >= 4 && current.length <= SOFT_MAX)
    ) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks.filter((chunk) => chunk.length > 0);
}

function captionsFromGroups(chunks: readonly WordTime[][]): TimedCaption[] {
  const speech: TimedCaption[] = chunks.map((chunk, index) => {
    const start = chunk[0]!.start;
    const spokenEnd = chunk[chunk.length - 1]!.end;
    return {
      start: Number(start.toFixed(3)),
      end: Number(Math.max(start + 0.15, spokenEnd).toFixed(3)),
      text: chunk.map((word) => word.text).join(" "),
      role: index === 0 ? "hook" : "speech",
    };
  });
  for (let index = 0; index < speech.length - 1; index += 1) {
    const caption = speech[index]!;
    const next = speech[index + 1]!;
    if (caption.end > next.start) caption.end = Number(next.start.toFixed(3));
  }
  return speech;
}

export function segmentClipSpeechCaptions(
  captions: readonly TimedCaption[],
): TimedCaption[] {
  const cta = captions.filter((caption) => caption.role === "cta");
  return [...captionsFromGroups(groupSpeechWords(wordsFromSpeech(captions))), ...cta];
}

export function clipSpeechCaptionFindings(lines: readonly string[]): string[] {
  const findings: string[] = [];
  for (const line of lines) {
    if (/[.!?]\s+\S/.test(line)) findings.push(`mid_thought:${line}`);
    const words = exactWords(line);
    const last = words[words.length - 1];
    const first = words[0];
    if (last && isConnector(last)) findings.push(`dangling_end:${line}`);
    if (words.length === 1 && last && !endsSentence(last)) findings.push(`orphan_word:${line}`);
    if (words.length <= 3 && first && isConnector(first)) {
      findings.push(`short_connector_line:${line}`);
    }
  }
  return findings;
}

function finishGroupedSpeech(
  groups: readonly WordTime[][],
  cta: readonly TimedCaption[],
  originalWords: readonly string[],
): { ok: true; captions: TimedCaption[] } | { ok: false; findings: string[] } {
  const speech = captionsFromGroups(groups);
  const next = speech.flatMap((caption) => exactWords(caption.text));
  if (originalWords.join(" ") !== next.join(" ")) {
    return { ok: false, findings: ["spoken_words_changed"] };
  }
  const findings = clipSpeechCaptionFindings(speech.map((caption) => caption.text));
  if (findings.length) return { ok: false, findings };
  return { ok: true, captions: [...speech, ...cta] };
}

export function finishClipEditCaptions<T extends { captions: readonly TimedCaption[] }>(
  edl: T,
): { ok: true; edl: T } | { ok: false; findings: string[] } {
  const original = edl.captions
    .filter((caption) => caption.role !== "cta")
    .flatMap((caption) => exactWords(caption.text));
  const finished = finishGroupedSpeech(
    groupSpeechWords(wordsFromSpeech(edl.captions)),
    edl.captions.filter((caption) => caption.role === "cta"),
    original,
  );
  if (!finished.ok) return finished;
  return { ok: true, edl: { ...edl, captions: finished.captions } };
}

export function timelineWordsForRange(
  words: readonly SpeechWord[],
  range: { start: number; end: number },
): WordTime[] {
  return words
    .filter((word) => word.end > range.start && word.start < range.end)
    .map((word) => ({
      text: (word.punctuatedWord ?? word.word).trim(),
      start: Number(Math.max(0, word.start - range.start).toFixed(3)),
      end: Number(Math.max(0.05, Math.min(word.end, range.end) - range.start).toFixed(3)),
    }))
    .filter((word) => word.text.length > 0);
}

export function finishClipTimedSpeech(input: {
  words: readonly WordTime[];
  cta?: TimedCaption;
  expectedSpokenText?: string;
}): { ok: true; captions: TimedCaption[] } | { ok: false; findings: string[] } {
  const original = exactWords(input.expectedSpokenText ?? input.words.map((word) => word.text).join(" "));
  return finishGroupedSpeech(
    groupSpeechWords(input.words),
    input.cta ? [input.cta] : [],
    original,
  );
}

export function finishClipDecisionList(
  edl: EditDecisionList,
  spokenWords?: readonly SpeechWord[],
  range?: { start: number; end: number },
): { ok: true; edl: EditDecisionList } | { ok: false; findings: string[] } {
  if (!spokenWords || !range) return finishClipEditCaptions(edl);
  const original = edl.captions
    .filter((caption) => caption.role !== "cta")
    .flatMap((caption) => exactWords(caption.text));
  const timed = timelineWordsForRange(spokenWords, range);
  const finished = finishGroupedSpeech(
    groupSpeechWords(timed),
    edl.captions.filter((caption) => caption.role === "cta"),
    original,
  );
  if (!finished.ok) return finished;
  return { ok: true, edl: { ...edl, captions: finished.captions } };
}

export function wrapAuthorizedLine(words: readonly string[]): string[] {
  if (words.length <= 4) return [words.join(" ")];
  const split = Math.ceil(words.length / 2);
  for (let delta = 0; delta < words.length; delta += 1) {
    for (const candidate of [split + delta, split - delta]) {
      if (candidate <= 1 || candidate >= words.length) continue;
      const leftLast = words[candidate - 1]!;
      const rightFirst = words[candidate]!;
      if (isConnector(leftLast) || isConnector(rightFirst)) continue;
      return [words.slice(0, candidate).join(" "), words.slice(candidate).join(" ")];
    }
  }
  return [words.join(" ")];
}

export async function paintClipCustomerEndCard(input: {
  text: string;
  outputAbsolutePath: string;
  width: number;
  height: number;
}): Promise<{ ok: true; words: string[] } | { ok: false; message: string }> {
  const words = exactWords(input.text);
  if (!words.length) return { ok: false, message: "End card has no authorized words." };
  const lines = wrapAuthorizedLine(words);
  const work = path.join(path.dirname(input.outputAbsolutePath), "plate-lines");
  mkdirSync(work, { recursive: true });
  const fonts = [56, 50];
  let paintedLines: Array<{ file: string; height: number }> | null = null;
  for (const fontSize of fonts) {
    const lineBox = Math.ceil(fontSize * 1.75) + 8;
    const attempt: Array<{ file: string; height: number }> = [];
    let failed = false;
    for (const [index, line] of lines.entries()) {
      const linePath = path.join(work, `line-${index}.png`);
      const paintedLine = await paintExactTextLine({
        text: line,
        outputAbsolutePath: linePath,
        width: input.width - 160,
        height: lineBox,
        fontSize,
        fill: "#ffffff",
        background: "transparent",
        radius: 0,
      });
      if (!paintedLine.ok) {
        failed = true;
        break;
      }
      attempt.push({ file: linePath, height: lineBox });
    }
    if (!failed) {
      paintedLines = attempt;
      break;
    }
  }
  if (!paintedLines) return { ok: false, message: "End card line did not fit." };
  const gap = lines.length > 1 ? 36 : 0;
  const blockHeight =
    paintedLines.reduce((sum, line) => sum + line.height, 0) + gap * (lines.length - 1);
  const blockTop = Math.round((input.height - blockHeight) / 2);
  let top = blockTop;
  const composites: sharp.OverlayOptions[] = [];
  paintedLines.forEach((line, index) => {
    composites.push({ input: line.file, left: 80, top });
    top += line.height;
    if (index === 0 && lines.length > 1) top += gap;
  });
  if (lines.length > 1 && paintedLines[0]) {
    composites.push({
      input: await sharp({
        create: {
          width: 168,
          height: 3,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer(),
      left: Math.round((input.width - 168) / 2),
      top: blockTop + paintedLines[0].height + Math.round((gap - 3) / 2),
    });
  }
  await sharp({
    create: {
      width: input.width,
      height: input.height,
      channels: 4,
      background: PLATE,
    },
  })
    .composite(composites)
    .png()
    .toFile(input.outputAbsolutePath);
  return { ok: true, words };
}
