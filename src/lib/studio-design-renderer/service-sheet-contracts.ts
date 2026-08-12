/**
 * Service-sheet proof contract constants.
 */

import {
  DESIGN_RENDERER_SERVICE_SHEET_SKU,
  SERVICE_SHEET_CANVAS,
  SERVICE_SHEET_MAX_SERVICES,
  type DesignRendererServiceSheetSku,
} from "./service-sheet-types";

export const SERVICE_SHEET_PROOF_CONTRACT = {
  packageId: "STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1",
  skuId: DESIGN_RENDERER_SERVICE_SHEET_SKU,
  maxServices: SERVICE_SHEET_MAX_SERVICES,
  canvas: SERVICE_SHEET_CANVAS,
  layoutModes: ["single_column"] as const,
  priceModes: ["listed", "contact_for_pricing", "omitted"] as const,
  note:
    "DELTA B — optional pricing modes on sealed portrait list spine. primaryTool remains Canva until Owner-authorized hook.",
} as const;

export function isDesignRendererServiceSheetSku(
  skuId: string,
): skuId is DesignRendererServiceSheetSku {
  return skuId === DESIGN_RENDERER_SERVICE_SHEET_SKU;
}

export function countServiceSheetServices(
  services: readonly { serviceId: string }[],
): number {
  return services.length;
}
