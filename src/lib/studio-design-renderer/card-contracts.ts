/**
 * v2-rtu-business-card contract surface for the design-renderer proof.
 * Mechanism only — does not invent prepress requirements.
 */

import {
  BUSINESS_CARD_CANVAS,
  DESIGN_RENDERER_BUSINESS_CARD_SKU,
} from "./card-types";

export const BUSINESS_CARD_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_BUSINESS_CARD_SKU,
  name: "Make Me a Business Card",
  promisedOutput:
    "One double-sided business card design — design only; one person or version; one agreed size. Print-ready PDF + digital PNG or JPG preview. Printing/shipping excluded.",
  sidesRequired: ["front", "back"] as const,
  formatExportRequirements: [
    "Final flattened digital export (PNG and/or PDF as appropriate)",
    "Editable Canva source files are not included unless separately authorized",
    "Business card design only (print excluded)",
  ] as const,
  /**
   * CERT-DESIGN plate used as the agreed Machine canvas for this proof.
   * Pixel plate ≠ physical-inch / bleed / CMYK certification.
   */
  canvas: BUSINESS_CARD_CANVAS,
  canvasSemantics:
    "1536×1024 landscape is the authoritative CERT-DESIGN preview/PDF plate for this SKU in-repo. Catalog promises one agreed size without fixed inches. This proof locks that CERT plate only — it does not certify physical trim size, bleed, or press color.",
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
    "Flattened multi-page PDF (front then back) at the agreed CERT plate pixels, suitable for customer-managed print — not Studio print fulfillment and not prepress certification.",
  canvaRequired: false,
  makeRequired: false,
  ownerRoutineProduction: "NONE" as const,
} as const;

export function isDesignRendererBusinessCardSku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_BUSINESS_CARD_SKU;
}
