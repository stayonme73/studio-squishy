/**
 * HARDEN #4 — CAMPAIGN GRAPHICS (LIGHT)
 *
 * LIGHT names engineering effort, not finished quality.
 * Owner does not produce the campaign graphics.
 *
 * Authority: Tagia 2026-09-24 AUTHORIZE HARDEN #4 — CAMPAIGN GRAPHICS LIGHT
 */

import { studioGeneralDesignRuntimeV1 } from "./studio-general-design-runtime-v1";

export const STUDIO_CAMPAIGN_GRAPHICS_LIGHT_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-CAMPAIGN-GRAPHICS-LIGHT-HARDEN-1" as const;

export const CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU =
  "v2-rtu-promotion-graphics" as const;

export const CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL =
  "Campaign graphic 1 — digital PNG you can post or share yourself" as const;

export const CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL =
  "Campaign graphic 2 — digital PNG you can post or share yourself" as const;

export const CAMPAIGN_GRAPHICS_HONEST_PROMISED_OUTPUT =
  "Two coordinated digital campaign graphics for one theme — one square 1024×1024 and one portrait 1024×1536. You post or share them. This is not a certified 300 DPI print file." as const;

export const studioCampaignGraphicsLightHardenV1 = {
  packageId: STUDIO_CAMPAIGN_GRAPHICS_LIGHT_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-24" as const,
  owner: "Tagia",
  skuId: CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "SELL_NOW" as const,
  frozenAt: "2026-09-24" as const,
  frozen: true as const,
  doNotReopenFlyer: true as const,
  doNotReopenCopyKits: true as const,
  doNotReopenServiceSheet: true as const,
  doNotTouchMenu: true as const,
  doNotTouchSocialPosts: true as const,
  doNotTouchBusinessCard: true as const,
  doNotTouchShortVideo: true as const,
  doNotRemintMaya: true as const,
  doNotExpandToPhysicalPrint: true as const,
  doNotSellLandscape: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,
  twoGraphicsShareOneCompositionSystem: true as const,

  qualityLock: {
    lightMeansEngineeringEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    requiredCustomerStandard: [
      "visual polish",
      "hierarchy",
      "readability",
      "accurate customer facts",
      "coordination between both graphics",
      "clean export files",
      "proper QA",
    ] as const,
  },

  offer: {
    customerFacingName: "Make My Campaign Graphics",
    priceCents: 7900,
    promisedOutput: CAMPAIGN_GRAPHICS_HONEST_PROMISED_OUTPUT,
    exactAssetCount: 2 as const,
    oneTheme: true as const,
    soldPlates: [
      { id: "square", widthPx: 1024, heightPx: 1024 },
      { id: "portrait", widthPx: 1024, heightPx: 1536 },
    ] as const,
    files: ["png"] as const,
    captions: false as const,
    artPath: ["type_led", "customer_supplied_rights_cleared_assets"] as const,
    includedRevisions: 1 as const,
    customerDistributes: true as const,
    studioDoesNotPrintPostOrShip: true as const,
    certified300DpiPrint: false as const,
    landscapeSold: false as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
  },

  piggyback: {
    menu: false as const,
    socialPosts: false as const,
    businessCard: false as const,
    shortVideo: false as const,
    reason: "None share this two-asset campaign-set renderer. Dropped.",
  },

  ceilings: {
    productionTime: "within 3–5 business days" as const,
    internalQaAttempts: studioGeneralDesignRuntimeV1.maxInternalProductionAttempts,
    includedCustomerRevisions: 1 as const,
    toolCostWarningCents: 1185,
    toolCostFailCents: 2370,
  },
} as const;

export function isCampaignGraphicsLightHardenSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU;
}
