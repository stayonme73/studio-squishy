/**
 * Social & Promo composite branch render hold — per-project release on campaign record.
 * Machine-cert disposable campaigns keep the hold until an explicit owner stamp script runs.
 * Paying customers on the current door auto-release after confirmed payment + submitted intake.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID } from "@/config/studio-social-promo-current-door-contract-v1";
import {
  isDisposableSocialPromoCertCampaignId,
  parseSocialPromoCertIsolation,
} from "@/lib/studio-payment/disposable-social-promo-cert-isolation";

export const SOCIAL_PROMO_AUTOMATIC_RENDER_RELEASE_REASON =
  "Confirmed payment and submitted Project Intake — automatic Social & Promo composite render authorization (current door).";

/** True when composite branches must stay on {@link SOCIAL_PROMO_COMPOSITE_RENDER_HOLD}. */
export function socialPromoCompositeRenderStillHeld(campaign: CampaignRecord): boolean {
  if (campaign.socialPromoRenderRelease) return false;
  if (campaign.condensedOffer?.packageId !== SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID) {
    return false;
  }
  if (!isDisposableSocialPromoCertCampaignId(campaign.campaignId)) {
    return false;
  }
  const parsed = parseSocialPromoCertIsolation(campaign);
  return parsed.kind !== "none";
}

/**
 * Stamp {@link CampaignRecord.socialPromoRenderRelease} when the standard customer
 * path satisfies payment + intake. Does not bypass machine-cert owner stamps.
 */
export function ensureSocialPromoCompositeRenderRelease(
  campaign: CampaignRecord,
): CampaignRecord {
  if (campaign.socialPromoRenderRelease) return campaign;
  if (campaign.condensedOffer?.packageId !== SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID) {
    return campaign;
  }
  if (campaign.paymentTruth?.status !== "confirmed") return campaign;
  if (!campaign.routeMapIntakeSubmittedAt?.trim()) return campaign;

  if (isDisposableSocialPromoCertCampaignId(campaign.campaignId)) {
    const parsed = parseSocialPromoCertIsolation(campaign);
    if (parsed.kind !== "none") return campaign;
  }

  const releasedAt = new Date().toISOString();
  return {
    ...campaign,
    socialPromoRenderRelease: {
      releasedAt,
      authorizedBy: "owner",
      reason: SOCIAL_PROMO_AUTOMATIC_RENDER_RELEASE_REASON,
    },
    updatedAt: releasedAt,
  };
}
