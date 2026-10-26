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
  name: "Make Me a Service Sheet",
  promisedOutput:
    "One portrait digital service list — up to ten services. Share it or print it yourself. This is not a certified 300 DPI print file.",
  maxServices: SERVICE_SHEET_MAX_SERVICES,
  canvas: SERVICE_SHEET_CANVAS,
  requiredDeliverableFormats: ["png", "pdf"] as const,
  layoutModes: ["single_column"] as const,
  priceModes: ["listed", "contact_for_pricing", "omitted"] as const,
  note:
    "HARDEN #3 LIGHT — type-led portrait list. Customer prints. Not a certified 300 DPI print file.",
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
