/**
 * Nia Fall Reset CreativeBrief — facts from Room 4B fixture.
 * Photo binaries bound separately; placeholders are not live-cert evidence.
 */

import {
  NIA_BUSINESS_NAME,
  NIA_CAMPAIGN_NAME,
  NIA_CONTACT,
  NIA_CUSTOMER_NAME,
  NIA_PRICE_DISPLAY,
  NIA_PROGRAM_DATES_DISPLAY,
  NIA_PROGRAM_TITLE,
  NIA_STYLE_DIRECTION,
  NIA_VOICE_BRIEF_EXACT,
} from "@/lib/studio-room-4b-launch-toolbox/nia-fixture";

import type { CreativeBrief } from "./contracts";
import { CAMPAIGN_FORMAT_ORDER } from "./formats";
import { ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1 } from "./visual-system/rooted-ready-wellness-v1";

/** Stable fixture asset IDs — binaries required for live cert. */
export const NIA_PHOTO_ASSET_IDS = {
  logo: "nia-logo",
  windowPortrait: "nia-photo-good-1",
  standingPortrait: "nia-photo-good-2",
  activity: "nia-photo-good-3",
  environment: "nia-photo-good-4",
  mediocre1: "nia-photo-mediocre-1",
  mediocre2: "nia-photo-mediocre-2",
} as const;

export function buildNiaFallResetCreativeBrief(input?: {
  campaignId?: string;
  primaryPhotoId?: string;
}): CreativeBrief {
  return {
    campaignId: input?.campaignId ?? "nia-r4b-photo-led-build-1",
    customerName: NIA_CUSTOMER_NAME,
    businessName: NIA_BUSINESS_NAME,
    campaignName: NIA_CAMPAIGN_NAME,
    voiceDirection: NIA_VOICE_BRIEF_EXACT,
    constraints: {
      noNeon: true,
      noBeforeAfterBody: true,
      calmWellness: true,
    },
    facts: {
      headline: NIA_PROGRAM_TITLE,
      supportingCopy:
        "A six-week guided reset for busy women — live coaching, simple daily practices, and a calm plan you can keep.",
      datesDisplay: NIA_PROGRAM_DATES_DISPLAY,
      priceDisplay: NIA_PRICE_DISPLAY,
      cta: "Enroll in Fall Reset",
      bookingContact: `${NIA_CONTACT.phone} · rootedandready.example/fall-reset`,
    },
    selectedAssetIds: {
      logoId: NIA_PHOTO_ASSET_IDS.logo,
      primaryPhotoId:
        input?.primaryPhotoId ?? NIA_PHOTO_ASSET_IDS.windowPortrait,
      supportPhotoIds: [
        NIA_PHOTO_ASSET_IDS.standingPortrait,
        NIA_PHOTO_ASSET_IDS.activity,
        NIA_PHOTO_ASSET_IDS.environment,
      ],
    },
    targetFormats: [...CAMPAIGN_FORMAT_ORDER],
    printHandoutContractId: "campaign-print-handout-v1",
  };
}

export const NIA_DEFAULT_VISUAL_SYSTEM_ID =
  ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1.systemId;

export const NIA_STYLE_DIRECTION_LOCK = NIA_STYLE_DIRECTION;
