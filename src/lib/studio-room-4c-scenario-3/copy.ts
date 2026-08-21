/**
 * Room 4C Scenario 3 — customer-facing caption, email, direction.
 * Warm handmade textile voice. Facts only from the authoritative brief.
 */

import type { CopyQualityBrief } from "@/lib/studio-kitchen-production/copy-quality/types";
import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

function literalToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Capitalize the approved visitor claim for customer-facing sentences. */
export function scenario3VisitorClaimSentence(): string {
  const claim = brief.offer.visitorClaim;
  return claim.charAt(0).toUpperCase() + claim.slice(1);
}

/**
 * Retained for regression against the rejected narrated package.
 * Music-led delivery does not speak these lines.
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
    `Step inside ${brief.customer.businessName} for ${brief.offer.name}, ${brief.offer.windowDisplay}.`,
    "",
    scenario3VisitorClaimSentence() + ".",
    "",
    `Saturday ${brief.offer.hoursSaturdayDisplay}`,
    `Sunday ${brief.offer.hoursSundayDisplay}`,
    brief.offer.admissionDisplay,
    "",
    brief.customer.locationDisplay,
    "",
    `${brief.cta.label}:`,
    brief.cta.eventUrl,
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
      `${brief.offer.name} at ${brief.customer.businessName}`,
    ],
    previewText: `${brief.offer.windowDisplay} · ${brief.offer.admissionDisplay}`,
    body: [
      `You are invited to ${brief.offer.name} at ${brief.customer.businessName}.`,
      "",
      `Join us ${brief.offer.windowDisplay}. ${scenario3VisitorClaimSentence()}.`,
      "",
      `Saturday ${brief.offer.hoursSaturdayDisplay}`,
      `Sunday ${brief.offer.hoursSundayDisplay}`,
      brief.offer.admissionDisplay,
      "",
      brief.customer.locationDisplay,
      "",
      `${brief.cta.label}: ${brief.cta.eventUrl}`,
      "",
      `Questions are welcome at ${brief.cta.supportEmail}.`,
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
    "1. Campaign goal",
    `Invite people to ${brief.offer.name} on ${brief.offer.windowDisplay}. Make the weekend feel welcoming, handmade, and easy to understand: when to come, what to expect, and how to learn more.`,
    "",
    "2. Audience",
    "Neighbors, textile shoppers, and anyone curious about handmade soft goods who may visit a working studio in Richmond for an open weekend.",
    "",
    "3. Campaign idea",
    `${brief.customer.businessName} is opening its doors for ${brief.offer.name}. The message is simple and warm: come see the studio, meet the maker, and shop available textile pieces in person.`,
    "",
    "4. Tone",
    brief.tone.voice,
    "",
    "5. Visual direction",
    "Lead with moss greens, natural linen, and terracotta accents. Use the studio interior for place and arrival. Use product textiles for the work on offer. Use the maker photograph as brand-story imagery — not as a promise that a staged in-person show will occur.",
    "",
    "6. Messaging hierarchy",
    `1. ${brief.offer.name}`,
    `2. ${brief.offer.windowDisplay}`,
    `3. ${brief.customer.locationDisplay}`,
    `4. Saturday and Sunday hours`,
    `5. ${brief.offer.admissionDisplay}`,
    `6. ${brief.cta.label} → ${brief.cta.eventUrl}`,
    "",
    "7. How each deliverable is used",
    "- Square social graphic: product-led invitation for feeds.",
    "- Vertical social graphic: taller story/reel frame with dates and call to action.",
    "- Short-form video: music-led multi-photo sequence that opens with the studio, shows textiles and the maker, and closes on visit details, CTA, and URL.",
    "- Promotional caption: paste-ready post copy with the full visit facts.",
    "- Event email: subject, preheader, and body for a warm invitation.",
    "- US Letter invitation/handout: print-ready guest piece for the counter or mailing.",
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
      "live weaving",
      "refreshment",
      "giveaway",
      String.raw`\blimited quantities\b`,
      "custom.?order",
      "wheelchair",
      "accessible entrance",
      "parking",
      "shipping",
      String.raw`\bnia\b`,
      String.raw`\byoga\b`,
      "certification-fixture",
      "external-photo-path",
      "motion-safe",
      "copy-QA",
      String.raw`\(804\)`,
      "Clay Street",
      "mossthread.example/visit",
    ],
    ctaTokens: [brief.cta.label, literalToken(brief.cta.eventUrl)],
    requireCta: true,
    maxEmails: 1,
    maxAssets: 1,
    maxTotalWords: 260,
    forbiddenTonePatterns: ["synergy", "revolutionize", "next-level"],
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
