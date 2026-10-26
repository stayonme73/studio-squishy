import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import type { TranscriptSentence } from "./sentences";
import {
  beatFromSentence,
  classifySentenceRole,
  evaluateStorySequence,
  type EditorialRole,
  type StoryBeat,
  type StoryPlan,
} from "./story-order";

const OFFER = studioShortFormVideoEditingBuildV1.offer;

const STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "in",
  "and",
  "or",
  "of",
  "to",
  "i",
  "my",
  "you",
  "this",
  "that",
  "from",
  "as",
  "well",
  "am",
  "are",
  "was",
  "for",
  "with",
  "some",
  "also",
  "have",
  "has",
  "had",
  "it",
  "on",
  "at",
  "english",
  "language",
  "word",
  "words",
  "speaking",
  "phrases",
  "community",
  "parents",
]);

const BIO_RE =
  /\b(my name is|i am from|i'?m from|i am speaking|united states of america)\b/i;
const HOOKY_RE =
  /\b(favorite|best|secret|never|always|weird|strange|love|hate)\b/i;
const SETUP_RE = /\b(i will teach|let me (tell|show|teach)|today i('m| am) going)\b/i;
const RETAKE_RE =
  /\b(second time|didn't pause|gonna do this|let me (try|do) (this|that) again|start over)\b/i;
const CLOSE_RE =
  /\b(thank you|thanks for|hope you (enjoyed|liked)|that'?s (all|it))\b/i;

export type IdeaCandidate = {
  label: string;
  score: number;
  seedIndex: number;
  sentenceIndexes: number[];
};

export type EditorialBrief =
  | {
      ok: true;
      centralIdea: string;
      whyStrongest: string;
      candidates: IdeaCandidate[];
      hook: StoryBeat;
      body: StoryBeat[];
      close: StoryBeat | null;
      finalOrder: EditorialRole[];
      excluded: Array<{ index: number; text: string; why: string }>;
      wouldEditorChooseThisOverFirstBlock: true;
      firstBlockAlternative: string;
      beats: StoryBeat[];
      plan: Extract<StoryPlan, { ok: true }>;
    }
  | {
      ok: false;
      findings: string[];
      centralIdea?: string;
      whyStrongest?: string;
      candidates: IdeaCandidate[];
      beats: StoryBeat[];
      wouldEditorChooseThisOverFirstBlock: false;
      firstBlockAlternative: string;
    };

function contentTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP.has(word)),
  );
}

export function scoreShortFormValue(sentence: TranscriptSentence): number {
  const text = sentence.text.trim();
  const role = classifySentenceRole(sentence);
  if (role === "exclude") return -8;
  let score = 1;
  if (HOOKY_RE.test(text)) score += 6;
  if (/\bwhich means\b|\bfor example\b/i.test(text)) score += 3;
  if (/\b(favorite|best)\b.+\bis\b/i.test(text)) score += 3;
  const tokens = [...contentTokens(text)];
  score += Math.min(2, tokens.filter((word) => word.length >= 6).length);
  if (tokens.length >= 4 && tokens.length <= 18) score += 1;
  if (BIO_RE.test(text)) score -= 6;
  if (SETUP_RE.test(text)) score -= 4;
  if (RETAKE_RE.test(text)) score -= 8;
  if (CLOSE_RE.test(text)) score -= 2;
  if (sentence.start < 20 && BIO_RE.test(text)) score -= 2;
  return score;
}

function overlap(left: string, right: string): number {
  const a = contentTokens(left);
  const b = contentTokens(right);
  let hit = 0;
  for (const word of a) {
    if (b.has(word)) hit += 1;
  }
  return hit;
}

function firstBlockAlternative(sentences: readonly TranscriptSentence[]): string {
  const usable = sentences.filter(
    (sentence) => classifySentenceRole(sentence) !== "exclude",
  );
  return usable
    .filter((sentence) => sentence.start < 30)
    .slice(0, 3)
    .map((sentence) => sentence.text)
    .join(" ");
}

export function discoverIdeaCandidates(
  sentences: readonly TranscriptSentence[],
): IdeaCandidate[] {
  const scored = sentences
    .map((sentence) => ({
      sentence,
      score: scoreShortFormValue(sentence),
      role: classifySentenceRole(sentence),
    }))
    .filter((row) => row.role !== "exclude" && row.role !== "close");
  const candidates: IdeaCandidate[] = scored
    .map((row) => {
      const members = scored.filter(
        (other) =>
          other.sentence.index === row.sentence.index ||
          overlap(row.sentence.text, other.sentence.text) >= 1 ||
          (other.sentence.index === row.sentence.index + 1 &&
            /\bwhich means\b/i.test(other.sentence.text) &&
            other.sentence.start - row.sentence.end < 8),
      );
      const best =
        [...members].sort((left, right) => right.score - left.score)[0] ?? row;
      const label =
        best.sentence.text.replace(/\s+/g, " ").trim().slice(0, 120) ||
        "untitled idea";
      return {
        label,
        score: Math.max(
          row.score,
          ...members.map((member) => member.score),
        ),
        seedIndex: best.sentence.index,
        sentenceIndexes: members.map((member) => member.sentence.index),
      };
    })
    .sort((left, right) => right.score - left.score);

  const unique: IdeaCandidate[] = [];
  for (const candidate of candidates) {
    if (
      unique.some(
        (kept) =>
          kept.seedIndex === candidate.seedIndex ||
          kept.sentenceIndexes.includes(candidate.seedIndex),
      )
    ) {
      continue;
    }
    unique.push(candidate);
    if (unique.length >= 5) break;
  }
  return unique;
}

function wouldEditorChooseThisOverFirstBlock(
  picked: readonly StoryBeat[],
  sentences: readonly TranscriptSentence[],
): boolean {
  const firstMax = Math.max(
    0,
    ...sentences
      .filter((sentence) => sentence.start < 30)
      .map((sentence) => scoreShortFormValue(sentence)),
  );
  const laterMax = Math.max(
    0,
    ...sentences
      .filter((sentence) => sentence.start >= 30)
      .map((sentence) => scoreShortFormValue(sentence)),
  );
  const laterStrong = laterMax >= firstMax + 3 && laterMax >= 6;
  const allInFirstBlock = picked.every((beat) => beat.start < 30);
  if (allInFirstBlock && laterStrong) return false;
  return true;
}

export function pickIdeaFirstPlan(
  sentences: readonly TranscriptSentence[],
  minSeconds = OFFER.outputMinSeconds,
  maxSeconds = OFFER.outputMaxSeconds,
): EditorialBrief {
  const candidates = discoverIdeaCandidates(sentences);
  const firstBlock = firstBlockAlternative(sentences);
  if (!candidates.length) {
    return {
      ok: false,
      findings: ["no_idea_candidates"],
      candidates,
      beats: [],
      wouldEditorChooseThisOverFirstBlock: false,
      firstBlockAlternative: firstBlock,
    };
  }

  let lastFailure: EditorialBrief | null = null;
  for (const chosen of candidates) {
    const hookSeed =
      sentences.find(
        (sentence) =>
          chosen.sentenceIndexes.includes(sentence.index) &&
          HOOKY_RE.test(sentence.text),
      ) ?? sentences[chosen.seedIndex];
    if (!hookSeed) continue;
    const hook = { ...beatFromSentence(hookSeed), role: "hook" as const };
    const seedScore = scoreShortFormValue(hookSeed);
    const later = sentences
      .filter(
        (sentence) =>
          sentence.index !== hookSeed.index &&
          sentence.start + 0.05 >= hook.start,
      )
      .sort((left, right) => left.start - right.start);
    const closeSentence = later.find(
      (sentence) =>
        (classifySentenceRole(sentence) === "close" ||
          classifySentenceRole(sentence) === "cta_signoff") &&
        sentence.start - hook.end <= 40,
    );
    const picked: StoryBeat[] = [hook];
    let spoken = hook.end - hook.start;
    for (const sentence of later) {
      if (spoken >= minSeconds) break;
      const role = classifySentenceRole(sentence);
      if (role === "exclude" || role === "close" || role === "cta_signoff") {
        continue;
      }
      if (
        BIO_RE.test(sentence.text) ||
        SETUP_RE.test(sentence.text) ||
        RETAKE_RE.test(sentence.text)
      ) {
        continue;
      }
      const otherScore = scoreShortFormValue(sentence);
      const sameIdea =
        overlap(hookSeed.text, sentence.text) >= 1 ||
        chosen.sentenceIndexes.includes(sentence.index);
      if (!sameIdea && otherScore >= seedScore + 3) continue;
      const duration = sentence.end - sentence.start;
      if (spoken + duration > maxSeconds + 0.05) continue;
      picked.push(
        beatFromSentence(sentence, role === "hook" ? "body" : role),
      );
      spoken += duration;
    }
    if (closeSentence && spoken < maxSeconds) {
      const last = picked[picked.length - 1]!;
      const duration = closeSentence.end - closeSentence.start;
      if (
        closeSentence.start + 0.05 >= last.end &&
        spoken + duration <= maxSeconds + 0.05
      ) {
        picked.push({
          ...beatFromSentence(closeSentence),
          role:
            classifySentenceRole(closeSentence) === "cta_signoff"
              ? "cta_signoff"
              : "close",
        });
      }
    }
    const plan = evaluateStorySequence(picked);
    const ideaOverFirst = wouldEditorChooseThisOverFirstBlock(picked, sentences);
    const excluded = sentences
      .filter((sentence) => !picked.some((beat) => beat.index === sentence.index))
      .map((sentence) => ({
        index: sentence.index,
        text: sentence.text,
        why: BIO_RE.test(sentence.text)
          ? "generic biography / intro"
          : SETUP_RE.test(sentence.text)
            ? "generic setup"
            : RETAKE_RE.test(sentence.text)
              ? "retake / production filler"
              : classifySentenceRole(sentence) === "exclude"
                ? "filler or greeting"
                : "off the chosen idea",
      }));
    if (!plan.ok || !ideaOverFirst) {
      lastFailure = {
        ok: false,
        findings: [
          ...(plan.ok ? [] : plan.findings),
          ...(ideaOverFirst
            ? []
            : ["first_block_bias_stronger_later_idea_exists"]),
        ],
        centralIdea: chosen.label,
        whyStrongest:
          "Highest short-form value among spoken ideas, but the assembled cut failed the editor gate.",
        candidates,
        beats: picked,
        wouldEditorChooseThisOverFirstBlock: false,
        firstBlockAlternative: firstBlock,
      };
      continue;
    }
    return {
      ok: true,
      centralIdea: chosen.label,
      whyStrongest:
        "Specific, memorable, and hookable spoken material. Stronger short-form subject than a polite opening biography.",
      candidates,
      hook,
      body: plan.beats.filter(
        (beat) =>
          beat.role === "body" || beat.role === "proof" || beat.role === "context",
      ),
      close:
        plan.beats.find(
          (beat) => beat.role === "close" || beat.role === "cta_signoff",
        ) ?? null,
      finalOrder: plan.roles,
      excluded,
      wouldEditorChooseThisOverFirstBlock: true,
      firstBlockAlternative: firstBlock,
      beats: plan.beats,
      plan,
    };
  }

  return (
    lastFailure ?? {
      ok: false,
      findings: ["no_assemblable_idea"],
      candidates,
      beats: [],
      wouldEditorChooseThisOverFirstBlock: false,
      firstBlockAlternative: firstBlock,
    }
  );
}

export function briefFromStoryPlan(
  sentences: readonly TranscriptSentence[],
  plan: StoryPlan,
  idea?: { centralIdea: string; whyStrongest: string },
): EditorialBrief {
  const candidates = discoverIdeaCandidates(sentences);
  const firstBlock = firstBlockAlternative(sentences);
  if (!plan.ok) {
    return {
      ok: false,
      findings: plan.findings,
      centralIdea: idea?.centralIdea,
      whyStrongest: idea?.whyStrongest,
      candidates,
      beats: plan.beats,
      wouldEditorChooseThisOverFirstBlock: false,
      firstBlockAlternative: firstBlock,
    };
  }
  const ideaOverFirst = wouldEditorChooseThisOverFirstBlock(plan.beats, sentences);
  if (!ideaOverFirst) {
    return {
      ok: false,
      findings: ["first_block_bias_stronger_later_idea_exists"],
      centralIdea: idea?.centralIdea ?? plan.beats[0]?.text,
      whyStrongest: idea?.whyStrongest,
      candidates,
      beats: plan.beats,
      wouldEditorChooseThisOverFirstBlock: false,
      firstBlockAlternative: firstBlock,
    };
  }
  return {
    ok: true,
    centralIdea: idea?.centralIdea ?? plan.beats[0]?.text ?? "spoken idea",
    whyStrongest:
      idea?.whyStrongest ??
      "Model-selected idea assembled into a coherent spoken short.",
    candidates,
    hook: plan.beats[0]!,
    body: plan.beats.filter(
      (beat) => beat.role === "body" || beat.role === "proof" || beat.role === "context",
    ),
    close:
      plan.beats.find(
        (beat) => beat.role === "close" || beat.role === "cta_signoff",
      ) ?? null,
    finalOrder: plan.roles,
    excluded: sentences
      .filter((sentence) => !plan.beats.some((beat) => beat.index === sentence.index))
      .map((sentence) => ({
        index: sentence.index,
        text: sentence.text,
        why: "not needed for the chosen idea",
      })),
    wouldEditorChooseThisOverFirstBlock: true,
    firstBlockAlternative: firstBlock,
    beats: plan.beats,
    plan,
  };
}
