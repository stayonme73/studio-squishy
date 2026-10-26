import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import type { TranscriptSentence } from "./sentences";
import { pickIdeaFirstPlan } from "./idea-first";
import { isFillerSentence, pickStoryOrderedSentences } from "./story-order";

const OFFER = studioShortFormVideoEditingBuildV1.offer;
const WEAK_OPEN = /^(and|so|but|um|uh|like|you know)\b/i;

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );
}

function tooSimilar(a: string, b: string): boolean {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return false;
  let hit = 0;
  for (const word of left) {
    if (right.has(word)) hit += 1;
  }
  return hit / Math.min(left.size, right.size) > 0.85;
}

export { isFillerSentence } from "./story-order";

export function pickMultiSegmentSentences(
  sentences: readonly TranscriptSentence[],
  minSeconds = OFFER.outputMinSeconds,
  maxSeconds = OFFER.outputMaxSeconds,
): TranscriptSentence[] {
  const idea = pickIdeaFirstPlan(sentences, minSeconds, maxSeconds);
  if (idea.ok) {
    return idea.beats
      .map((beat) => sentences.find((sentence) => sentence.index === beat.index))
      .filter((sentence): sentence is TranscriptSentence => Boolean(sentence));
  }
  const story = pickStoryOrderedSentences(sentences, minSeconds, maxSeconds);
  if (story.ok) {
    return story.beats
      .map((beat) => sentences.find((sentence) => sentence.index === beat.index))
      .filter((sentence): sentence is TranscriptSentence => Boolean(sentence));
  }

  const usable = sentences.filter((sentence) => !isFillerSentence(sentence));
  const unique: TranscriptSentence[] = [];
  for (const sentence of usable) {
    if (unique.some((kept) => tooSimilar(kept.text, sentence.text))) continue;
    unique.push(sentence);
  }
  if (!unique.length) return [];

  const hook =
    unique.find(
      (sentence) =>
        !WEAK_OPEN.test(sentence.text) && /[.!?]"?$/.test(sentence.text.trim()),
    ) ??
    unique.find((sentence) => !WEAK_OPEN.test(sentence.text)) ??
    unique[0]!;

  const rest = unique.filter((sentence) => sentence.index !== hook.index);
  const closer =
    [...rest]
      .reverse()
      .find((sentence) => /[.!?]"?$/.test(sentence.text.trim())) ??
    rest[rest.length - 1];
  const middle = rest.filter((sentence) => sentence.index !== closer?.index);

  const picked: TranscriptSentence[] = [hook];
  let spoken = hook.end - hook.start;

  for (const sentence of middle) {
    const duration = sentence.end - sentence.start;
    if (spoken + duration > maxSeconds + 0.05) continue;
    const last = picked[picked.length - 1]!;
    const adjacent = sentence.index === last.index + 1;
    if (adjacent && picked.length >= 2 && middle.length > 2) continue;
    picked.push(sentence);
    spoken += duration;
    if (spoken >= minSeconds && picked.length >= 3) break;
  }

  if (closer && !picked.some((sentence) => sentence.index === closer.index)) {
    const duration = closer.end - closer.start;
    if (spoken + duration <= maxSeconds + 0.05) {
      picked.push(closer);
      spoken += duration;
    }
  }

  if (spoken < minSeconds) {
    for (const sentence of unique) {
      if (picked.some((kept) => kept.index === sentence.index)) continue;
      const duration = sentence.end - sentence.start;
      if (spoken + duration > maxSeconds + 0.05) continue;
      picked.push(sentence);
      spoken += duration;
      if (spoken >= minSeconds) break;
    }
  }

  return picked;
}

export function evaluateEditorialPlan(input: {
  clipCount: number;
  outputDurationSeconds: number;
  sourceSpokenSeconds: number;
  sourceTrims: readonly number[];
  storyFindings?: readonly string[];
  humanEditorWouldChooseThisOrder?: boolean;
  wouldEditorChooseThisOverFirstBlock?: boolean;
  firstSourceTrim?: number;
}): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  if (
    input.outputDurationSeconds < OFFER.outputMinSeconds ||
    input.outputDurationSeconds >
    OFFER.outputMaxSeconds +
      studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds +
      0.25
  ) {
    findings.push("duration_out_of_band");
  }
  if (
    input.clipCount < 2 &&
    input.sourceSpokenSeconds > 40 &&
    (input.firstSourceTrim ?? 0) < 30
  ) {
    findings.push("single_block_on_long_source");
  }
  const trims = input.sourceTrims;
  const hasJump = trims.some((trim, index) => {
    const prev = trims[index - 1];
    return index > 0 && prev != null && trim - prev > 1.25;
  });
  if (input.clipCount >= 2 && !hasJump && input.sourceSpokenSeconds > 40) {
    findings.push("clips_are_still_contiguous");
  }
  if (input.humanEditorWouldChooseThisOrder === false) {
    findings.push("human_editor_would_not_choose_this_order");
  }
  if (input.wouldEditorChooseThisOverFirstBlock === false) {
    findings.push("first_block_bias_stronger_later_idea_exists");
  }
  if (input.storyFindings?.length) {
    findings.push(...input.storyFindings);
  }
  return { ok: findings.length === 0, findings };
}
