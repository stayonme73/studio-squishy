/**
 * Room 4C Scenario 1 — canonical brief hash + CreativeBrief binding.
 */

import { createHash } from "crypto";

import type { CreativeBrief } from "@/lib/studio-campaign-creative/contracts";
import { CAMPAIGN_FORMAT_ORDER } from "@/lib/studio-campaign-creative/formats";
import {
  CEDAR_LANE_ASSET_IDS,
  ROOM_4C_SCENARIO_1_CAMPAIGN_ID,
  studioRoom4cScenario1CedarLaneV1 as brief,
} from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";

export function canonicalScenario1BriefJson(): string {
  return `${JSON.stringify(brief, null, 2)}\n`;
}

export function hashScenario1Brief(json = canonicalScenario1BriefJson()): string {
  return createHash("sha256").update(json).digest("hex");
}

export function buildCedarLaneCreativeBrief(): CreativeBrief {
  return {
    campaignId: ROOM_4C_SCENARIO_1_CAMPAIGN_ID,
    customerName: brief.customer.businessName,
    businessName: brief.customer.businessName,
    campaignName: brief.offer.name,
    voiceDirection: brief.tone.voice,
    constraints: {
      noNeon: brief.tone.noNeon,
      noBeforeAfterBody: brief.tone.noBeforeAfterBody,
      calmWellness: brief.tone.calmWellness,
    },
    facts: { ...brief.facts },
    selectedAssetIds: {
      logoId: CEDAR_LANE_ASSET_IDS.logo,
      primaryPhotoId: CEDAR_LANE_ASSET_IDS.heroCloset,
      supportPhotoIds: [CEDAR_LANE_ASSET_IDS.supportEntry],
    },
    targetFormats: [...CAMPAIGN_FORMAT_ORDER],
  };
}
