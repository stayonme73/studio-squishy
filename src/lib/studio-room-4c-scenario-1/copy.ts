/**
 * Room 4C Scenario 1 — paste-ready caption from the authoritative brief.
 */

import type { CopyQualityBrief } from "@/lib/studio-kitchen-production/copy-quality/types";
import { studioRoom4cScenario1CedarLaneV1 as brief } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";

/** Copy-quality tokens are compiled as regex; escape literals with metacharacters. */
function literalToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildScenario1Caption(): string {
  return [
    `${brief.offer.name} is open ${brief.offer.windowDisplay}.`,
    "",
    `${brief.customer.businessName} — ${brief.customer.location}.`,
    "",
    brief.offer.description,
    "",
    `${brief.cta.label}: ${brief.cta.phoneDisplay}`,
    brief.cta.bookingUrl,
  ].join("\n");
}

export function buildScenario1NarrationScript(): string {
  return [
    `${brief.customer.businessName}.`,
    `${brief.offer.name} — ${brief.offer.description}`,
    `${brief.offer.windowDisplay}.`,
    `${brief.cta.label} at ${brief.cta.bookingUrlSpoken}, or call ${brief.cta.phoneSpoken}.`,
  ].join(" ");
}

export function scenario1CopyQualityBrief(): CopyQualityBrief {
  return {
    skuId: "marketing-copy",
    requiredFactTokens: [
      brief.offer.name,
      "September 15",
      "October 15, 2026",
      brief.customer.businessName,
      "Richmond",
      literalToken(brief.cta.phoneDisplay),
      brief.cta.bookingUrl,
    ],
    prohibitedClaimPatterns: [
      "guaranteed",
      "best in richmond",
      "#1",
      "number one",
      "before and after",
      "50% off",
      "free consult forever",
      "we will post for you",
      "ad account",
    ],
    ctaTokens: [literalToken(brief.cta.phoneDisplay), brief.cta.bookingUrl],
    requireCta: true,
    maxAssets: 1,
    maxTotalWords: 120,
    forbiddenTonePatterns: ["neon", "synergy", "revolutionize", "next-level"],
  };
}
