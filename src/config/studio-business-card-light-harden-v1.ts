/**
 * HARDEN #7 — BUSINESS CARD (LIGHT)
 *
 * LIGHT names engineering effort, not finished quality.
 * Owner does not produce the card. Customer prints.
 *
 * Authority: Tagia 2026-09-24 AUTHORIZE BUSINESS CARD LIGHT HARDEN — $69
 */

import { studioGeneralDesignRuntimeV1 } from "./studio-general-design-runtime-v1";

export const STUDIO_BUSINESS_CARD_LIGHT_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-BUSINESS-CARD-LIGHT-HARDEN-1" as const;

export const BUSINESS_CARD_LIGHT_HARDEN_SKU = "v2-rtu-business-card" as const;

export const BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL =
  "PDF you can print yourself (digital CERT plate — not a certified 3.5×2 or 300 DPI print file)" as const;

export const BUSINESS_CARD_FRONT_PNG_LABEL =
  "Front — digital PNG 1536×1024" as const;

export const BUSINESS_CARD_BACK_PNG_LABEL =
  "Back — digital PNG 1536×1024" as const;

export const BUSINESS_CARD_HONEST_PROMISED_OUTPUT =
  "One double-sided digital business card for one person — 1536×1024 both sides. Front and back PNG plus a PDF you can print yourself. This is not a certified 3.5×2 or 300 DPI print file." as const;

export const studioBusinessCardLightHardenV1 = {
  packageId: STUDIO_BUSINESS_CARD_LIGHT_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-24" as const,
  owner: "Tagia",
  skuId: BUSINESS_CARD_LIGHT_HARDEN_SKU,
  hardenClass: "LIGHT" as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "SELL_NOW" as const,
  frozenAt: "2026-09-24" as const,
  frozen: true as const,
  doNotReopenFlyer: true as const,
  doNotReopenCopyKits: true as const,
  doNotReopenServiceSheet: true as const,
  doNotReopenCampaignGraphics: true as const,
  doNotReopenMenu: true as const,
  doNotReopenSocialPosts: true as const,
  doNotTouchShortVideo: true as const,
  doNotRemintMaya: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,
  ownerConsoleParked: true as const,

  qualityLock: {
    lightMeansEngineeringEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    bothSidesMustMeetStudioStandardAsOneCard: true as const,
    requiredCustomerStandard: [
      "layout",
      "hierarchy",
      "readability",
      "spacing",
      "accurate customer facts",
      "coordinated card",
      "clean files",
      "professional presentation",
    ] as const,
  },

  offer: {
    customerFacingName: "Make Me a Business Card",
    priceCents: 6900,
    promisedOutput: BUSINESS_CARD_HONEST_PROMISED_OUTPUT,
    onePerson: true as const,
    sides: ["front", "back"] as const,
    plate: { widthPx: 1536, heightPx: 1024 } as const,
    files: ["png", "pdf"] as const,
    artPath: ["type_led", "customer_supplied_rights_cleared_logo"] as const,
    includedRevisions: 1 as const,
    oneCardRevisionNotTwoSideRedesigns: true as const,
    wholeCardVersionsTogether: true as const,
    setIncompleteUnlessBothPass: true as const,
    customerPrints: true as const,
    studioDoesNotPrintOrShip: true as const,
    certifiedPhysicalInches: false as const,
    certified300DpiPrint: false as const,
    logoCreation: false as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
  },

  piggyback: {
    shortVideo: false as const,
    reason: "Short Video is a different factory. Dropped.",
  },

  ceilings: {
    productionTime: "within 2–3 business days" as const,
    internalQaAttempts: studioGeneralDesignRuntimeV1.maxInternalProductionAttempts,
    includedCustomerRevisions: 1 as const,
    toolCostWarningCents: 1035,
    toolCostFailCents: 2070,
  },
} as const;

export function isBusinessCardLightHardenSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === BUSINESS_CARD_LIGHT_HARDEN_SKU;
}
