/**
 * Menu renderer contract surface — proof only; no primaryTool remap.
 */

import {
  DESIGN_RENDERER_MENU_SKU,
  MENU_CANVAS,
  MENU_MAX_ITEMS_TOTAL,
  MENU_MAX_SECTIONS,
  MENU_MIN_FONT_PX,
} from "./menu-types";

export const MENU_PROOF_CONTRACT = {
  packageId: "STUDIO-OPERATING-DESIGN-MENU-PROOF-1",
  layoutPackageId: "STUDIO-OPERATING-DESIGN-MENU-LAYOUT-1",
  skuId: DESIGN_RENDERER_MENU_SKU,
  canvas: MENU_CANVAS,
  maxSections: MENU_MAX_SECTIONS,
  maxItemsTotal: MENU_MAX_ITEMS_TOTAL,
  minFontPx: MENU_MIN_FONT_PX,
  layoutModes: ["single_column", "two_column"] as const,
  multiPageExcluded: true,
  bifoldExcluded: true,
  allergenVerificationExcluded: true,
  /** PNG satisfies catalog “PNG or JPG”; JPG not required. */
  digitalPreview: "png_or_jpg" as const,
  printReadyMeaning:
    "Flattened single-page PDF for customer print/share — not bleed/CMYK/vendor imposition.",
  ownerRoutineProduction: "NONE" as const,
  canvaRequired: false,
  makeRequired: false,
  primaryToolRemapInThisPackage: false,
} as const;

export function isDesignRendererMenuSku(skuId: string): boolean {
  return skuId === DESIGN_RENDERER_MENU_SKU;
}

export function countMenuItems(
  sections: readonly { items: readonly unknown[] }[],
): number {
  return sections.reduce((n, s) => n + s.items.length, 0);
}
