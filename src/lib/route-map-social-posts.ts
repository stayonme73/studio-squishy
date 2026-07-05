/**
 * Shared Route Map Social Posts RTU constants — used by Studio Board panels.
 */

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";

export const SOCIAL_POSTS_JOB_ID = "v2-rtu-social-posts" as ServiceId;
export const SOCIAL_POSTS_LABEL = "Social Posts";
export const SOCIAL_POSTS_TOTAL = 4;

export function isSocialPostsCampaign(campaign: CampaignRecord): boolean {
  if (campaign.routeMapContext?.jobId === SOCIAL_POSTS_JOB_ID) return true;
  return Boolean(
    campaign.approvedStudioPlan?.lineItems.some(
      (lineItem) => (lineItem.skuId ?? lineItem.serviceId) === SOCIAL_POSTS_JOB_ID,
    ),
  );
}

export function resolveSocialPostsDeliveredCount(campaign: CampaignRecord): number {
  const delivered = campaign.deliverablesDelivered as Record<string, number> | undefined;
  return Math.min(SOCIAL_POSTS_TOTAL, Math.max(0, delivered?.[SOCIAL_POSTS_JOB_ID] ?? 0));
}
