/**
 * Room 4C Scenario 2 — paste-ready caption and email from the authoritative brief.
 */

import type { CopyQualityBrief } from "@/lib/studio-kitchen-production/copy-quality/types";
import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";

function literalToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildScenario2Caption(): string {
  return [
    `${brief.offer.name} is ${brief.offer.priceDisplay}, ${brief.offer.windowDisplay}.`,
    "",
    brief.customer.businessName,
    "",
    brief.offer.description,
    "",
    brief.cta.label,
  ].join("\n");
}

export function buildScenario2Email(): {
  subjectOptions: readonly string[];
  previewText: string;
  body: string;
  cta: string;
} {
  return {
    subjectOptions: [
      `${brief.offer.name} — ${brief.offer.priceDisplay}`,
      `Limited ${brief.offer.name} from ${brief.customer.businessName}`,
    ],
    previewText: `${brief.offer.priceDisplay} · ${brief.offer.windowDisplay}`,
    body: [
      `${brief.customer.businessName} is launching a limited ${brief.offer.name}.`,
      "",
      `The box is ${brief.offer.priceDisplay}, available ${brief.offer.windowDisplay}.`,
      "",
      brief.offer.description,
      "",
      "This limited autumn box is available for the October window only.",
    ].join("\n"),
    cta: brief.cta.label,
  };
}

export function formatScenario2EmailPasteReady(): string {
  const email = buildScenario2Email();
  return [
    `Subject: ${email.subjectOptions[0]}`,
    `Alt subject: ${email.subjectOptions[1]}`,
    `Preview: ${email.previewText}`,
    "",
    email.body,
    "",
    email.cta,
  ].join("\n");
}

/**
 * Owner-facing Scenario 2 narration. One continuous passage.
 * Speak the authorized price and dates. Do not speak a URL, email, or phone.
 */
export const SCENARIO_2_APPROVED_NARRATION =
  "Harbor Roast Coffee Co. presents the Autumn Single-Origin Box. This limited launch is forty-eight dollars, available October first through October thirty-first, twenty twenty-six. A seasonal coffee box for fall. Get the limited box while it lasts.";

export function buildScenario2NarrationScript(): string {
  return SCENARIO_2_APPROVED_NARRATION;
}

export function buildScenario2CampaignDirection(): string {
  return [
    "Campaign direction — Harbor Roast Coffee Co.",
    "",
    "One product launch. One box. One price. One window.",
    "",
    `${brief.customer.businessName} launches the ${brief.offer.name} at ${brief.offer.priceDisplay}, ${brief.offer.windowDisplay}.`,
    "Tone is warm and grounded. No neon. Origin, weight, and flavor claims were not supplied and are not invented.",
    `Call to action: ${brief.cta.label}.`,
    "Social square, social vertical, short vertical video, promotional email, caption, and 5×7 counter card share the same photograph, logo, and facts.",
    "Shop URL, contact email, and phone were not owner-authorized, so they do not appear.",
  ].join("\n");
}

export function scenario2CopyQualityBrief(): CopyQualityBrief {
  return {
    skuId: "marketing-copy",
    requiredFactTokens: [
      brief.offer.name,
      literalToken(brief.offer.priceDisplay),
      "October 1",
      "October 31, 2026",
      brief.customer.businessName,
      brief.cta.label,
    ],
    prohibitedClaimPatterns: [
      "guaranteed",
      "best coffee",
      "#1",
      "number one",
      "award-winning",
      "ethiopian",
      "colombian",
      "tasting notes",
      "50% off",
      "we will post for you",
      "ad account",
      "harborroast\\.example",
    ],
    ctaTokens: [brief.cta.label, literalToken(brief.offer.priceDisplay)],
    requireCta: true,
    maxEmails: 1,
    maxAssets: 1,
    maxTotalWords: 220,
    forbiddenTonePatterns: ["neon", "synergy", "revolutionize", "next-level"],
  };
}
