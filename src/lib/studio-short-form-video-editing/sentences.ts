import type { EditorialRole } from "./story-order";
import type { EditDecisionList, SpeechWord } from "./types";

export type TranscriptSentence = {
  index: number;
  text: string;
  start: number;
  end: number;
  words: readonly SpeechWord[];
};

export type SentenceIndexPick = {
  startIndex: number;
  endIndex: number;
  indexes: number[];
  roles: EditorialRole[];
  idea?: string;
  why?: string;
  excludedWhy?: string;
};

const WEAK_OPEN = /^(and|so|but|um|uh|like|you know)\b/i;

function displayWord(word: SpeechWord): string {
  return (word.punctuatedWord ?? word.word).trim();
}

function sentenceText(words: readonly SpeechWord[]): string {
  return words.map(displayWord).join(" ").replace(/\s+/g, " ").trim();
}

export function buildTranscriptSentences(
  words: readonly SpeechWord[],
): TranscriptSentence[] {
  const ordered = [...words].sort((a, b) => a.start - b.start);
  const sentences: TranscriptSentence[] = [];
  let current: SpeechWord[] = [];
  for (const word of ordered) {
    current.push(word);
    if (/[.!?…]["')\]]*$/.test(displayWord(word)) && current.length) {
      sentences.push({
        index: sentences.length,
        text: sentenceText(current),
        start: current[0]!.start,
        end: current[current.length - 1]!.end,
        words: current,
      });
      current = [];
    }
  }
  if (current.length) {
    sentences.push({
      index: sentences.length,
      text: sentenceText(current),
      start: current[0]!.start,
      end: current[current.length - 1]!.end,
      words: current,
    });
  }
  return sentences;
}

export function wordsFromSentenceIndexes(
  sentences: readonly TranscriptSentence[],
  indexes: readonly number[],
): SpeechWord[] | null {
  if (!indexes.length) return null;
  const words: SpeechWord[] = [];
  for (const index of indexes) {
    if (!Number.isInteger(index) || index < 0 || index >= sentences.length) {
      return null;
    }
    words.push(...sentences[index]!.words);
  }
  return words;
}

export function wordsFromSentenceRange(
  sentences: readonly TranscriptSentence[],
  pick: SentenceIndexPick,
): SpeechWord[] | null {
  const indexes =
    pick.indexes?.length > 0
      ? pick.indexes
      : Array.from(
          { length: pick.endIndex - pick.startIndex + 1 },
          (_, offset) => pick.startIndex + offset,
        );
  return wordsFromSentenceIndexes(sentences, indexes);
}

export function parseSentenceIndexPick(raw: string): SentenceIndexPick | null {
  const fenced = raw.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? raw.trim();
  try {
    const parsed = JSON.parse(candidate) as {
      startIndex?: unknown;
      endIndex?: unknown;
      indexes?: unknown;
      beats?: unknown;
      idea?: unknown;
      why?: unknown;
      excludedWhy?: unknown;
    };
    if (Array.isArray(parsed.beats) && parsed.beats.length) {
      const beats = parsed.beats.filter(
        (row): row is { index: number; role: EditorialRole } =>
          Boolean(row) &&
          typeof row === "object" &&
          typeof (row as { index?: unknown }).index === "number" &&
          Number.isInteger((row as { index: number }).index) &&
          typeof (row as { role?: unknown }).role === "string",
      );
      const indexes = beats.map((beat) => beat.index);
      if (!indexes.length) return null;
      return {
        startIndex: indexes[0]!,
        endIndex: indexes[indexes.length - 1]!,
        indexes,
        roles: beats.map((beat) => beat.role),
        idea: typeof parsed.idea === "string" ? parsed.idea : undefined,
        why: typeof parsed.why === "string" ? parsed.why : undefined,
        excludedWhy:
          typeof parsed.excludedWhy === "string" ? parsed.excludedWhy : undefined,
      };
    }
    if (Array.isArray(parsed.indexes) && parsed.indexes.length) {
      const indexes = parsed.indexes.filter(
        (value): value is number =>
          typeof value === "number" && Number.isInteger(value),
      );
      if (!indexes.length) return null;
      return {
        startIndex: indexes[0]!,
        endIndex: indexes[indexes.length - 1]!,
        indexes,
        roles: [],
      };
    }
    if (
      typeof parsed.startIndex !== "number" ||
      typeof parsed.endIndex !== "number"
    ) {
      return null;
    }
    const startIndex = parsed.startIndex;
    const endIndex = parsed.endIndex;
    return {
      startIndex,
      endIndex,
      indexes: Array.from(
        { length: endIndex - startIndex + 1 },
        (_, offset) => startIndex + offset,
      ),
      roles: [],
    };
  } catch {
    return null;
  }
}

export function scoreEditCoherence(edl: EditDecisionList): number {
  if (!edl.ok) return -100;
  let score = 0;
  const hook = edl.clips[0]?.text.trim() ?? "";
  const lastBody =
    [...edl.clips].reverse().find((clip) => clip.role !== "cta_hold")?.text ??
    "";
  if (!WEAK_OPEN.test(hook)) score += 3;
  else score -= 2;
  if (/[.!?]"?$/.test(lastBody.trim())) score += 2;
  if (edl.outputDurationSeconds >= 18 && edl.outputDurationSeconds <= 28) {
    score += 2;
  } else if (
    edl.outputDurationSeconds >= 15 &&
    edl.outputDurationSeconds <= 30.25
  ) {
    score += 1;
  }
  if (edl.droppedFalseStarts > 0) score += 1;
  const hookCaption = edl.captions.find((caption) => caption.role === "hook");
  if (hookCaption && !WEAK_OPEN.test(hookCaption.text.trim())) score += 2;
  if (edl.clips.length >= 3) score += 4;
  else if (edl.clips.length >= 2) score += 3;
  else score -= 3;
  const trims = edl.clips.map((clip) => clip.sourceTrim);
  if (trims.some((trim, index) => index > 0 && trim - trims[index - 1]! > 1.25)) {
    score += 3;
  }
  return score;
}

export function chooseStrongerEdit(
  deterministic: EditDecisionList,
  sentenceIndex: EditDecisionList | null,
): {
  edl: EditDecisionList;
  winner: "deterministic" | "sentence_index";
  scores: { deterministic: number; sentenceIndex: number | null };
} {
  const deterministicScore = scoreEditCoherence(deterministic);
  if (!sentenceIndex?.ok) {
    return {
      edl: { ...deterministic, selectionWinner: "deterministic" },
      winner: "deterministic",
      scores: { deterministic: deterministicScore, sentenceIndex: null },
    };
  }
  const modelScore = scoreEditCoherence(sentenceIndex);
  const modelIsEdit = sentenceIndex.clips.length >= 2;
  const detIsBlock = deterministic.clips.length < 2;
  const winner =
    modelIsEdit && (detIsBlock || modelScore >= deterministicScore - 1)
      ? "sentence_index"
      : modelScore > deterministicScore
        ? "sentence_index"
        : "deterministic";
  const edl = winner === "sentence_index" ? sentenceIndex : deterministic;
  return {
    edl: {
      ...edl,
      selection: winner === "sentence_index" ? "sentence_index" : edl.selection,
      selectionWinner: winner,
      coherenceScores: {
        deterministic: deterministicScore,
        sentenceIndex: modelScore,
      },
    },
    winner,
    scores: { deterministic: deterministicScore, sentenceIndex: modelScore },
  };
}
