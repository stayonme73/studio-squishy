/**
 * Room 4C Scenario 3 — paste-ready caption, email, direction, and narration.
 * Warm handmade textile voice. No wellness neon. No prohibited inventions.
 */

import type { CopyQualityBrief } from "@/lib/studio-kitchen-production/copy-quality/types";
import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

function literalToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Five spoken sentences for one continuous commercial. Joined as a single
 * generation. Visual beats (4) follow these sentences after the audio exists;
 * sentences 4–5 share the visit-details plate.
 */
export const SCENARIO_3_NARRATION_SENTENCES = [
  "Moss & Thread Studio is opening its doors November seventh and eighth.",
  "Visit the studio, meet the maker, and shop available textile pieces in person.",
  "Saturday hours are ten to five, and Sunday hours are eleven to four.",
  "Admission is free.",
  "Visit the open studio this November.",
] as const;

export const SCENARIO_3_APPROVED_NARRATION =
  SCENARIO_3_NARRATION_SENTENCES.join(" ");

export function buildScenario3Caption(): string {
  return [
    `${brief.customer.businessName} — ${brief.offer.name}`,
    "",
    `${brief.offer.windowDisplay} at ${brief.customer.locationDisplay}.`,
    `${brief.offer.visitorClaim}.`,
    "",
    `${brief.offer.hoursDisplay}. ${brief.offer.admissionDisplay}.`,
    "",
    `${brief.cta.label}: ${brief.cta.eventUrl}`,
  ].join("\n");
}

export function buildScenario3Email(): {
  subjectOptions: readonly string[];
  previewText: string;
  body: string;
  cta: string;
} {
  return {
    subjectOptions: [
      `${brief.offer.name} — ${brief.offer.windowDisplay}`,
    ],
    previewText: `${brief.offer.admissionDisplay} · ${brief.customer.locationDisplay}`,
    body: [
      `${brief.customer.businessName} is hosting ${brief.offer.name} on ${brief.offer.windowDisplay}.`,
      "",
      `${brief.offer.visitorClaim}.`,
      "",
      `${brief.offer.hoursDisplay}.`,
      `${brief.offer.admissionDisplay}.`,
      "",
      `${brief.customer.locationDisplay}`,
      "",
      `${brief.cta.label}: ${brief.cta.eventUrl}`,
      "",
      `Support: ${brief.cta.supportEmail}`,
    ].join("\n"),
    cta: `${brief.cta.label}: ${brief.cta.eventUrl}`,
  };
}

export function formatScenario3EmailPasteReady(): string {
  const email = buildScenario3Email();
  return [
    `Subject: ${email.subjectOptions[0]}`,
    `Preheader: ${email.previewText}`,
    "",
    email.body,
  ].join("\n");
}

export function buildScenario3NarrationScript(): string {
  return SCENARIO_3_APPROVED_NARRATION;
}

export function buildScenario3CampaignDirection(): string {
  return [
    `${brief.customer.businessName} — ${brief.offer.name}`,
    "",
    "Campaign direction",
    "",
    "This open-weekend launch should feel like warm handmade textile work — moss greens, natural linen, terracotta accents — not spa neon. The four certification-fixture photographs (studio interior, two product textiles, maker at work) carry the square, the vertical, the invitation handout, and the short video. Do not present these images as a real customer’s photographs. External customer-photo path is not proven.",
    "",
    "Campaign goal",
    `Invite visitors to ${brief.offer.name} on ${brief.offer.windowDisplay}. One studio, one weekend, free admission, one place to learn more.`,
    "",
    "Audience",
    "People who want to visit a textile studio in person: meet the maker, see the work, and shop available pieces. Write for a weekend open-studio visitor, not a class enrollee and not a calm-spa client.",
    "",
    "The idea",
    `${brief.customer.businessName} is opening its doors for ${brief.offer.name}. Keep the tone warm and grounded. Speak in complete sentences. ${brief.offer.visitorClaim}.`,
    "",
    "Offer",
    `${brief.offer.name} — ${brief.offer.windowDisplay}.`,
    `${brief.offer.hoursDisplay}.`,
    `${brief.offer.admissionDisplay}.`,
    `Location: ${brief.customer.locationDisplay}.`,
    `Call to action: ${brief.cta.label}.`,
    `Event URL: ${brief.cta.eventUrl}.`,
    `Support: ${brief.cta.supportEmail}.`,
    "Do not invent product prices, promotional markdowns, classes, hospitality extras, prizes, scarcity language, made-to-order promises, access statements, vehicle-storage notes, fulfillment offers, a phone number, or extra event activities. Maker photographs must not imply a staged in-person show.",
    "",
    "How the pieces work together",
    "Social square (product-led), social vertical, promotional email, caption, and US Letter invitation handout share the same photos and facts. The short video uses moving photo backgrounds with stationary text overlays in the phone-safe area. Video beats follow the spoken subject. The visit-details plate holds hours, address, free admission, CTA, and URL long enough to read. Narration may omit the full address, URL, and email.",
  ].join("\n");
}

export function scenario3CopyQualityBrief(): CopyQualityBrief {
  return {
    skuId: "marketing-copy",
    requiredFactTokens: [
      brief.customer.businessName,
      brief.offer.name,
      "November 7",
      brief.cta.label,
      literalToken(brief.cta.eventUrl),
      literalToken(brief.offer.admissionDisplay),
    ],
    prohibitedClaimPatterns: [
      String.raw`\$\d`,
      "discount",
      "percent off",
      "workshop",
      "demonstration",
      "demo",
      "refreshment",
      "giveaway",
      String.raw`\blimited\b`,
      "custom.?order",
      "wheelchair",
      "accessible entrance",
      "parking",
      "shipping",
      String.raw`\bnia\b`,
      String.raw`\byoga\b`,
      "wellness",
      "neon",
      String.raw`\(804\)`,
      "555-0188",
      "Clay Street",
      "mossthread.example/visit",
    ],
    ctaTokens: [brief.cta.label, literalToken(brief.cta.eventUrl)],
    requireCta: true,
    maxEmails: 1,
    maxAssets: 1,
    maxTotalWords: 260,
    forbiddenTonePatterns: ["neon", "synergy", "revolutionize", "next-level", "wellness"],
  };
}

export function scenario3EmailCopyQualityBrief(): CopyQualityBrief {
  return {
    ...scenario3CopyQualityBrief(),
    requiredFactTokens: [
      ...scenario3CopyQualityBrief().requiredFactTokens,
      literalToken(brief.cta.supportEmail),
      literalToken(brief.customer.locationDisplay),
      "Saturday",
      "Sunday",
    ],
  };
}
