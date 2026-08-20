/**
 * Room 4C Scenario 2 — canonical brief hash + CreativeBrief binding.
 */

import { createHash } from "crypto";

import type { CreativeBrief } from "@/lib/studio-campaign-creative/contracts";
import {
  HARBOR_ROAST_ASSET_IDS,
  ROOM_4C_SCENARIO_2_CAMPAIGN_ID,
  studioRoom4cScenario2HarborRoastV1 as brief,
} from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";

export const SCENARIO_2_TARGET_FORMATS = [
  "social_square",
  "social_vertical",
  "print_counter_card",
] as const;

export function canonicalScenario2BriefJson(): string {
  return `${JSON.stringify(brief, null, 2)}\n`;
}

export function hashScenario2Brief(json = canonicalScenario2BriefJson()): string {
  return createHash("sha256").update(json).digest("hex");
}

export function buildHarborRoastCreativeBrief(): CreativeBrief {
  return {
    campaignId: ROOM_4C_SCENARIO_2_CAMPAIGN_ID,
    customerName: brief.customer.businessName,
    businessName: brief.customer.businessName,
    campaignName: brief.offer.name,
    voiceDirection: brief.tone.voice,
    constraints: {
      noNeon: brief.tone.noNeon,
      noBeforeAfterBody: brief.tone.noBeforeAfterBody,
      calmWellness: brief.tone.calmWellness,
    },
    facts: {
      headline: brief.facts.headline,
      supportingCopy: brief.facts.supportingCopy,
      datesDisplay: brief.facts.datesDisplay,
      priceDisplay: brief.facts.priceDisplay,
      cta: brief.facts.cta,
      bookingContact: brief.facts.bookingContact,
    },
    selectedAssetIds: {
      logoId: HARBOR_ROAST_ASSET_IDS.logo,
      primaryPhotoId: HARBOR_ROAST_ASSET_IDS.heroBox,
      supportPhotoIds: [],
    },
    targetFormats: [...SCENARIO_2_TARGET_FORMATS],
    printCounterCardContractId: brief.printCounterCardContractId,
  };
}
