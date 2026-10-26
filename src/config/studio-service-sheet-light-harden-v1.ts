/**
 * HARDEN #3 — SERVICE SHEET (LIGHT)
 *
 * LIGHT names engineering effort, not finished quality.
 * Owner does not produce the service sheet.
 *
 * Authority: Tagia 2026-09-24 AUTHORIZE HARDEN #3 — SERVICE SHEET LIGHT
 */

import { studioGeneralDesignRuntimeV1 } from "./studio-general-design-runtime-v1";

export const STUDIO_SERVICE_SHEET_LIGHT_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-SERVICE-SHEET-LIGHT-HARDEN-1" as const;

export const SERVICE_SHEET_LIGHT_HARDEN_SKU = "v2-rtu-service-sheet" as const;

export const SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL =
  "PDF you can print yourself (digital CERT plate — not a certified 300 DPI print file)" as const;

export const SERVICE_SHEET_DIGITAL_PNG_LABEL =
  "Digital PNG you can share or print yourself" as const;

export const SERVICE_SHEET_HONEST_PROMISED_OUTPUT =
  "One portrait digital service list — up to ten services. Share it or print it yourself. This is not a certified 300 DPI print file." as const;

export const studioServiceSheetLightHardenV1 = {
  packageId: STUDIO_SERVICE_SHEET_LIGHT_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-24" as const,
  owner: "Tagia",
  skuId: SERVICE_SHEET_LIGHT_HARDEN_SKU,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "SELL_NOW" as const,
  frozenAt: "2026-09-24" as const,
  frozen: true as const,
  doNotReopenFlyer: true as const,
  doNotReopenCopyKits: true as const,
  doNotTouchCampaignGraphics: true as const,
  doNotTouchMenu: true as const,
  doNotTouchSocialPosts: true as const,
  doNotTouchShortVideo: true as const,
  doNotRemintMaya: true as const,
  doNotExpandToPhysicalPrint: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,

  qualityLock: {
    lightMeansEngineeringEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    requiredCustomerStandard: [
      "professional layout",
      "readability",
      "hierarchy",
      "accurate customer facts",
      "clean files",
      "proper QA",
    ] as const,
  },

  offer: {
    customerFacingName: "Make Me a Service Sheet",
    priceCents: 7900,
    promisedOutput: SERVICE_SHEET_HONEST_PROMISED_OUTPUT,
    maxServices: 10 as const,
    plate: { widthPx: 1024, heightPx: 1536 } as const,
    files: ["png", "pdf"] as const,
    artPath: ["type_led", "customer_supplied_rights_cleared_assets"] as const,
    includedRevisions: 1 as const,
    customerPrints: true as const,
    studioDoesNotPrintOrShip: true as const,
    certified300DpiPrint: false as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
  },

  businessCardPiggyback: {
    considered: true as const,
    included: false as const,
    reason:
      "Business Card has its own double-sided landscape composition, separate hook, and separate pipeline. That is material engineering, not a shared-lane hitchhike. Dropped from this pass. No standalone card harden.",
  },

  ceilings: {
    productionTime: "within 2–3 business days" as const,
    internalQaAttempts: studioGeneralDesignRuntimeV1.maxInternalProductionAttempts,
    includedCustomerRevisions: 1 as const,
    toolCostWarningCents: 1185,
    toolCostFailCents: 2370,
  },
} as const;

export function isServiceSheetLightHardenSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === SERVICE_SHEET_LIGHT_HARDEN_SKU;
}
