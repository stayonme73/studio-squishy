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
  name: "Make Me a Menu",
  promisedOutput:
    "One single-page digital menu — up to 5 sections and 30 items. You supply and verify items, prices, and allergen wording. Share it or print it yourself. This is not a certified 300 DPI print file.",
  requiredDeliverableFormats: ["png", "pdf"] as const,
  allergenVerificationExcluded: true,
  studioDoesNotVerifyAllergensPricesOrLegal: true as const,
  /** PNG satisfies catalog “PNG or JPG”; JPG not required. */
  digitalPreview: "png" as const,
  printReadyMeaning:
    "Flattened single-page PDF the customer prints — digital CERT plate, not a certified 300 DPI print file.",
  note: "HARDEN #5 LIGHT — type-led single page. Customer facts stay exact. Overflow fail-closes. Owner does not finish the menu.",
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
