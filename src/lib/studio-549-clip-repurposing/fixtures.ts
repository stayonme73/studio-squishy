import type { TranscriptSentence } from "@/lib/studio-short-form-video-editing/sentences";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

import type { Clip549SourceFacts } from "./eligibility";

function wordsFor(text: string, start: number, end: number): SpeechWord[] {
  const parts = text.split(/\s+/).filter(Boolean);
  const step = (end - start) / Math.max(1, parts.length);
  return parts.map((word, index) => ({
    word: word.replace(/[.,!?]/g, "").toLowerCase(),
    start: start + index * step,
    end: start + (index + 1) * step,
    punctuatedWord: word,
  }));
}

function sentence(
  index: number,
  start: number,
  end: number,
  text: string,
): TranscriptSentence {
  return {
    index,
    start,
    end,
    text,
    words: wordsFor(text, start, end),
  };
}

function pack(
  rows: Array<{ start: number; end: number; text: string }>,
): TranscriptSentence[] {
  return rows.map((row, index) => sentence(index, row.start, row.end, row.text));
}

export function eligibleFacts(
  durationSeconds: number,
  extra?: Partial<Clip549SourceFacts>,
): Clip549SourceFacts {
  return {
    durationSeconds,
    format: "mp4",
    orientation: "native_vertical",
    language: "en",
    primaryOnCameraSpeakerCount: 1,
    speechIntelligible: true,
    rightsCleared: true,
    likenessCleared: true,
    ctaText: "Start at thestudiocompany7.com",
    ...extra,
  };
}

const IDEAS = [
  {
    a: "The secret to pricing a custom cake is charging for the sketch before you bake.",
    b: "I never give the drawing away, because that is where the real design work lives.",
  },
  {
    a: "I never light a face from the ceiling if I want the eyes to stay alive.",
    b: "The best cheap fix is a lamp at eye level, not a brighter overhead bulb.",
  },
  {
    a: "The best guest question I ask is what they almost quit last year.",
    b: "That answer is always more useful than asking how they got started.",
  },
  {
    a: "Always write the offer on paper before you shoot, or the clip has nowhere to land.",
    b: "I love a camera that already knows the sentence it is trying to sell.",
  },
  {
    a: "I would rather sell 10 things we can do extremely well than 50 things we can barely manage.",
    b: "A bigger menu looks impressive until people stop trusting the work.",
  },
  {
    a: "You hire somebody because you do not want to become the project manager.",
    b: "That defeats the whole purpose of paying somebody if you still run the job.",
  },
  {
    a: "A button in the wrong place can make the whole page feel awkward.",
    b: "The customer may not know the technical reason, but they feel it.",
  },
] as const;

function ideasAt(
  stamps: readonly number[],
  count: number,
): Array<{ start: number; end: number; text: string }> {
  const rows: Array<{ start: number; end: number; text: string }> = [
    { start: 4, end: 10, text: "Hi. My name is Daniel and I am from the United States of America." },
  ];
  for (let i = 0; i < count; i += 1) {
    const start = stamps[i] ?? 20 + i * 80;
    const idea = IDEAS[i % IDEAS.length]!;
    rows.push({ start, end: start + 8, text: idea.a });
    rows.push({ start: start + 9, end: start + 18, text: idea.b });
  }
  return rows;
}

export function fixtureTwoMinuteSource() {
  return {
    sourceDurationSeconds: 120,
    sentences: pack(ideasAt([12, 42, 78], 3)),
  };
}

export function fixtureSixtyMinuteSource() {
  return {
    sourceDurationSeconds: 3600,
    sentences: pack(ideasAt([90, 900, 1800, 2700, 3520], 5)),
  };
}

export function fixtureZeroSource() {
  return {
    sourceDurationSeconds: 16 * 60,
    sentences: pack([
      { start: 4, end: 10, text: "Hi. How are you?" },
      { start: 12, end: 20, text: "My name is Sam and I am from the United States of America." },
      { start: 40, end: 48, text: "Today I am going to teach a little, and then we will see." },
      { start: 80, end: 88, text: "Let me show you the room. This is the table and that is the wall." },
      { start: 200, end: 208, text: "I am from a small town and I am speaking English today." },
    ]),
  };
}

export function fixtureOneSource() {
  return {
    sourceDurationSeconds: 18 * 60,
    sentences: pack([
      { start: 5, end: 12, text: "Hello. My name is Maya and I am from Ohio." },
      ...ideasAt([120], 1),
      { start: 400, end: 406, text: "Thanks for watching. That is all." },
    ]),
  };
}

export function fixtureTwoSource() {
  return {
    sourceDurationSeconds: 18 * 60,
    sentences: pack(ideasAt([120, 240], 2)),
  };
}

export function fixtureThreeSource() {
  return {
    sourceDurationSeconds: 20 * 60,
    sentences: pack(ideasAt([90, 200, 360], 3)),
  };
}

export function fixtureFourSource() {
  return {
    sourceDurationSeconds: 22 * 60,
    sentences: pack(ideasAt([90, 200, 360, 480], 4)),
  };
}

export function fixtureFiveSource() {
  return {
    sourceDurationSeconds: 24 * 60,
    sentences: pack(ideasAt([90, 200, 360, 480, 600], 5)),
  };
}

export function fixtureMoreThanFiveSource() {
  return {
    sourceDurationSeconds: 30 * 60,
    sentences: pack([
      ...ideasAt([90, 200, 360, 480, 600, 720, 840], 7),
      {
        start: 960,
        end: 968,
        text: "The secret to pricing a custom cake is charging for the sketch first.",
      },
      {
        start: 969,
        end: 976,
        text: "Same pricing point again, just said a second time.",
      },
    ]),
  };
}

export function fixtureCannibalSource() {
  return {
    sourceDurationSeconds: 20 * 60,
    sentences: pack([
      { start: 10, end: 16, text: "Hi there. I am from the United States of America." },
      {
        start: 80,
        end: 88,
        text: "The secret to growing is consistency, which means showing up on the boring days.",
      },
      {
        start: 89,
        end: 98,
        text: "I never skip the boring days if I want the work to grow.",
      },
      {
        start: 200,
        end: 208,
        text: "The secret to growing is consistency, which means you keep going when it is quiet.",
      },
      {
        start: 209,
        end: 218,
        text: "I never treat consistency like a mood. It is the same secret again.",
      },
      {
        start: 360,
        end: 368,
        text: "The best way to grow is consistency. I always come back to that secret.",
      },
      {
        start: 369,
        end: 378,
        text: "Growing takes consistency. The secret has not changed.",
      },
    ]),
  };
}
