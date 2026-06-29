import type { ServiceFamilyId } from "@/catalog/types";

import type { ProductionTaskFamilyId } from "./types";

const CATALOG_TO_PRODUCTION_FAMILY: Record<ServiceFamilyId, ProductionTaskFamilyId> = {
  brand_identity: "brand_identity_messaging",
  brand_messaging: "brand_identity_messaging",
  campaign: "campaign_launch_monthly",
  social_media: "social",
  email_marketing: "copy_channels",
  sms_marketing: "copy_channels",
  marketing_copywriting: "copy_channels",
  content_writing: "copy_channels",
  marketing_video: "video_audio",
  ai_voice_over: "video_audio",
  landing_page_content: "landing_page",
  marketing_optimization: "optimization",
  marketing_assets: "marketing_assets",
};

/** Families whose tasks require approved campaign direction before starting. */
export const DIRECTION_GATED_FAMILIES = new Set<ProductionTaskFamilyId>([
  "campaign_launch_monthly",
  "social",
  "video_audio",
  "marketing_assets",
  "landing_page",
]);

export function resolveProductionFamilyId(
  catalogFamilyId: ServiceFamilyId,
): ProductionTaskFamilyId {
  return CATALOG_TO_PRODUCTION_FAMILY[catalogFamilyId];
}
