/**
 * Set-level discovery for Clip Repurposing.
 * Reuses $349 short-form scoring. Does not write an EDL or call Shotstack.
 */

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import {
  scoreShortFormValue,
} from "@/lib/studio-short-form-video-editing/idea-first";
import { classifySentenceRole } from "@/lib/studio-short-form-video-editing/story-order";
import type { TranscriptSentence } from "@/lib/studio-short-form-video-editing/sentences";

import { contentTokens } from "./set-discovery-tokens";
import { MIN_SEMANTIC_VIABLE, scoreSemanticValue } from "./semantic-value";
import type {
  LongSourceSentences,
  PerformanceWindowNote,
  SetCandidate,
  SetDiscoveryResult,
  SetDiscoverySuccess,
  SetRevision,
} from "./types";

export { contentTokens } from "./set-discovery-tokens";

const OFFER = studioClipRepurposingBuildV1.proposedOffer;
const MIN_WINDOW = 12;
const MAX_WINDOW = 36;

const DEPENDENT_RE =
  /\b(as i (said|mentioned)|like i (said|mentioned)|earlier|going back to|in the last|as we (just )?talked|same thing again|for example|for instance)\b/i;

export function tokenJaccard(left: string, right: string): number {
  const a = contentTokens(left);
  const b = contentTokens(right);
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const word of a) {
    if (b.has(word)) hit += 1;
  }
  return hit / new Set([...a, ...b]).size;
}

export function sharedPhrase(left: string, right: string): boolean {
  const grams = (text: string) => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const out = new Set<string>();
    for (let i = 0; i < words.length - 2; i += 1) {
      out.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
    return out;
  };
  const a = grams(left);
  for (const gram of grams(right)) {
    if (a.has(gram)) return true;
  }
  return false;
}

export function corePoint(text: string): string {
  return [...contentTokens(text)]
    .filter((word) => word.length >= 5)
    .sort()
    .slice(0, 8)
    .join(" ");
}

function isStandalone(text: string): boolean {
  return !DEPENDENT_RE.test(text);
}

function growWindow(
  sentences: readonly TranscriptSentence[],
  seedIndex: number,
): { start: number; end: number; indexes: number[]; text: string } | null {
  const seed = sentences[seedIndex];
  if (!seed) return null;
  const indexes = [seed.index];
  let start = seed.start;
  let end = seed.end;
  for (let i = seedIndex + 1; i < sentences.length; i += 1) {
    const next = sentences[i]!;
    const role = classifySentenceRole(next);
    if (role === "exclude" || role === "close" || role === "cta_signoff") break;
    if (next.start - end > 8) break;
    if (next.end - start > MAX_WINDOW) break;
    indexes.push(next.index);
    end = next.end;
    if (end - start >= OFFER.outputMinSeconds) break;
  }
  const duration = end - start;
  if (duration < MIN_WINDOW) return null;
  if (duration > MAX_WINDOW) return null;
  const text = indexes
    .map((index) => sentences[index]!.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return { start, end, indexes, text };
}

function attachSemantic(
  base: Omit<
    SetCandidate,
    | "semanticScore"
    | "hookWordBonus"
    | "claim"
    | "whyViewerCares"
    | "semanticReasons"
    | "hasSpokenEntry"
    | "hasEnoughToLand"
    | "setValueScore"
  >,
): SetCandidate {
  const semantic = scoreSemanticValue({
    hookText: base.hookText,
    bodyText: base.bodyText,
    durationSeconds: base.windowEnd - base.windowStart,
    standalone: base.standalone,
  });
  return {
    ...base,
    setValueScore: semantic.score,
    semanticScore: semantic.score,
    hookWordBonus: semantic.hookWordBonus,
    claim: semantic.claim,
    whyViewerCares: semantic.whyViewerCares,
    semanticReasons: semantic.reasons,
    hasSpokenEntry: semantic.hasSpokenEntry,
    hasEnoughToLand: semantic.hasEnoughToLand,
  };
}

function stem(word: string): string {
  if (word.endsWith("ing") && word.length > 6) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 5) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 4) {
    return word.slice(0, -1);
  }
  return word;
}

function stemsOf(text: string): Set<string> {
  return new Set([...contentTokens(text)].map(stem));
}

function stemJaccard(left: string, right: string): number {
  const a = stemsOf(left);
  const b = stemsOf(right);
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const word of a) {
    if (b.has(word)) hit += 1;
  }
  return hit / new Set([...a, ...b]).size;
}

function sharedDistinctiveStems(left: string, right: string): string[] {
  const b = stemsOf(right);
  return [...stemsOf(left)].filter((word) => word.length >= 6 && b.has(word));
}

const QUALITY_SERMON_RE =
  /\b(quality|perfection|professional quality|first impression|unshow|already paid for it|did not finish the job|make sure it is right|what i mean when i say quality)\b/i;

function qualitySermon(text: string): boolean {
  return QUALITY_SERMON_RE.test(text);
}

function workmanshipTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .match(
        /\b(quality|finished|finish|fix|right|paid|pay|paying|customer|perfection|professional|bad|problem|unshow)\b/g,
      ) ?? [],
  );
}

function sameWorkmanshipSermon(left: string, right: string): boolean {
  const a = workmanshipTokens(left);
  const b = workmanshipTokens(right);
  if (a.size < 3 || b.size < 3) return false;
  let overlap = 0;
  for (const word of a) {
    if (b.has(word)) overlap += 1;
  }
  return overlap >= 1;
}

function substantialOverlap(left: SetCandidate, right: SetCandidate): boolean {
  const start = Math.max(left.windowStart, right.windowStart);
  const end = Math.min(left.windowEnd, right.windowEnd);
  const overlap = Math.max(0, end - start);
  if (overlap <= 0) return false;
  const shorter = Math.min(
    left.windowEnd - left.windowStart,
    right.windowEnd - right.windowStart,
  );
  return shorter > 0 && overlap / shorter >= 0.35;
}

export function sameIdea(left: SetCandidate, right: SetCandidate): boolean {
  if (substantialOverlap(left, right)) return true;
  if (left.corePoint && left.corePoint === right.corePoint) return true;
  if (tokenJaccard(left.idea, right.idea) >= 0.38) return true;
  if (stemJaccard(left.idea, right.idea) >= 0.4) return true;
  if (sharedPhrase(left.bodyText, right.bodyText)) return true;
  if (sharedPhrase(left.hookText, right.hookText) && tokenJaccard(left.bodyText, right.bodyText) >= 0.28) {
    return true;
  }
  if (tokenJaccard(left.hookText, right.hookText) >= 0.5) return true;
  if (sharedDistinctiveStems(left.idea, right.idea).length >= 2) return true;
  if (sharedDistinctiveStems(left.bodyText, right.bodyText).length >= 3) return true;
  const leftSermon = `${left.claim} ${left.bodyText}`;
  const rightSermon = `${right.claim} ${right.bodyText}`;
  if (qualitySermon(leftSermon) && qualitySermon(rightSermon)) return true;
  if (sameWorkmanshipSermon(leftSermon, rightSermon)) return true;
  if (unfinishedTheme(leftSermon) && unfinishedTheme(rightSermon)) return true;
  return false;
}

function unfinishedTheme(text: string): boolean {
  return /\b(quality|perfection|finished|complete|done|ready|unshow|professional quality)\b/i.test(
    text,
  );
}

function stubFromSentence(
  sentence: TranscriptSentence,
  reason: NonNullable<SetCandidate["rejectionReason"]>,
  shortFormScore: number,
): SetCandidate {
  const hookText = sentence.text.trim();
  return attachSemantic({
    id: `c-${sentence.index}-${Math.round(sentence.start)}`,
    idea: hookText.slice(0, 140),
    corePoint: corePoint(hookText),
    hookText,
    bodyText: hookText,
    windowStart: sentence.start,
    windowEnd: sentence.end,
    sentenceIndexes: [sentence.index],
    standalone: isStandalone(hookText),
    shortFormScore,
    rejectionReason: reason,
  });
}

function buildCandidates(sentences: readonly TranscriptSentence[]): {
  candidates: SetCandidate[];
  earlyRejected: SetCandidate[];
} {
  const seen = new Set<string>();
  const candidates: SetCandidate[] = [];
  const earlyRejected: SetCandidate[] = [];
  for (const sentence of sentences) {
    const role = classifySentenceRole(sentence);
    const shortFormScore = scoreShortFormValue(sentence);
    if (role === "exclude" || role === "close" || role === "cta_signoff") {
      earlyRejected.push(
        stubFromSentence(
          sentence,
          role === "exclude" ? "filler_or_setup" : "weak_short_form_value",
          shortFormScore,
        ),
      );
      continue;
    }
    const window = growWindow(sentences, sentence.index);
    if (!window) {
      earlyRejected.push(
        stubFromSentence(
          sentence,
          sentence.end - sentence.start < MIN_WINDOW
            ? "window_too_short"
            : "weak_short_form_value",
          shortFormScore,
        ),
      );
      continue;
    }
    const key = `${window.indexes[0]}-${window.indexes[window.indexes.length - 1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hookText = sentence.text.trim();
    const bodyText = window.text;
    const standalone = isStandalone(window.text);
    candidates.push(
      attachSemantic({
        id: `c-${sentence.index}-${Math.round(window.start)}`,
        idea: hookText.slice(0, 140),
        corePoint: corePoint(hookText) || corePoint(window.text),
        hookText,
        bodyText,
        windowStart: window.start,
        windowEnd: window.end,
        sentenceIndexes: window.indexes,
        standalone,
        shortFormScore,
      }),
    );
  }
  return {
    candidates: candidates.sort((left, right) => right.semanticScore - left.semanticScore),
    earlyRejected,
  };
}

function reject(
  candidate: SetCandidate,
  reason: NonNullable<SetCandidate["rejectionReason"]>,
): SetCandidate {
  return { ...candidate, rejectionReason: reason };
}

export function discoverClipSet(input: LongSourceSentences): SetDiscoveryResult {
  const { candidates: all, earlyRejected } = buildCandidates(input.sentences);
  const rejected: SetCandidate[] = [...earlyRejected];
  const viable: SetCandidate[] = [];

  for (const candidate of all) {
    if (
      /\b(my name is|i am from|i'?m from|united states of america|let me (tell|show|teach)|today i('m| am) going)\b/i.test(
        candidate.hookText,
      )
    ) {
      rejected.push(reject(candidate, "filler_or_setup"));
      continue;
    }
    if (
      candidate.semanticScore < MIN_SEMANTIC_VIABLE ||
      !candidate.hasSpokenEntry ||
      !candidate.hasEnoughToLand
    ) {
      rejected.push(reject(candidate, "weak_short_form_value"));
      continue;
    }
    if (!candidate.standalone) {
      rejected.push(reject(candidate, "not_standalone"));
      continue;
    }
    const duration = candidate.windowEnd - candidate.windowStart;
    if (duration < MIN_WINDOW) {
      rejected.push(reject(candidate, "window_too_short"));
      continue;
    }
    if (duration > MAX_WINDOW) {
      rejected.push(reject(candidate, "window_too_long"));
      continue;
    }
    if (viable.some((kept) => sameIdea(kept, candidate))) {
      rejected.push(reject(candidate, "duplicate_idea"));
      continue;
    }
    viable.push(candidate);
  }

  const selected: SetCandidate[] = [];
  const leftover: SetCandidate[] = [];
  for (const candidate of viable) {
    if (selected.length >= 3) {
      leftover.push(candidate);
      continue;
    }
    if (selected.some((kept) => sameIdea(kept, candidate))) {
      rejected.push(reject(candidate, "cannibalizes_selected"));
      continue;
    }
    selected.push(candidate);
  }

  const alternates = leftover.filter(
    (candidate) => !selected.some((kept) => sameIdea(kept, candidate)),
  );
  for (const extra of leftover.filter((candidate) =>
    selected.some((kept) => sameIdea(kept, candidate)),
  )) {
    rejected.push(reject(extra, "cannibalizes_selected"));
  }

  const setQuestion =
    "If the customer posted these three clips separately, would each feel like a distinct piece worth publishing?" as const;

  if (selected.length < 3) {
    const count = selected.length as 0 | 1 | 2;
    return {
      ok: false,
      productionAllowed: false,
      viableCount: count,
      selected,
      alternates,
      rejected,
      findings: [
        count === 0
          ? "no_professionally_worthwhile_distinct_clips"
          : `only_${count}_professionally_distinct_clips`,
        "do_not_manufacture_filler",
        "do_not_begin_production",
      ],
      setQuestion,
      setQuestionPass: false,
    };
  }

  const pairwiseDistinct = selected.every((candidate, index) =>
    selected.every(
      (other, otherIndex) => index === otherIndex || !sameIdea(candidate, other),
    ),
  );
  if (!pairwiseDistinct) {
    return {
      ok: false,
      productionAllowed: false,
      viableCount: 2,
      selected: selected.slice(0, 2),
      alternates,
      rejected: [
        ...rejected,
        ...selected.slice(2).map((candidate) => reject(candidate, "cannibalizes_selected")),
      ],
      findings: [
        "set_question_failed",
        "do_not_manufacture_filler",
        "do_not_begin_production",
      ],
      setQuestion,
      setQuestionPass: false,
    };
  }

  return {
    ok: true,
    productionAllowed: true,
    viableCount: selected.length + alternates.length,
    selected,
    alternates,
    rejected,
    setQuestion,
    setQuestionPass: true,
  };
}

export function applyPerformanceNotes(
  result: SetDiscoveryResult,
  notes: readonly PerformanceWindowNote[],
): SetDiscoveryResult {
  if (!notes.length) return result;
  const demote = new Set(
    notes.filter((note) => !note.performsWellEnough).map((note) => note.candidateId),
  );
  if (!demote.size) return result;
  const stillSelected = result.selected.filter((candidate) => !demote.has(candidate.id));
  const demoted = result.selected
    .filter((candidate) => demote.has(candidate.id))
    .map((candidate) => reject(candidate, "performance_not_strong_enough"));
  const promoted: SetCandidate[] = [];
  const remainingAlternates: SetCandidate[] = [];
  for (const alternate of result.alternates) {
    if (
      stillSelected.length + promoted.length < 3 &&
      !demote.has(alternate.id) &&
      ![...stillSelected, ...promoted].some((kept) => sameIdea(kept, alternate))
    ) {
      promoted.push(alternate);
    } else {
      remainingAlternates.push(alternate);
    }
  }
  const nextSelected = [...stillSelected, ...promoted];
  if (nextSelected.length === 3) {
    return {
      ok: true,
      productionAllowed: true,
      viableCount: nextSelected.length + remainingAlternates.length,
      selected: nextSelected,
      alternates: remainingAlternates,
      rejected: [...result.rejected, ...demoted],
      setQuestion: result.setQuestion,
      setQuestionPass: true,
    };
  }
  return {
    ok: false,
    productionAllowed: false,
    viableCount: Math.min(2, nextSelected.length) as 0 | 1 | 2,
    selected: nextSelected,
    alternates: remainingAlternates,
    rejected: [...result.rejected, ...demoted],
    findings: [
      `only_${nextSelected.length}_after_performance_review`,
      "do_not_manufacture_filler",
      "do_not_begin_production",
    ],
    setQuestion: result.setQuestion,
    setQuestionPass: false,
  };
}

export function applySetRevision(
  result: SetDiscoverySuccess,
  revision: SetRevision,
): SetDiscoveryResult {
  if (revision.kind === "cta_change" || revision.kind === "end_card_hold") {
    return result;
  }
  const remove = result.selected.find((candidate) => candidate.id === revision.removeId);
  const add = result.alternates.find((candidate) => candidate.id === revision.addId);
  if (!remove || !add) {
    return {
      ok: false,
      productionAllowed: false,
      viableCount: 2,
      selected: result.selected,
      alternates: result.alternates,
      rejected: result.rejected,
      findings: ["set_revision_swap_not_available"],
      setQuestion: result.setQuestion,
      setQuestionPass: false,
    };
  }
  if (result.selected.some((candidate) => candidate.id !== remove.id && sameIdea(candidate, add))) {
    return {
      ok: false,
      productionAllowed: false,
      viableCount: 2,
      selected: result.selected,
      alternates: result.alternates,
      rejected: result.rejected,
      findings: ["set_revision_would_cannibalize"],
      setQuestion: result.setQuestion,
      setQuestionPass: false,
    };
  }
  const selected = result.selected.map((candidate) =>
    candidate.id === remove.id ? add : candidate,
  );
  const alternates = [
    remove,
    ...result.alternates.filter((candidate) => candidate.id !== add.id),
  ];
  return {
    ...result,
    selected,
    alternates,
  };
}
