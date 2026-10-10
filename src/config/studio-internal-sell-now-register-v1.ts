/**
 * Internal SELL NOW register.
 * Public Launch Now menu is a separate publish step. Do not treat this as menu publish.
 * The original frozen nine stay untouched. The $349 tenth stays frozen.
 *
 * SUPERSEDED FOR LAUNCH (owner ruling 2026-10-10): this is the old Launch Now shelf.
 * It is history and internal reference only. It does not define the current launch
 * count, current launch prices, or customer-facing availability, and it does not
 * override launch authority. Studio Voice and new customer checkout do not read it.
 * Launch truth: `studio-canonical-launch-truth-v1.ts`.
 */

import { STUDIO_CANONICAL_LAUNCH_TRUTH_ID } from "@/config/studio-canonical-launch-truth-v1";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";

export const ORIGINAL_FROZEN_NINE_SELL_NOW_SKUS = [
  "v2-rtu-flyer",
  "v2-rtu-promotion-graphics",
  "v2-rtu-social-posts",
  "v2-rtu-business-card",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
  "v2-rtu-email-kit",
  "v2-rtu-sms-kit",
  "v2-rtu-short-video",
] as const;

export const TENTH_SELL_NOW_SKU = SHORT_FORM_VIDEO_EDITING_SKU;

export const ELEVENTH_SELL_NOW_SKU = CLIP_REPURPOSING_SKU;

export const INTERNAL_SELL_NOW_SKUS = [
  ...ORIGINAL_FROZEN_NINE_SELL_NOW_SKUS,
  TENTH_SELL_NOW_SKU,
  ELEVENTH_SELL_NOW_SKU,
] as const;

/** Shared non-authority stamp for the three old-shelf configs. */
export const LEGACY_SHELF_NON_AUTHORITY = {
  role: "HISTORICAL_INTERNAL_REFERENCE" as const,
  launchAuthority: STUDIO_CANONICAL_LAUNCH_TRUTH_ID,
  supersededAt: "2026-10-10" as const,
  definesCurrentLaunchCount: false as const,
  definesCurrentLaunchPrices: false as const,
  drivesCustomerFacingAvailability: false as const,
  overridesCanonicalLaunchAuthority: false as const,
} as const;

export const studioInternalSellNowRegisterV1 = {
  schemaVersion: 1 as const,
  updatedAt: "2026-09-26" as const,
  ...LEGACY_SHELF_NON_AUTHORITY,
  /** Historical: the old shelf's published count on 2026-09-26. Not the launch count. */
  publicLaunchNowPublishedCount: 11 as const,
  internalSellNowCount: 11 as const,
  originalNineUntouched: true as const,
  tenthSku: TENTH_SELL_NOW_SKU,
  tenthPublicMenuPublished: true as const,
  eleventhSku: ELEVENTH_SELL_NOW_SKU,
  eleventhPublicMenuPublished: true as const,
  doNotPublishPublicMenuFromThisRegister: true as const,
  nextPackageWhenAuthorized:
    "launch-critical business shell after all 11 certified services are public" as const,
  clipRepurposingPhase: "certified_sell_now_published" as const,
  doNotStartClipRepurposingPhase2FromRegister: false as const,
  doNotStartClipRepurposingPhase3FromRegister: true as const,
} as const;

export function isOriginalFrozenNineSellNowSku(
  skuId: string | null | undefined,
): boolean {
  return ORIGINAL_FROZEN_NINE_SELL_NOW_SKUS.some((sku) => sku === skuId);
}

/** Old-shelf membership (history / internal factories). Not current customer availability. */
export function isInternalSellNowSku(skuId: string | null | undefined): boolean {
  return INTERNAL_SELL_NOW_SKUS.some((sku) => sku === skuId);
}
