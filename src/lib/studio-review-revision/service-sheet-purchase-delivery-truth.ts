/**
 * Service Sheet — purchase → Review → Final Delivery truth.
 */

import {
  SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL,
  SERVICE_SHEET_DIGITAL_PNG_LABEL,
  SERVICE_SHEET_LIGHT_HARDEN_SKU,
  isServiceSheetLightHardenSku,
} from "@/config/studio-service-sheet-light-harden-v1";

export const SERVICE_SHEET_EXPORT_PREFIX = "sheet-export" as const;

export function isServiceSheetPasteReadyLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed === SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL ||
    trimmed === SERVICE_SHEET_DIGITAL_PNG_LABEL ||
    trimmed === "Print-ready PDF" ||
    /digital png|print yourself|print-ready pdf/i.test(trimmed)
  );
}

export function serviceSheetClientDeliveryFileLabels(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (!isServiceSheetLightHardenSku(skuId)) return [...labels];
  const files = labels.filter(isServiceSheetPasteReadyLabel);
  if (files.length > 0) return files;
  return [SERVICE_SHEET_DIGITAL_PNG_LABEL, SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL];
}

export { SERVICE_SHEET_CUSTOMER_PRINT_PDF_LABEL, SERVICE_SHEET_DIGITAL_PNG_LABEL, SERVICE_SHEET_LIGHT_HARDEN_SKU };
