/**
 * v2-rtu-business-card contract surface for the design-renderer proof.
 * Mechanism only — does not invent prepress requirements.
 */

import { BUSINESS_CARD_HONEST_PROMISED_OUTPUT } from "@/config/studio-business-card-light-harden-v1";
import {
  BUSINESS_CARD_CANVAS,
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
} from "./card-types";

export const BUSINESS_CARD_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_BUSINESS_CARD_SKU,
  name: "Make Me a Business Card",
  promisedOutput: BUSINESS_CARD_HONEST_PROMISED_OUTPUT,
  wholeCardVersionsTogether: true,
  setIncompleteUnlessBothPass: true,
  oneCardRevisionNotTwoSideRedesigns: true,
  customerPrints: true,
  certifiedPhysicalInches: false,
  certified300DpiPrint: false,
  sidesRequired: ["front", "back"] as const,
  formatExportRequirements: [
    "Front digital PNG and back digital PNG — 1536×1024 each",
    "PDF you can print yourself (digital CERT plate — not a certified 3.5×2 or 300 DPI print file)",
    "Editable source files are not included unless separately authorized",
    "Double-sided digital card — customer prints",
  ] as const,
  /**
   * CERT-DESIGN plate used as the agreed Machine canvas for this proof.
   * Pixel plate ≠ physical-inch / bleed / CMYK certification.
   */
  canvas: BUSINESS_CARD_CANVAS,
  canvasSemantics:
    "HARDEN #7 LIGHT 2026-09-24: 1536×1024 landscape is the sold digital CERT plate for both sides. Not a certified 3.5×2, 300 DPI, bleed, or CMYK file.",
  dimensionTolerancePx: 40,
  requiredDeliverableFormats: ["png", "pdf"] as const,
  /**
   * Catalog allows “PNG or JPG” for digital preview — PNG satisfies the or-clause.
   * JPG is not required for PASS.
   */
  digitalPreviewSatisfiedBy: "png" as const,
  /**
   * “Print-ready PDF” in catalog = flattened PDF the customer can take to their own printer.
   * Not professional prepress (no bleed/trim/CMYK/DPI certification in this package).
   */
  printReadyMeans:
    "Flattened multi-page PDF (front then back) at the digital CERT plate. Customer prints. Not Studio print fulfillment and not a certified 3.5×2 or 300 DPI file.",
  canvaRequired: false,
  makeRequired: false,
  ownerRoutineProduction: "NONE" as const,
} as const;

export function isDesignRendererBusinessCardSku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_BUSINESS_CARD_SKU;
}
