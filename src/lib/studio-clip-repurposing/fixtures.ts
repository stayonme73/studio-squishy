import type { TranscriptSentence } from "@/lib/studio-short-form-video-editing/sentences";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

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

/** A: five plausible topics, three strong distinct shorts, plus repetition and filler. */
export function fixtureStrongSource(): {
  sourceDurationSeconds: number;
  sentences: TranscriptSentence[];
} {
  return {
    sourceDurationSeconds: 22 * 60,
    sentences: pack([
      { start: 8, end: 14, text: "Hi. My name is Daniel and I am from the United States of America." },
      { start: 16, end: 22, text: "Today I am going to teach some things I learned." },
      {
        start: 90,
        end: 98,
        text: "My favorite word in English is cherries, which means a small fruit that is delicious.",
      },
      {
        start: 99,
        end: 108,
        text: "I love how the word makes people smile before they even taste anything.",
      },
      {
        start: 200,
        end: 208,
        text: "The secret to pricing a custom cake is charging for the sketch before you bake.",
      },
      {
        start: 209,
        end: 218,
        text: "I never give the drawing away, because that is where the real design work lives.",
      },
      { start: 280, end: 286, text: "Um, okay, so let me try this again." },
      {
        start: 360,
        end: 368,
        text: "I never light a face from the ceiling if I want the eyes to stay alive.",
      },
      {
        start: 369,
        end: 378,
        text: "The best cheap fix is a lamp at eye level, not a brighter overhead bulb.",
      },
      {
        start: 450,
        end: 458,
        text: "The best guest question I ask is what they almost quit last year.",
      },
      {
        start: 459,
        end: 468,
        text: "That answer is always more useful than asking how they got started.",
      },
      {
        start: 540,
        end: 548,
        text: "Always write the offer on paper before you shoot, or the clip has nowhere to land.",
      },
      {
        start: 549,
        end: 558,
        text: "I love a camera that already knows the sentence it is trying to sell.",
      },
      {
        start: 640,
        end: 648,
        text: "My favorite word in English is cherries, which means a small fruit.",
      },
      {
        start: 649,
        end: 656,
        text: "Cherries again, same favorite word, same little fruit story.",
      },
      { start: 900, end: 906, text: "Thank you so much. I hope you enjoyed this." },
    ]),
  };
}

/** B: only two professionally viable distinct ideas. */
export function fixtureTwoClipSource(): {
  sourceDurationSeconds: number;
  sentences: TranscriptSentence[];
} {
  return {
    sourceDurationSeconds: 18 * 60,
    sentences: pack([
      { start: 5, end: 12, text: "Hello. My name is Maya and I am from Ohio." },
      { start: 20, end: 26, text: "Let me show you a few thoughts from today." },
      {
        start: 120,
        end: 128,
        text: "The secret to pricing a custom cake is charging for the sketch before you bake.",
      },
      {
        start: 129,
        end: 138,
        text: "I never give the drawing away, because that is the real work.",
      },
      {
        start: 240,
        end: 248,
        text: "The secret to pricing a custom cake is charging for the sketch first.",
      },
      {
        start: 249,
        end: 256,
        text: "Same pricing point again, just said a second time.",
      },
      {
        start: 400,
        end: 408,
        text: "I never light a face from the ceiling if I want the eyes to stay alive.",
      },
      {
        start: 409,
        end: 418,
        text: "The best cheap fix is a lamp at eye level, not a brighter overhead bulb.",
      },
      { start: 700, end: 706, text: "Thanks for watching. That is all." },
    ]),
  };
}

/** C: many timestamps, one recurring idea. */
export function fixtureRepetitiveSource(): {
  sourceDurationSeconds: number;
  sentences: TranscriptSentence[];
} {
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
      { start: 800, end: 806, text: "Thank you. I hope you enjoyed it." },
    ]),
  };
}

/** Meaning-first ideas with no favorite/best/secret/never/always hook words. */
export function fixtureNoHookWordsSource(): {
  sourceDurationSeconds: number;
  sentences: TranscriptSentence[];
} {
  return {
    sourceDurationSeconds: 20 * 60,
    sentences: pack([
      { start: 6, end: 12, text: "Hi. My name is Jordan and I am from Ohio." },
      {
        start: 80,
        end: 88,
        text: "I would rather sell 10 things we can do extremely well than 50 things we can barely manage.",
      },
      {
        start: 89,
        end: 98,
        text: "A bigger menu looks impressive until people stop trusting the work.",
      },
      {
        start: 200,
        end: 208,
        text: "You hire somebody because you do not want to become the project manager.",
      },
      {
        start: 209,
        end: 218,
        text: "That defeats the whole purpose of paying somebody if you still run the job.",
      },
      {
        start: 360,
        end: 368,
        text: "A button in the wrong place can make the whole page feel awkward.",
      },
      {
        start: 369,
        end: 378,
        text: "The customer may not know the technical reason, but they feel it.",
      },
      { start: 700, end: 706, text: "Thank you. That is all." },
    ]),
  };
}

/** D: usable speech, no strong short-form idea. */
export function fixtureWeakSource(): {
  sourceDurationSeconds: number;
  sentences: TranscriptSentence[];
} {
  return {
    sourceDurationSeconds: 16 * 60,
    sentences: pack([
      { start: 4, end: 10, text: "Hi. How are you?" },
      { start: 12, end: 20, text: "My name is Sam and I am from the United States of America." },
      { start: 40, end: 48, text: "Today I am going to teach a little, and then we will see." },
      { start: 80, end: 88, text: "Let me show you the room. This is the table and that is the wall." },
      { start: 120, end: 128, text: "Okay. So. Yeah. I will try to keep talking for a while here." },
      { start: 200, end: 208, text: "I am from a small town and I am speaking English today." },
      { start: 400, end: 406, text: "Thank you so much. Goodbye." },
    ]),
  };
}
