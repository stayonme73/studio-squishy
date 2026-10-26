/**
 * Pack QA: every standalone short begins on a clean thought,
 * ends on a complete thought, and times story B-roll to the spoken idea.
 */

import { studioShortFormContentPackFactoryV1 as pack } from "@/config/studio-short-form-content-pack-factory-v1";
import { buildTranscriptSentences, type TranscriptSentence } from "@/lib/studio-short-form-video-editing/sentences";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

export const PACK_STANDALONE_SHORT_QA = {
  beginOnCleanThought: true,
  endOnCompleteThought: true,
  synchronizeStoryBrollToSpokenIdea: true,
  brollFollowsCompleteSemanticThought: true,
  doNotTriggerBrollOnlyOnKeyword: true,
  doNotRemoveBrollBeforeThoughtFinishes: true,
  doNotLeaveBrollIntoNextThought: true,
  maxCompletionPadSeconds: 8,
} as const;

const HANGING_END =
  /\b(which means|i learned this language|i will teach you|and i am|i am from)\s*$/i;
const SKIP_OPENING_ALWAYS = /^(every language|in the world)\b/i;
const FILLER_OPENING = /^(okay|ok|hi|hey|um|uh|of|and|so)\b/i;

function thoughtShapeOk(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return false;
  if (HANGING_END.test(trimmed.replace(/[.!?]+$/, ""))) return false;
  if (!/[.!?]"?$/.test(trimmed)) return false;
  const last = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean).pop() ?? trimmed;
  if (HANGING_END.test(last.replace(/[.!?]+$/, ""))) return false;
  return last.trim().split(/\s+/).length >= 4;
}

export function isLeadInFragment(text: string): boolean {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return true;
  if (SKIP_OPENING_ALWAYS.test(trimmed)) return true;
  return FILLER_OPENING.test(trimmed) && !thoughtShapeOk(trimmed);
}

export function isCompleteThought(text: string): boolean {
  return thoughtShapeOk(text) && !isLeadInFragment(text);
}

export function planStandaloneSpeechRange(input: {
  words: readonly SpeechWord[];
  minSeconds: number;
  maxSeconds: number;
  anchorStartSeconds?: number;
  anchorEndSeconds?: number;
}):
  | { ok: true; start: number; end: number; openingText: string; endingText: string; text: string }
  | { ok: false; message: string; needsCompletionPad: boolean } {
  const sentences = buildTranscriptSentences(input.words).filter(
    (sentence) => !isLeadInFragment(sentence.text),
  );
  const anchored =
    input.anchorStartSeconds != null && input.anchorEndSeconds != null
      ? sentences.filter(
          (sentence) =>
            sentence.end >= input.anchorStartSeconds! - 0.35 &&
            sentence.start <= input.anchorEndSeconds! + 0.35,
        )
      : sentences;
  const complete = (
    anchored.length ? anchored : sentences
  ).filter((sentence) => isCompleteThought(sentence.text));
  if (!complete.length) {
    return {
      ok: false,
      message: "No complete standalone thought in the identified window.",
      needsCompletionPad: true,
    };
  }
  const opening = complete[0]!;
  let closing = opening;
  const start = Math.max(0, opening.start - 0.08);
  for (const sentence of complete) {
    closing = sentence;
    if (sentence.end + 0.12 - start >= input.minSeconds) {
      break;
    }
  }
  let end = closing.end + 0.12;
  if (end - start > input.maxSeconds) {
    end = start + input.maxSeconds;
    const still = complete.filter(
      (sentence) => sentence.start >= start && sentence.end <= end + 0.05,
    );
    const last = still[still.length - 1];
    if (!last || !isCompleteThought(last.text)) {
      return {
        ok: false,
        message: "Trimming to 30 seconds would end on an incomplete thought.",
        needsCompletionPad: false,
      };
    }
    closing = last;
    end = last.end + 0.12;
  }
  if (end - start < input.minSeconds) {
    return {
      ok: false,
      message: "Complete thoughts in this window are under 15 seconds.",
      needsCompletionPad: true,
    };
  }
  if (!isCompleteThought(closing.text)) {
    return {
      ok: false,
      message: "Ending is not a complete standalone thought.",
      needsCompletionPad: true,
    };
  }
  const inRange = complete.filter(
    (sentence) => sentence.start >= start - 0.05 && sentence.end <= end + 0.2,
  );
  return {
    ok: true,
    start,
    end,
    openingText: opening.text,
    endingText: closing.text,
    text: inRange.map((sentence) => sentence.text).join(" "),
  };
}

export function evaluatePackClipEditorialQa(input: {
  openingText: string;
  endingText: string;
  spokenIdea: string;
}): string[] {
  const findings: string[] = [];
  if (!isCompleteThought(input.openingText) || isLeadInFragment(input.openingText)) {
    findings.push("begin_not_clean_thought");
  }
  if (!isCompleteThought(input.endingText)) {
    findings.push("end_not_complete_thought");
  }
  if (HANGING_END.test(input.spokenIdea.replace(/[.!?]+$/, ""))) {
    findings.push("spoken_idea_hangs");
  }
  return findings;
}

function wordBare(word: SpeechWord): string {
  return (word.punctuatedWord ?? word.word).toLowerCase().replace(/[.,!?]/g, "");
}

function wordMatchesToken(word: SpeechWord, tokens: readonly string[]): boolean {
  const value = wordBare(word);
  return tokens.some((token) => value === token || value.startsWith(token));
}

function semanticThoughtScore(
  sentence: TranscriptSentence,
  needles: readonly string[],
): number {
  if (!sentence.words.some((word) => wordMatchesToken(word, needles))) return 0;
  const hasSpeaking = sentence.words.some((word) => wordBare(word) === "speaking");
  const hasEnglish = sentence.words.some((word) => wordBare(word) === "english");
  const hasLanguage = sentence.words.some((word) =>
    wordBare(word).startsWith("language"),
  );
  if (hasSpeaking && (hasEnglish || hasLanguage)) return 3;
  if (hasEnglish && hasLanguage) return 2;
  return 1;
}

export function planBrollForSemanticThought(input: {
  words: readonly SpeechWord[];
  tokens: readonly string[];
  rangeStart: number;
  speechEnd: number;
}):
  | {
      ok: true;
      start: number;
      end: number;
      token: string;
      thoughtText: string;
      nextThoughtStart: number | null;
    }
  | { ok: false; message: string } {
  const needles = input.tokens
    .map((token) => token.toLowerCase())
    .filter((token) => token.length > 3);
  if (!needles.length) {
    return { ok: false, message: "No B-roll thought tokens." };
  }
  const sentences = buildTranscriptSentences(input.words);
  const thought = sentences
    .map((sentence) => ({ sentence, score: semanticThoughtScore(sentence, needles) }))
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.sentence;
  if (!thought) {
    return { ok: false, message: "No spoken thought matches this B-roll." };
  }
  const tokenHit =
    thought.words.find((word) => wordMatchesToken(word, needles)) ??
    thought.words[0]!;
  const onset =
    thought.words.find(
      (word) =>
        word.start <= tokenHit.start &&
        /^(speaking|learned)$/i.test(wordBare(word)) &&
        tokenHit.start - word.start <= 2.5,
    ) ?? tokenHit;
  const last = thought.words[thought.words.length - 1]!;
  const thoughtIndex = sentences.indexOf(thought);
  const next = sentences[thoughtIndex + 1] ?? null;
  const start = Math.max(0, onset.start - input.rangeStart);
  const thoughtEnd = last.end - input.rangeStart;
  const nextStart =
    next != null ? Math.max(0, next.start - input.rangeStart) : null;
  const end = Math.min(
    input.speechEnd - 0.08,
    nextStart != null ? Math.max(start + 0.4, nextStart - 0.06) : thoughtEnd + 0.06,
    thoughtEnd + 0.06,
  );
  if (end <= start + 0.4) {
    return { ok: false, message: "Semantic B-roll window is too short." };
  }
  if (nextStart != null && end > nextStart) {
    return { ok: false, message: "B-roll would run into the next thought." };
  }
  return {
    ok: true,
    start,
    end,
    token: wordBare(onset),
    thoughtText: thought.text,
    nextThoughtStart: nextStart,
  };
}

/** Keep generic language tokens only when the stock has no more specific object. */
export function distinctiveBrollTokens(supportsSpokenIdea: string): string[] {
  const all = supportsSpokenIdea
    .toLowerCase()
    .split(/[\s,/]+/)
    .filter((token) => token.length > 3);
  const distinctive = all.filter(
    (token) =>
      !/english|learn|learning|language|phrase|phrases|teach|teaching|vocabulary|dictionary|speaking|speak/.test(
        token,
      ),
  );
  return distinctive;
}

export function sentenceListForQa(words: readonly SpeechWord[]): TranscriptSentence[] {
  return buildTranscriptSentences(words);
}

/** Short surrounding review around a customer mark. Never a long-form search. */
export function planSurroundingReviewWindow(input: {
  identifiedStartSeconds: number;
  identifiedEndSeconds: number;
  sourceDurationSeconds?: number;
}): { startSeconds: number; endSeconds: number; reviewSeconds: number } {
  const identifiedStart = Math.max(0, input.identifiedStartSeconds);
  const identifiedEnd = Math.max(identifiedStart, input.identifiedEndSeconds);
  const maxWindow = pack.discovery.surroundingReviewMaxSeconds;
  let start = Math.max(0, identifiedStart - pack.discovery.preferredLookbackSeconds);
  let end = identifiedEnd + pack.discovery.preferredLookaheadSeconds;
  if (input.sourceDurationSeconds != null) {
    end = Math.min(input.sourceDurationSeconds, end);
  }
  if (end - start > maxWindow) {
    const leftover = Math.max(0, maxWindow - (identifiedEnd - identifiedStart));
    const before = leftover / 2;
    start = Math.max(0, identifiedStart - before);
    end = start + maxWindow;
    if (input.sourceDurationSeconds != null) {
      end = Math.min(input.sourceDurationSeconds, end);
      start = Math.max(0, end - maxWindow);
    }
  }
  if (start > identifiedStart) start = Math.max(0, identifiedStart);
  if (end < identifiedEnd) {
    end = identifiedEnd;
    start = Math.max(0, end - maxWindow);
  }
  return {
    startSeconds: start,
    endSeconds: end,
    reviewSeconds: end - start,
  };
}
