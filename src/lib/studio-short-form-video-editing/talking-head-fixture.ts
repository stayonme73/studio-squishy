import type { FootageIntake, SpeechWord } from "./types";

function words(
  start: number,
  tokens: readonly { word: string; dur: number; gap?: number }[],
): SpeechWord[] {
  let t = start;
  const out: SpeechWord[] = [];
  for (const token of tokens) {
    const end = Number((t + token.dur).toFixed(3));
    out.push({
      word: token.word.toLowerCase(),
      punctuatedWord: token.word,
      start: Number(t.toFixed(3)),
      end,
    });
    t = end + (token.gap ?? 0.06);
  }
  return out;
}

/** Representative talking-head: false start, dead air, real speech, needs a cut. */
export const TALKING_HEAD_SOURCE_SECONDS = 52;

export const TALKING_HEAD_WORDS: readonly SpeechWord[] = [
  ...words(1.0, [
    { word: "So", dur: 0.18 },
    { word: "um", dur: 0.22 },
  ]),
  ...words(5.2, [
    { word: "Saturday", dur: 0.5 },
    { word: "morning", dur: 0.45 },
    { word: "we", dur: 0.2 },
    { word: "finally", dur: 0.4 },
    { word: "open", dur: 0.32 },
    { word: "the", dur: 0.16 },
    { word: "new", dur: 0.28 },
    { word: "patio", dur: 0.4 },
    { word: "out", dur: 0.2 },
    { word: "back.", dur: 0.4 },
  ]),
  ...words(14.0, [
    { word: "Bring", dur: 0.3 },
    { word: "the", dur: 0.16 },
    { word: "kids", dur: 0.34 },
    { word: "and", dur: 0.18 },
    { word: "stay", dur: 0.3 },
    { word: "for", dur: 0.18 },
    { word: "coffee", dur: 0.4 },
    { word: "while", dur: 0.24 },
    { word: "the", dur: 0.16 },
    { word: "kitchen", dur: 0.36 },
    { word: "gets", dur: 0.24 },
    { word: "your", dur: 0.2 },
    { word: "order", dur: 0.34 },
    { word: "ready.", dur: 0.4 },
  ]),
  ...words(24.5, [
    { word: "The", dur: 0.16 },
    { word: "kitchen", dur: 0.36 },
    { word: "is", dur: 0.16 },
    { word: "serving", dur: 0.38 },
    { word: "the", dur: 0.16 },
    { word: "weekend", dur: 0.42 },
    { word: "special", dur: 0.42 },
    { word: "all", dur: 0.2 },
    { word: "day", dur: 0.28 },
    { word: "and", dur: 0.18 },
    { word: "we", dur: 0.16 },
    { word: "saved", dur: 0.32 },
    { word: "tables", dur: 0.36 },
    { word: "outside.", dur: 0.45 },
  ]),
  ...words(36.0, [
    { word: "Parking", dur: 0.38 },
    { word: "is", dur: 0.16 },
    { word: "behind", dur: 0.34 },
    { word: "the", dur: 0.16 },
    { word: "shop", dur: 0.32 },
    { word: "on", dur: 0.16 },
    { word: "Maple", dur: 0.4 },
    { word: "if", dur: 0.16 },
    { word: "the", dur: 0.16 },
    { word: "front", dur: 0.3 },
    { word: "lot", dur: 0.26 },
    { word: "fills", dur: 0.3 },
    { word: "up.", dur: 0.28 },
  ]),
  ...words(45.2, [
    { word: "Come", dur: 0.24 },
    { word: "see", dur: 0.22 },
    { word: "us", dur: 0.18 },
    { word: "this", dur: 0.2 },
    { word: "weekend", dur: 0.45 },
    { word: "and", dur: 0.18 },
    { word: "tell", dur: 0.22 },
    { word: "them", dur: 0.22 },
    { word: "you", dur: 0.18 },
    { word: "heard", dur: 0.28 },
    { word: "it", dur: 0.14 },
    { word: "here.", dur: 0.4 },
  ]),
];

export const TALKING_HEAD_INTAKE: FootageIntake = {
  skuId: "v2-rtu-short-form-video-edit",
  sourceRelativePath: "fixtures/talking-head-phone.mp4",
  sourceUrl: "https://example.test/talking-head-phone.mp4",
  ctaText: "Book your table today",
  mustKeepLine: "open the new patio",
  rightsCleared: true,
  language: "en",
};

/** One continuous take longer than 30s — a single island, not spaced sentences. */
export function continuousLongSpeechWords(): SpeechWord[] {
  const tokens: { word: string; dur: number }[] = [];
  for (let i = 0; i < 40; i += 1) {
    tokens.push(
      { word: "This", dur: 0.22 },
      { word: "is", dur: 0.16 },
      { word: "continuous", dur: 0.45 },
      { word: "english", dur: 0.38 },
      { word: "speech", dur: 0.36 },
      { word: `line`, dur: 0.28 },
      { word: `${i + 1}.`, dur: 0.3 },
    );
  }
  return words(2.1, tokens);
}

export function longSpeechWords(): SpeechWord[] {
  const out: SpeechWord[] = [];
  let t = 1;
  for (let i = 0; i < 14; i += 1) {
    out.push(
      ...words(t, [
        { word: `Sentence`, dur: 0.4 },
        { word: `number`, dur: 0.35 },
        { word: `${i + 1}`, dur: 0.3 },
        { word: `keeps`, dur: 0.3 },
        { word: `going`, dur: 0.3 },
        { word: `with`, dur: 0.2 },
        { word: `more`, dur: 0.25 },
        { word: `usable`, dur: 0.35 },
        { word: `speech.`, dur: 0.4 },
      ]),
    );
    t += 6.5;
  }
  return out;
}
