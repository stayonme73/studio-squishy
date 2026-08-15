/**
 * v2-rtu-flyer contract surface for the design-renderer proof.
 * Does not weaken SKU promise — mechanism only.
 */

import { FLYER_CANVAS, DESIGN_RENDERER_PROOF_SKU } from "./types";

export const FLYER_PROOF_CONTRACT = {
  skuId: DESIGN_RENDERER_PROOF_SKU,
  name: "Make Me a Flyer",
  promisedOutput: "One single-sided flyer in one size — ready to print or share online.",
  formatExportRequirements: [
    "Final flattened digital export (PNG and/or PDF as appropriate)",
    "Editable Canva source files are not included unless separately authorized",
    "One flyer — PDF + digital",
  ] as const,
  /** Proof plate aligns with CERT-DESIGN / design-quality expected dims. */
  canvas: FLYER_CANVAS,
  dimensionTolerancePx: 40,
  requiredDeliverableFormats: ["png", "pdf"] as const,
  canvaRequired: false,
  makeRequired: false,
  ownerRoutineProduction: "NONE" as const,
  /**
   * Customer logo is not a frozen SKU product-law requirement.
   * The renderer may produce a wordmark-only flyer when the customer supplied none.
   * Do not invent or substitute a logo.
   */
  customerLogoRequired: false,
} as const;

export function isDesignRendererProofSku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_PROOF_SKU;
}
