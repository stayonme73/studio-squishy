/**
 * Room 4C Scenario 2 — paste-ready caption, email, direction, and narration.
 * Customer-facing copy must read as communication, not a fact list.
 */

import type { CopyQualityBrief } from "@/lib/studio-kitchen-production/copy-quality/types";
import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";

function literalToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STALE_BOOKING_URL = "harborroast.example/book";

/**
 * Four spoken beats for one continuous commercial. Joined as a single
 * generation. Visual cuts must follow these sentences after the audio exists.
 */
export const SCENARIO_2_NARRATION_SENTENCES = [
  "Harbor Roast Coffee Co. is launching the Autumn Single-Origin Box.",
  "Inside are three 8-ounce bags of whole-bean single-origin coffee.",
  "The box is forty-eight dollars, available October first through October thirty-first, twenty twenty-six.",
  "Shop the autumn box this October.",
] as const;

export const SCENARIO_2_APPROVED_NARRATION =
  SCENARIO_2_NARRATION_SENTENCES.join(" ");

export function buildScenario2Caption(): string {
  return [
    `${brief.customer.businessName} is launching the ${brief.offer.name} this October.`,
    "",
    `The box is ${brief.offer.priceDisplay} and includes ${brief.offer.contentsDisplay}, available ${brief.offer.windowDisplay}.`,
    "",
    `${brief.cta.label}: ${brief.cta.bookingUrl}`,
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
    previewText: `The ${brief.offer.name} is ${brief.offer.priceDisplay} this October.`,
    body: [
      `${brief.customer.businessName} is launching the ${brief.offer.name}.`,
      "",
      `This October the box is ${brief.offer.priceDisplay} and includes ${brief.offer.contentsDisplay}. Available ${brief.offer.windowDisplay}.`,
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

export function buildScenario2NarrationScript(): string {
  return SCENARIO_2_APPROVED_NARRATION;
}

export function buildScenario2CampaignDirection(): string {
  return [
    `${brief.customer.businessName} — ${brief.offer.name}`,
    "",
    "Campaign direction",
    "",
    "This launch should feel like a warm counter conversation, not a spec sheet. One photograph of three sealed bags carries the square, the vertical, and the 5×7 counter card. The shopper should see the product they will receive and know exactly how to buy it.",
    "",
    "Campaign goal",
    `Open the ${brief.offer.name} this October. One box, one price, one window, one place to buy.`,
    "",
    "Audience",
    "This campaign speaks to people shopping a seasonal whole-bean coffee box: existing Harbor Roast customers and anyone meeting the brand through this October launch. Write for a shopper choosing a box to take home, not a café reservation and not a wholesale order. The message is simple: here is the autumn box, what is inside, what it costs, and where to get it.",
    "",
    "The idea",
    `${brief.customer.businessName} is opening the ${brief.offer.name} this October. Keep the tone warm and grounded. Speak in complete sentences so the launch feels like a conversation at the counter.`,
    "",
    "Offer",
    `The ${brief.offer.name} is ${brief.offer.priceDisplay}, ${brief.offer.windowDisplay}.`,
    `It includes ${brief.offer.contentsDisplay}.`,
    `Call to action: ${brief.cta.label}.`,
    `Purchase: ${brief.cta.bookingUrl}.`,
    `Support: ${brief.cta.supportEmail}.`,
    "October 1 through October 31 is the availability window. Do not imply the box is scarce. Keep the palette warm and grounded. Do not invent origin, shipping, discount, reviews, or a phone number.",
    "",
    "How the pieces work together",
    "Social square, social vertical, promotional email, caption, and 5×7 counter card share the same photograph, logo, and facts. The short video uses coordinated photographs of those same three bags: the picture may move gently, the words stay still and inside the phone-safe area. Video beats follow the spoken subject. The purchase plate holds on Shop the autumn box and the product URL long enough to read.",
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
