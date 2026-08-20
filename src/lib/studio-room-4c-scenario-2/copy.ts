/**
 * Room 4C Scenario 2 — paste-ready caption and email from the authoritative brief.
 */

import type { CopyQualityBrief } from "@/lib/studio-kitchen-production/copy-quality/types";
import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";

function literalToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STALE_BOOKING_URL = "harborroast.example/book";

export function buildScenario2Caption(): string {
  return [
    `${brief.offer.name} is ${brief.offer.priceDisplay}, ${brief.offer.windowDisplay}.`,
    "",
    brief.customer.businessName,
    "",
    brief.offer.contentsDisplay,
    "",
    brief.cta.label,
    brief.cta.bookingUrl,
  ].join("\n");
}

export function buildScenario2Email(): {
  subjectOptions: readonly string[];
  previewText: string;
  body: string;
  cta: string;
} {
  return {
    subjectOptions: [`${brief.offer.name} — ${brief.offer.priceDisplay}`],
    previewText: `${brief.offer.priceDisplay} · ${brief.offer.windowDisplay}`,
    body: [
      `${brief.customer.businessName} is launching the ${brief.offer.name}.`,
      "",
      `The box is ${brief.offer.priceDisplay} and includes ${brief.offer.contentsDisplay}.`,
      `Available ${brief.offer.windowDisplay}.`,
      "",
      `${brief.cta.label}: ${brief.cta.bookingUrl}`,
      "",
      `Support: ${brief.cta.supportEmail}`,
    ].join("\n"),
    cta: `${brief.cta.label}: ${brief.cta.bookingUrl}`,
  };
}

export function formatScenario2EmailPasteReady(): string {
  const email = buildScenario2Email();
  return [
    `Subject: ${email.subjectOptions[0]}`,
    `Preheader: ${email.previewText}`,
    "",
    email.body,
  ].join("\n");
}

/**
 * Owner-facing Scenario 2 narration. One continuous passage.
 * Speak the authorized price, dates, and contents. Do not speak URL, email, or phone.
 */
export const SCENARIO_2_APPROVED_NARRATION =
  "Harbor Roast Coffee Co. presents the Autumn Single-Origin Box. This autumn launch is forty-eight dollars and includes three 8-ounce bags of whole-bean single-origin coffee, available October first through October thirty-first, twenty twenty-six. Shop the autumn box this October.";

export function buildScenario2NarrationScript(): string {
  return SCENARIO_2_APPROVED_NARRATION;
}

export function buildScenario2CampaignDirection(): string {
  return [
    "Campaign direction — Harbor Roast Coffee Co.",
    "",
    "One product launch. One box. One price. One window. One purchase URL.",
    "",
    `${brief.customer.businessName} launches the ${brief.offer.name} at ${brief.offer.priceDisplay}, ${brief.offer.windowDisplay}.`,
    `Contents: ${brief.offer.contentsDisplay}.`,
    `Purchase: ${brief.cta.bookingUrl}.`,
    `Support: ${brief.cta.supportEmail}.`,
    "Tone is warm and grounded. No neon. No invented origin, shipping, discount, reviews, phone, or scarcity.",
    "Availability dates are the window only. They do not authorize a shortage claim.",
    `Call to action: ${brief.cta.label}.`,
    "Social square, social vertical, short vertical video, promotional email, caption, and 5×7 counter card share the same photograph, logo, and facts.",
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
      literalToken(brief.offer.contentsDisplay),
      literalToken(brief.cta.bookingUrl),
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
      "free shipping",
      "we will post for you",
      "ad account",
      literalToken(STALE_BOOKING_URL),
      String.raw`\blimited\b`,
      "limited-time",
      "while supplies last",
      "selling fast",
      "only a few left",
      "exclusive availability",
    ],
    ctaTokens: [
      brief.cta.label,
      literalToken(brief.offer.priceDisplay),
      literalToken(brief.cta.bookingUrl),
    ],
    requireCta: true,
    maxEmails: 1,
    maxAssets: 1,
    maxTotalWords: 220,
    forbiddenTonePatterns: ["neon", "synergy", "revolutionize", "next-level"],
  };
}

export function scenario2EmailCopyQualityBrief(): CopyQualityBrief {
  return {
    ...scenario2CopyQualityBrief(),
    requiredFactTokens: [
      ...scenario2CopyQualityBrief().requiredFactTokens,
      literalToken(brief.cta.supportEmail),
    ],
  };
}
