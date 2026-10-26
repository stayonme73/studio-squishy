/**
 * Business Card — purchase → Review → Final Delivery truth.
 */

import {
  BUSINESS_CARD_BACK_PNG_LABEL,
  BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
  BUSINESS_CARD_FRONT_PNG_LABEL,
  BUSINESS_CARD_LIGHT_HARDEN_SKU,
  isBusinessCardLightHardenSku,
} from "@/config/studio-business-card-light-harden-v1";

export const BUSINESS_CARD_EXPORT_PREFIX = "card-export" as const;

export function isBusinessCardCustomerFileLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed === BUSINESS_CARD_FRONT_PNG_LABEL ||
    trimmed === BUSINESS_CARD_BACK_PNG_LABEL ||
    trimmed === BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL ||
    /front — digital png|back — digital png|print yourself|1536/i.test(trimmed)
  );
}

export function businessCardClientDeliveryFileLabels(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (!isBusinessCardLightHardenSku(skuId)) return [...labels];
  const files = labels.filter(isBusinessCardCustomerFileLabel);
  if (files.length > 0) return files;
  return [
    BUSINESS_CARD_FRONT_PNG_LABEL,
    BUSINESS_CARD_BACK_PNG_LABEL,
    BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
  ];
}

export {
  BUSINESS_CARD_BACK_PNG_LABEL,
  BUSINESS_CARD_CUSTOMER_PRINT_PDF_LABEL,
  BUSINESS_CARD_FRONT_PNG_LABEL,
  BUSINESS_CARD_LIGHT_HARDEN_SKU,
};
