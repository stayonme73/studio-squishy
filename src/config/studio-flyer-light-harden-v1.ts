/**
 * HARDEN #1 — FLYER (LIGHT)
 *
 * LIGHT names the engineering effort, not the finished quality.
 * The customer still receives Studio-quality work. Reduce scope
 * before reducing quality. Owner does not produce the flyer.
 *
 * Authority: Tagia 2026-09-23 AUTHORIZE HARDEN #1 — FLYER
 */

import { FLYER_SKU_ECONOMICS_V1 } from "./studio-production-cost-telemetry-v1";
import { studioAutonomousProductionLoopV1 } from "./studio-autonomous-production-loop-v1";

export const STUDIO_FLYER_LIGHT_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-FLYER-LIGHT-HARDEN-1" as const;

export const FLYER_LIGHT_HARDEN_SKU = "v2-rtu-flyer" as const;

export const FLYER_CUSTOMER_PRINT_PDF_LABEL =
  "PDF you can print yourself (digital CERT plate — not a certified 300 DPI print file)" as const;

export const FLYER_PRINT_PDF_LABEL_ALIASES = [
  FLYER_CUSTOMER_PRINT_PDF_LABEL,
  "Print-ready PDF",
] as const;

export const FLYER_HONEST_PROMISED_OUTPUT =
  "One single-sided digital flyer in one size — share online or print it yourself. This is not a certified 300 DPI print file." as const;

export const studioFlyerLightHardenV1 = {
  packageId: STUDIO_FLYER_LIGHT_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-23" as const,
  owner: "Tagia",
  skuId: FLYER_LIGHT_HARDEN_SKU,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "SELL_NOW" as const,
  frozenAt: "2026-09-23" as const,
  frozen: true as const,
  doNotReopenFlyerUnlessRegression: true as const,
  doNotStartEmailKit: true as const,
  doNotStartTextKit: true as const,
  nextBrickWhenAuthorized: "email_kit_and_text_kit_together" as const,
  doNotRemintMaya: true as const,
  doNotExpandToPhysicalPrint: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,

  qualityLock: {
    lightMeansEngineeringEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    requiredCustomerStandard: [
      "professional visual quality",
      "accurate customer facts",
      "readability",
      "clean hierarchy/layout",
      "correct files",
      "proper QA",
      "professional presentation",
    ] as const,
  },

  offer: {
    customerFacingName: "Make Me a Flyer",
    priceCents: FLYER_SKU_ECONOMICS_V1.priceCents,
    promisedOutput: FLYER_HONEST_PROMISED_OUTPUT,
    sides: 1 as const,
    sizes: 1 as const,
    plate: { widthPx: 1024, heightPx: 1536 } as const,
    files: ["png", "pdf"] as const,
    artPath: ["type_led", "customer_supplied_rights_cleared_photos"] as const,
    includedRevisions: 1 as const,
    customerPrints: true as const,
    studioDoesNotPrintOrShip: true as const,
    certified300DpiPrint: false as const,
    generatedFullBleedHeroSold: false as const,
    studioPhotographySold: false as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
  },

  ceilings: {
    productionTime: "within 2–3 business days" as const,
    internalQaAttempts: studioAutonomousProductionLoopV1.maxInternalProductionAttempts,
    includedCustomerRevisions: 1 as const,
    toolCostWarningCents: Math.round(
      FLYER_SKU_ECONOMICS_V1.priceCents *
        FLYER_SKU_ECONOMICS_V1.providerCostWarningShareOfPrice,
    ),
    toolCostFailCents: Math.round(
      FLYER_SKU_ECONOMICS_V1.priceCents *
        FLYER_SKU_ECONOMICS_V1.providerCostFailShareOfPrice,
    ),
  },

  proofRequired: [
    "intake_to_final_delivery",
    "no_owner_rescue",
    "truthful_materials_rights",
    "production_time_ceiling",
    "tool_cost_ceiling",
    "qa_ceiling",
    "correct_delivered_files",
    "menu_matches_delivery",
  ] as const,
} as const;

export function isFlyerLightHardenSku(skuId: string | null | undefined): boolean {
  return skuId === FLYER_LIGHT_HARDEN_SKU;
}
