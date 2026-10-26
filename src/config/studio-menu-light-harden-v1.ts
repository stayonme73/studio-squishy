/**
 * HARDEN #5 — MENU (LIGHT)
 *
 * LIGHT names engineering effort, not finished quality.
 * Owner does not produce the menu. Studio typesets customer facts.
 * Studio does not verify allergens, ingredients, prices, or legal wording.
 *
 * Authority: Tagia 2026-09-24 AUTHORIZE HARDEN #5 — MENU LIGHT
 */

import { studioGeneralDesignRuntimeV1 } from "./studio-general-design-runtime-v1";

export const STUDIO_MENU_LIGHT_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-MENU-LIGHT-HARDEN-1" as const;

export const MENU_LIGHT_HARDEN_SKU = "v2-rtu-menu" as const;

export const MENU_CUSTOMER_PRINT_PDF_LABEL =
  "PDF you can print yourself (digital CERT plate — not a certified 300 DPI print file)" as const;

export const MENU_DIGITAL_PNG_LABEL =
  "Digital PNG you can share or print yourself" as const;

export const MENU_HONEST_PROMISED_OUTPUT =
  "One single-page digital menu — up to 5 sections and 30 items. You supply and verify items, prices, and allergen wording. Share it or print it yourself. This is not a certified 300 DPI print file." as const;

export const studioMenuLightHardenV1 = {
  packageId: STUDIO_MENU_LIGHT_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-24" as const,
  owner: "Tagia",
  skuId: MENU_LIGHT_HARDEN_SKU,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "SELL_NOW" as const,
  frozenAt: "2026-09-24" as const,
  frozen: true as const,
  doNotReopenFlyer: true as const,
  doNotReopenCopyKits: true as const,
  doNotReopenServiceSheet: true as const,
  doNotReopenCampaignGraphics: true as const,
  doNotTouchSocialPosts: true as const,
  doNotTouchBusinessCard: true as const,
  doNotTouchShortVideo: true as const,
  doNotRemintMaya: true as const,
  doNotExpandToPhysicalPrint: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,
  studioIsDesignerNotFoodLawOracle: true as const,

  qualityLock: {
    lightMeansEngineeringEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    doNotForceFitWithTinyType: true as const,
    requiredCustomerStandard: [
      "layout",
      "hierarchy",
      "readability",
      "spacing",
      "accurate customer facts",
      "clean files",
      "professional presentation",
    ] as const,
  },

  allergenLegalFactLock: {
    studioDoesNotResearchInferRewriteCertifyOrVerify: true as const,
    customerWordingStaysExact: true as const,
    missingOrAmbiguousWaitsForCustomer: true as const,
    missingFactsAreNotOwnerRescue: true as const,
    cannotPreserveFactsFailCloses: true as const,
  },

  offer: {
    customerFacingName: "Make Me a Menu",
    priceCents: 8900,
    promisedOutput: MENU_HONEST_PROMISED_OUTPUT,
    maxSections: 5 as const,
    maxItems: 30 as const,
    plate: { widthPx: 1024, heightPx: 1536 } as const,
    files: ["png", "pdf"] as const,
    artPath: ["type_led", "customer_supplied_rights_cleared_assets"] as const,
    includedRevisions: 1 as const,
    customerPrints: true as const,
    studioDoesNotPrintOrShip: true as const,
    certified300DpiPrint: false as const,
    bifold: false as const,
    booklet: false as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
  },

  piggyback: {
    socialPosts: false as const,
    businessCard: false as const,
    shortVideo: false as const,
    reason: "None share this single-page menu composition system. Dropped.",
  },

  ceilings: {
    productionTime: "within 3–5 business days" as const,
    internalQaAttempts: studioGeneralDesignRuntimeV1.maxInternalProductionAttempts,
    includedCustomerRevisions: 1 as const,
    toolCostWarningCents: 1335,
    toolCostFailCents: 2670,
  },
} as const;

export function isMenuLightHardenSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === MENU_LIGHT_HARDEN_SKU;
}
