import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import type {
  EditDecisionClip,
  EditDecisionFailure,
  EditDecisionList,
  FootageIntake,
  SpeechIsland,
  SpeechWord,
  TimedCaption,
} from "./types";

const OFFER = studioShortFormVideoEditingBuildV1.offer;
const GAP_SECONDS = 0.5;
const FALSE_START_MAX = 0.8;
const CTA_HOLD_SECONDS =
  studioShortFormVideoEditingBuildV1.finishing.ctaHoldSeconds;
const WORDS_PER_CAPTION = 6;

/** Current-door burn. The historical pack keeps the bar by omitting these fields. */
export const SHORT_FORM_CAPTION_PRESENTATION = {
  background: "transparent",
  stroke: "#111111",
  bottomPx: 148,
  bandHeight: 120,
} as const;

function displayWord(word: SpeechWord): string {
  return (word.punctuatedWord ?? word.word).trim();
}

function islandText(words: readonly SpeechWord[]): string {
  return words.map(displayWord).join(" ").replace(/\s+/g, " ").trim();
}

const DANGLING_CAPTION_WORDS = new Set([
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
  "from",
  "as",
  "is",
  "with",
]);

function chunkDisplay<T extends { punctuatedWord?: string; word: string }>(word: T): string {
  return (word.punctuatedWord ?? word.word).trim();
}

function chunkBare(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function chunkEndsSentence(text: string): boolean {
  return /[.!?]$/.test(text);
}

/** Keep a spoken sentence together, then break before a dangling word. */
function reflowSpokenCaptionChunks<T extends { punctuatedWord?: string; word: string }>(
  chunks: readonly (readonly T[])[],
): T[][] {
  const sentences: T[][] = [];
  let sentence: T[] = [];
  for (const chunk of chunks) {
    sentence.push(...chunk);
    const last = sentence[sentence.length - 1];
    if (last && chunkEndsSentence(chunkDisplay(last))) {
      sentences.push(sentence);
      sentence = [];
    }
  }
  if (sentence.length) sentences.push(sentence);

  const out: T[][] = [];
  for (const words of sentences) {
    if (words.length <= 7) {
      if (words.length) out.push(words);
      continue;
    }
    let index = 0;
    while (index < words.length) {
      const remain = words.length - index;
      if (remain <= 7) {
        out.push(words.slice(index));
        break;
      }
      let take = Math.min(6, remain - 3);
      const travelsWithNext = new Set(["to", "a", "an", "the"]);
      const pullDanglingEnd = () => {
        while (
          take > 3 &&
          DANGLING_CAPTION_WORDS.has(chunkBare(chunkDisplay(words[index + take - 1]!)))
        ) {
          take -= 1;
        }
      };
      pullDanglingEnd();
      if (
        take > 3 &&
        travelsWithNext.has(chunkBare(chunkDisplay(words[index + take - 2]!)))
      ) {
        take -= 1;
        pullDanglingEnd();
      }
      out.push(words.slice(index, index + take));
      index += take;
    }
  }
  return out;
}

export function chunkSpokenCaptionWords<T extends { punctuatedWord?: string; word: string }>(
  words: readonly T[],
  maxWords = WORDS_PER_CAPTION,
): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  for (const word of words) {
    const next = [...current, word];
    const display = chunkDisplay(word);
    const endsThought = chunkEndsSentence(display);
    if (next.length > maxWords && current.length > 0) {
      chunks.push(current);
      current = [word];
    } else {
      current = next;
    }
    if (current.length > 0 && endsThought && current.length >= 3 && current.length <= maxWords) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return reflowSpokenCaptionChunks(chunks);
}

export function buildSpeechIslands(
  words: readonly SpeechWord[],
  options?: { preserveInputOrder?: boolean },
): SpeechIsland[] {
  const ordered = options?.preserveInputOrder
    ? [...words]
    : [...words].sort((a, b) => a.start - b.start);
  const islands: SpeechIsland[] = [];
  let current: SpeechWord[] = [];

  for (const word of ordered) {
    const prev = current[current.length - 1];
    const jumpedBack = Boolean(prev && word.start + 0.05 < prev.start);
    if (prev && (word.start - prev.end > GAP_SECONDS || jumpedBack)) {
      islands.push({
        start: current[0]!.start,
        end: prev.end,
        words: current,
        text: islandText(current),
      });
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length) {
    islands.push({
      start: current[0]!.start,
      end: current[current.length - 1]!.end,
      words: current,
      text: islandText(current),
    });
  }
  return islands;
}

function islandFromWords(words: readonly SpeechWord[]): SpeechIsland {
  return {
    start: words[0]!.start,
    end: words[words.length - 1]!.end,
    words,
    text: islandText(words),
  };
}

function splitLongIslands(
  islands: readonly SpeechIsland[],
  maxSeconds: number,
): SpeechIsland[] {
  const out: SpeechIsland[] = [];
  for (const island of islands) {
    const duration = island.end - island.start;
    if (duration <= maxSeconds + 0.05 || island.words.length < 2) {
      out.push(island);
      continue;
    }
    let chunk: SpeechWord[] = [];
    let chunkStart = island.words[0]!.start;
    for (const word of island.words) {
      if (chunk.length && word.end - chunkStart > maxSeconds) {
        out.push(islandFromWords(chunk));
        chunk = [word];
        chunkStart = word.start;
      } else {
        chunk.push(word);
      }
    }
    if (chunk.length) out.push(islandFromWords(chunk));
  }
  return out;
}

function dropFalseStarts(islands: readonly SpeechIsland[]): {
  kept: SpeechIsland[];
  dropped: number;
} {
  let dropped = 0;
  const kept = islands.filter((island) => {
    const dur = island.end - island.start;
    if (dur < FALSE_START_MAX) {
      dropped += 1;
      return false;
    }
    return true;
  });
  return { kept, dropped };
}

function deadSpaceSeconds(
  sourceDuration: number,
  islands: readonly SpeechIsland[],
): number {
  const spoken = islands.reduce((sum, i) => sum + (i.end - i.start), 0);
  return Math.max(0, Number((sourceDuration - spoken).toFixed(3)));
}

function hasSourceJump(islands: readonly SpeechIsland[]): boolean {
  return islands.some((island, index) => {
    const prev = islands[index - 1];
    return Boolean(prev && island.start - prev.end > 1.25);
  });
}

function selectMultiSegmentIslands(
  islands: readonly SpeechIsland[],
  maxSeconds: number,
  minSeconds: number,
): SpeechIsland[] {
  if (!islands.length) return [];
  const hook = islands[0]!;
  const closer = islands[islands.length - 1]!;
  const middle = islands.slice(1, -1);
  const picked: SpeechIsland[] = [hook];
  let spoken = hook.end - hook.start;

  for (let i = 0; i < middle.length; i += 1) {
    const island = middle[i]!;
    const duration = island.end - island.start;
    if (spoken + duration > maxSeconds + 0.05) continue;
    if (i === 0 && middle.length > 2 && spoken > 8) continue;
    picked.push(island);
    spoken += duration;
    if (spoken >= minSeconds && picked.length >= 3) break;
  }

  if (closer !== hook && !picked.includes(closer)) {
    const duration = closer.end - closer.start;
    if (spoken + duration <= maxSeconds + 0.05) {
      picked.push(closer);
      spoken += duration;
    }
  }

  if (spoken < minSeconds) {
    for (const island of islands) {
      if (picked.includes(island)) continue;
      const duration = island.end - island.start;
      if (spoken + duration > maxSeconds + 0.05) continue;
      picked.push(island);
      spoken += duration;
      if (spoken >= minSeconds) break;
    }
  }

  return picked.sort((left, right) => left.start - right.start);
}

function densestWindow(
  islands: readonly SpeechIsland[],
  maxSeconds: number,
): SpeechIsland[] {
  if (!islands.length) return [];
  let best: SpeechIsland[] = [islands[0]!];
  let bestSpoken = islands[0]!.end - islands[0]!.start;

  for (let i = 0; i < islands.length; i += 1) {
    let spoken = 0;
    const window: SpeechIsland[] = [];
    for (let j = i; j < islands.length; j += 1) {
      const next = islands[j]!;
      const nextSpoken = spoken + (next.end - next.start);
      if (nextSpoken > maxSeconds + 0.05) break;
      window.push(next);
      spoken = nextSpoken;
    }
    if (spoken > bestSpoken) {
      best = window;
      bestSpoken = spoken;
    }
  }
  return best;
}

function mustKeepIncluded(
  islands: readonly SpeechIsland[],
  mustKeepLine?: string,
): boolean {
  const needle = mustKeepLine?.trim().toLowerCase();
  if (!needle) return true;
  return islands.some((island) => island.text.toLowerCase().includes(needle));
}

function captionsFromIslands(
  islands: readonly SpeechIsland[],
  clips: readonly EditDecisionClip[],
  ctaText: string,
  includeCta = true,
): { captions: TimedCaption[]; outputDurationSeconds: number } {
  const lastClip = clips[clips.length - 1];
  const performanceEnd = lastClip
    ? lastClip.timelineStart + lastClip.timelineLength
    : 0;
  const ctaStart = Number(performanceEnd.toFixed(3));
  const outputEnd = includeCta
    ? Number((performanceEnd + CTA_HOLD_SECONDS).toFixed(3))
    : ctaStart;
  const captions: TimedCaption[] = [];
  let first = true;
  islands.forEach((island, clipIndex) => {
    const clip = clips[clipIndex];
    if (!clip) return;
    for (const chunk of chunkSpokenCaptionWords(island.words, WORDS_PER_CAPTION)) {
      const start = Number(
        (
          clip.timelineStart +
          (chunk[0]!.start - island.start)
        ).toFixed(3),
      );
      const rawEnd = Number(
        (
          clip.timelineStart +
          (chunk[chunk.length - 1]!.end - island.start)
        ).toFixed(3),
      );
      if (start >= ctaStart) continue;
      captions.push({
        start: Math.max(0, start),
        end: Math.max(0.2, Math.min(rawEnd, ctaStart - 0.05)),
        text: islandText(chunk),
        role: first ? "hook" : "speech",
      });
      first = false;
    }
  });
  if (includeCta && ctaText.trim()) {
    captions.push({
      start: ctaStart,
      end: outputEnd,
      text: ctaText.trim(),
      role: "cta",
    });
  }
  return { captions, outputDurationSeconds: outputEnd };
}

function clipsFromIslands(
  islands: readonly SpeechIsland[],
): EditDecisionClip[] {
  const origin = islands[0]?.start ?? 0;
  let cursor = 0;
  return islands.map((island, index) => {
    const length = Number((island.end - island.start).toFixed(3));
    const clip: EditDecisionClip = {
      sourceTrim: Number(island.start.toFixed(3)),
      sourceLength: length,
      timelineStart: Number(cursor.toFixed(3)),
      timelineLength: length,
      text: island.text,
      role: index === 0 ? "hook" : "body",
    };
    cursor += length;
    return clip;
  });
}

function mergeCloseIslands(
  islands: readonly SpeechIsland[],
  gapSeconds = 4,
): SpeechIsland[] {
  const merged: SpeechIsland[] = [];
  for (const island of islands) {
    const prev = merged[merged.length - 1];
    if (prev && island.start - prev.end <= gapSeconds) {
      merged[merged.length - 1] = islandFromWords([
        ...prev.words,
        ...island.words,
      ]);
    } else {
      merged.push(island);
    }
  }
  return merged;
}

export function buildEditDecisionList(input: {
  words: readonly SpeechWord[];
  intake: FootageIntake;
  sourceDurationSeconds: number;
  preserveInputOrder?: boolean;
  lockSelectedIslands?: boolean;
  lockContinuousRange?: { start: number; end: number };
}): EditDecisionList | EditDecisionFailure {
  if (input.intake.skuId !== "v2-rtu-short-form-video-edit") {
    return {
      ok: false,
      code: "SHOTSTACK_PROMPT_FORBIDDEN",
      message: "EDL is only for the new footage SKU.",
    };
  }
  if (!input.intake.rightsCleared) {
    return {
      ok: false,
      code: "RIGHTS_NOT_CLEARED",
      message: "Footage is not rights-cleared.",
    };
  }
  const ctaWords = input.intake.ctaText.trim();
  const omitCta = !ctaWords && input.intake.ctaTreatment === "none";
  if (!ctaWords && !omitCta) {
    return {
      ok: false,
      code: "MISSING_CTA",
      message: "Customer CTA words are required.",
    };
  }
  if (input.sourceDurationSeconds > OFFER.maxSourceSeconds) {
    return {
      ok: false,
      code: "SOURCE_TOO_LONG",
      message: "Source exceeds 3 minutes.",
    };
  }

  if (input.lockContinuousRange) {
    const start = input.lockContinuousRange.start;
    const end = input.lockContinuousRange.end;
    const duration = Number((end - start).toFixed(3));
    if (end <= start) {
      return {
        ok: false,
        code: "NO_USABLE_SPEECH",
        message: "Performance range is empty.",
      };
    }
    if (duration < OFFER.outputMinSeconds || duration > OFFER.outputMaxSeconds + 0.25) {
      return {
        ok: false,
        code: "INSUFFICIENT_USABLE_SPEECH",
        message: "Performance range is outside 15–30 seconds.",
      };
    }
    const rangeWords = input.words.filter(
      (word) => word.end > start && word.start < end,
    );
    if (!rangeWords.length) {
      return {
        ok: false,
        code: "NO_USABLE_SPEECH",
        message: "No spoken words inside the performance range.",
      };
    }
    const island: SpeechIsland = {
      start,
      end,
      words: rangeWords,
      text: islandText(rangeWords),
    };
    const clips = clipsFromIslands([island]);
    const captioned = captionsFromIslands(
      [island],
      clips,
      input.intake.ctaText,
      !omitCta,
    );
    return {
      ok: true,
      sourceDurationSeconds: input.sourceDurationSeconds,
      outputDurationSeconds: captioned.outputDurationSeconds,
      clips,
      captions: captioned.captions,
      droppedFalseStarts: 0,
      droppedDeadSpaceSeconds: 0,
      selection: "performance_watch",
      selectionWinner: "performance_watch",
    };
  }

  const islands = buildSpeechIslands(input.words, {
    preserveInputOrder: input.preserveInputOrder,
  });
  const { kept: usable, dropped } = dropFalseStarts(islands);
  const kept = input.lockSelectedIslands
    ? mergeCloseIslands(
        usable.filter((island, index, all) => {
          const prev = all[index - 1];
          return !prev || island.start + 0.05 >= prev.end;
        }),
        2,
      )
    : splitLongIslands(mergeCloseIslands(usable), 10);
  if (!kept.length) {
    return {
      ok: false,
      code: "NO_USABLE_SPEECH",
      message: "No usable speech after removing dead space and false starts.",
    };
  }

  const spoken = kept.reduce((sum, i) => sum + (i.end - i.start), 0);
  if (spoken < OFFER.outputMinSeconds) {
    return {
      ok: false,
      code: "INSUFFICIENT_USABLE_SPEECH",
      message: "Usable speech is under 15 seconds. Wait. Do not pad.",
    };
  }

  let selected = kept;
  let selection: EditDecisionList["selection"] = input.lockSelectedIslands
    ? "multi_segment"
    : "full_usable";
  if (
    !input.lockSelectedIslands &&
    (spoken > OFFER.outputMaxSeconds || kept.length > 2)
  ) {
    selected = selectMultiSegmentIslands(
      kept,
      OFFER.outputMaxSeconds,
      OFFER.outputMinSeconds,
    );
    selection = hasSourceJump(selected) ? "multi_segment" : "densest_window";
    if (!mustKeepIncluded(selected, input.intake.mustKeepLine)) {
      const forced = kept.filter((island) =>
        mustKeepIncluded([island], input.intake.mustKeepLine),
      );
      selected = selectMultiSegmentIslands(
        [...forced, ...kept.filter((i) => !forced.includes(i))],
        OFFER.outputMaxSeconds,
        OFFER.outputMinSeconds,
      );
      if (!mustKeepIncluded(selected, input.intake.mustKeepLine)) {
        selected = densestWindow(
          [...forced, ...kept.filter((i) => !forced.includes(i))],
          OFFER.outputMaxSeconds,
        );
        selection = "densest_window";
      }
    }
    if (selected.reduce((sum, i) => sum + (i.end - i.start), 0) < OFFER.outputMinSeconds) {
      selected = densestWindow(kept, OFFER.outputMaxSeconds);
      selection = "densest_window";
    }
  }

  const selectedSpoken = selected.reduce(
    (sum, i) => sum + (i.end - i.start),
    0,
  );
  if (selectedSpoken < OFFER.outputMinSeconds) {
    return {
      ok: false,
      code: "INSUFFICIENT_USABLE_SPEECH",
      message: "Windowed speech is under 15 seconds.",
    };
  }

  const clips = clipsFromIslands(selected);
  const captioned = captionsFromIslands(
    selected,
    clips,
    input.intake.ctaText,
    !omitCta,
  );

  return {
    ok: true,
    sourceDurationSeconds: input.sourceDurationSeconds,
    outputDurationSeconds: captioned.outputDurationSeconds,
    clips,
    captions: captioned.captions,
    droppedFalseStarts: dropped,
    droppedDeadSpaceSeconds: deadSpaceSeconds(input.sourceDurationSeconds, kept),
    selection,
  };
}
