/**
 * Campaign Graphics — purchase → Review → Final Delivery truth.
 */

import {
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL,
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL,
  CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
  isCampaignGraphicsLightHardenSku,
} from "@/config/studio-campaign-graphics-light-harden-v1";

export const CAMPAIGN_GRAPHICS_EXPORT_PREFIX = "campaign-export" as const;

export function isCampaignGraphicsDeliveryLabel(label: string): boolean {
  const trimmed = label.trim();
  return (
    trimmed === CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL ||
    trimmed === CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL ||
    /digital png|post or share|campaign graphic/i.test(trimmed)
  );
}

export function campaignGraphicsClientDeliveryFileLabels(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (!isCampaignGraphicsLightHardenSku(skuId)) return [...labels];
  const files = labels.filter(isCampaignGraphicsDeliveryLabel);
  if (files.length > 0) return files;
  return [CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL, CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL];
}

export {
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_A_LABEL,
  CAMPAIGN_GRAPHICS_DIGITAL_PNG_B_LABEL,
  CAMPAIGN_GRAPHICS_LIGHT_HARDEN_SKU,
};
