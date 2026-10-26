import { supportedFactValue, type ContentPackSupportedFact } from "./intake";

export type PackPostCaption = {
  clipId: string;
  text: string;
  usedFactKeys: string[];
};

export type PackUseGuide = {
  recommendedOrder: readonly string[];
  clips: readonly { clipId: string; purpose: string }[];
  ctaGuidance: string;
  doNotInvent: readonly string[];
};

const FORBIDDEN_INVENTION =
  /\b(best time|analytics|impressions|reach|going viral|guaranteed|testimonial|increased sales|#1)\b/i;

export function writePackPostCaption(input: {
  clipId: string;
  spokenIdea: string;
  facts: readonly ContentPackSupportedFact[];
  ctaText: string;
}): PackPostCaption | { ok: false; message: string } {
  const spoken = input.spokenIdea.replace(/\s+/g, " ").trim();
  if (!spoken) {
    return { ok: false, message: `No spoken idea for ${input.clipId}.` };
  }
  const usedFactKeys: string[] = [];
  const name = supportedFactValue(input.facts, "speaker_name");
  if (name && spoken.toLowerCase().includes(name.toLowerCase())) {
    usedFactKeys.push("speaker_name");
  }
  const favorite = supportedFactValue(input.facts, "favorite_word");
  if (favorite && spoken.toLowerCase().includes(favorite.toLowerCase())) {
    usedFactKeys.push("favorite_word");
  }
  const cta = input.ctaText.trim();
  const spokenEnded = /[.!?]$/.test(spoken) ? spoken : `${spoken}.`;
  const text = cta ? `${spokenEnded}\n\n${cta}` : spokenEnded;
  if (FORBIDDEN_INVENTION.test(text)) {
    return { ok: false, message: "Post caption invented a claim the customer did not supply." };
  }
  if (cta && !text.includes(cta)) {
    return { ok: false, message: "Post caption dropped the customer CTA." };
  }
  return { clipId: input.clipId, text, usedFactKeys };
}

export function writePackUseGuide(input: {
  clipLabels: readonly { clipId: string; label: string; spokenIdea: string }[];
  ctaText: string;
}): PackUseGuide | { ok: false; message: string } {
  const clips = input.clipLabels.map((clip) => ({
    clipId: clip.clipId,
    purpose: `Use “${clip.label}” to show this identified moment: ${clip.spokenIdea.trim()}`,
  }));
  const cta = input.ctaText.trim();
  const guide: PackUseGuide = {
    recommendedOrder: input.clipLabels.map((clip) => clip.clipId),
    clips,
    ctaGuidance: cta
      ? `End each post with the customer CTA: ${cta}`
      : "This set does not include a call to action.",
    doNotInvent: [
      "best posting times",
      "analytics",
      "audience data",
      "performance predictions",
    ],
  };
  const customerFacing = `${guide.ctaGuidance} ${guide.clips.map((clip) => clip.purpose).join(" ")}`;
  if (FORBIDDEN_INVENTION.test(customerFacing)) {
    return { ok: false, message: "Use guide invented posting-performance claims." };
  }
  return guide;
}

export function renderUseGuideMarkdown(
  guide: PackUseGuide,
  title = "How to use this Short-Form Content Pack",
): string {
  const lines = [
    `# ${title}`,
    "",
    "Post these clips in this order:",
    ...guide.recommendedOrder.map((id, index) => {
      const clip = guide.clips.find((row) => row.clipId === id);
      return `${index + 1}. ${clip?.purpose ?? id}`;
    }),
    "",
    guide.ctaGuidance,
    "",
    "This guide does not invent best posting times, analytics, audience data, or performance predictions.",
    "",
  ];
  return lines.join("\n");
}
