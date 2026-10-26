/**
 * Menu — purchase → Review → Final Delivery truth.
 */

import {
  MENU_CUSTOMER_PRINT_PDF_LABEL,
  MENU_DIGITAL_PNG_LABEL,
  MENU_LIGHT_HARDEN_SKU,
  isMenuLightHardenSku,
} from "@/config/studio-menu-light-harden-v1";

export const MENU_EXPORT_PREFIX = "menu-export" as const;

export function isMenuCustomerFileLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed === MENU_CUSTOMER_PRINT_PDF_LABEL ||
    trimmed === MENU_DIGITAL_PNG_LABEL ||
    trimmed === "Print-ready PDF" ||
    /digital png|print yourself|print-ready pdf/i.test(trimmed)
  );
}

export function menuClientDeliveryFileLabels(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (!isMenuLightHardenSku(skuId)) return [...labels];
  const files = labels.filter(isMenuCustomerFileLabel);
  if (files.length > 0) return files;
  return [MENU_DIGITAL_PNG_LABEL, MENU_CUSTOMER_PRINT_PDF_LABEL];
}

export {
  MENU_CUSTOMER_PRINT_PDF_LABEL,
  MENU_DIGITAL_PNG_LABEL,
  MENU_LIGHT_HARDEN_SKU,
};
