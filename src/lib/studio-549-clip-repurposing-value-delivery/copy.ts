export type Clip549DeliveredShort = {
  clipId: string;
  fileName: string;
  spokenIdea: string;
  durationLabel: string;
};

export type Clip549PostCaption = {
  clipId: string;
  text: string;
};

export type Clip549TitleHook = {
  clipId: string;
  text: string;
};

export type Clip549HashtagKeywordSet = {
  clipId: string;
  hashtags: readonly string[];
  keywords: readonly string[];
  suggestionOnly: true;
};

const FORBIDDEN =
  /\b(best time|analytics|impressions|reach|going viral|virality|viral|#fyp|#foryou|guaranteed|testimonial|increased sales|ranking|algorithm|traffic|engagement|bookings|improve sales|grow your)\b/i;

const STOP = new Set([
  "this",
  "that",
  "they",
  "them",
  "then",
  "than",
  "with",
  "from",
  "have",
  "been",
  "were",
  "we're",
  "you're",
  "i'm",
  "don't",
  "gonna",
  "know",
  "does",
  "make",
  "because",
  "would",
  "rather",
  "actually",
  "should",
  "those",
  "somebody",
  "their",
  "there",
  "these",
  "about",
  "think",
  "looks",
  "more",
  "feel",
  "saying",
  "always",
  "sense",
  "need",
  "needs",
  "offer",
  "real",
  "paying",
  "whole",
  "place",
  "wrong",
  "took",
  "time",
  "lot",
  "gonna",
]);

function cleanSpoken(spokenIdea: string): string {
  return spokenIdea.replace(/\s+/g, " ").trim();
}

function failIfForbidden(text: string, label: string): string | null {
  if (FORBIDDEN.test(text)) {
    return `${label} invented a performance or business-result claim.`;
  }
  return null;
}

export function writeClip549PostCaption(input: {
  clipId: string;
  spokenIdea: string;
  ctaText: string;
}): Clip549PostCaption | { ok: false; message: string } {
  const spoken = cleanSpoken(input.spokenIdea);
  const cta = input.ctaText.trim();
  if (!spoken) return { ok: false, message: `No spoken idea for ${input.clipId}.` };
  const text = cta ? `${spoken}\n\n${cta}` : spoken;
  const forbidden = failIfForbidden(text, "Post caption");
  if (forbidden) return { ok: false, message: forbidden };
  if (cta && !text.includes(cta)) {
    return { ok: false, message: "Post caption dropped the customer CTA." };
  }
  return { clipId: input.clipId, text };
}

export function writeClip549TitleHook(input: {
  clipId: string;
  spokenIdea: string;
}): Clip549TitleHook | { ok: false; message: string } {
  const spoken = cleanSpoken(input.spokenIdea);
  if (!spoken) return { ok: false, message: `No spoken idea for ${input.clipId}.` };
  const sentences = spoken.match(/[^.!?]+[.!?]+/g)?.map((row) => row.trim()) ?? [
    spoken,
  ];
  let first = sentences[0] ?? spoken;
  if (first.length < 24 && sentences[1]) {
    first = `${first} ${sentences[1]}`.trim();
  }
  const text = first;
  const forbidden = failIfForbidden(text, "Title / hook");
  if (forbidden) return { ok: false, message: forbidden };
  return { clipId: input.clipId, text };
}

function keywordsFromSpoken(spoken: string): string[] {
  const words = spoken
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP.has(word));
  const unique: string[] = [];
  for (const word of words) {
    if (!unique.includes(word)) unique.push(word);
    if (unique.length >= 6) break;
  }
  return unique;
}

export function writeClip549HashtagKeywordSet(input: {
  clipId: string;
  spokenIdea: string;
}): Clip549HashtagKeywordSet | { ok: false; message: string } {
  const spoken = cleanSpoken(input.spokenIdea);
  if (!spoken) return { ok: false, message: `No spoken idea for ${input.clipId}.` };
  const keywords = keywordsFromSpoken(spoken);
  if (keywords.length < 2) {
    return { ok: false, message: `Not enough descriptive terms in ${input.clipId}.` };
  }
  const hashtags = keywords.slice(0, 5).map((word) => `#${word}`);
  const joined = `${hashtags.join(" ")} ${keywords.join(" ")}`;
  const forbidden = failIfForbidden(joined, "Hashtag / keyword set");
  if (forbidden) return { ok: false, message: forbidden };
  return {
    clipId: input.clipId,
    hashtags,
    keywords,
    suggestionOnly: true,
  };
}

export function scaleClip549ValueLayer(input: {
  delivered: readonly Clip549DeliveredShort[];
  ctaText: string;
}):
  | {
      ok: true;
      captions: Clip549PostCaption[];
      titles: Clip549TitleHook[];
      discovery: Clip549HashtagKeywordSet[];
    }
  | { ok: false; message: string } {
  if (input.delivered.length < 3 || input.delivered.length > 5) {
    return {
      ok: false,
      message: "Value extras scale only to 3, 4, or 5 delivered shorts. Do not promise five.",
    };
  }
  const captions: Clip549PostCaption[] = [];
  const titles: Clip549TitleHook[] = [];
  const discovery: Clip549HashtagKeywordSet[] = [];
  for (const short of input.delivered) {
    const caption = writeClip549PostCaption({
      clipId: short.clipId,
      spokenIdea: short.spokenIdea,
      ctaText: input.ctaText,
    });
    if ("ok" in caption && caption.ok === false) return caption;
    const title = writeClip549TitleHook({
      clipId: short.clipId,
      spokenIdea: short.spokenIdea,
    });
    if ("ok" in title && title.ok === false) return title;
    const tags = writeClip549HashtagKeywordSet({
      clipId: short.clipId,
      spokenIdea: short.spokenIdea,
    });
    if ("ok" in tags && tags.ok === false) return tags;
    captions.push(caption as Clip549PostCaption);
    titles.push(title as Clip549TitleHook);
    discovery.push(tags as Clip549HashtagKeywordSet);
  }
  if (
    captions.length !== input.delivered.length ||
    titles.length !== input.delivered.length ||
    discovery.length !== input.delivered.length
  ) {
    return { ok: false, message: "Value extras must match the delivered count." };
  }
  return { ok: true, captions, titles, discovery };
}
