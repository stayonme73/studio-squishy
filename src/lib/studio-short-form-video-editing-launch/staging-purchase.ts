/**
 * Hidden staging purchase path for $349 Short-Form Video Editing.
 * Not a public Launch Now shelf entry. Not Clip Repurposing.
 */

import { getServiceById } from "@/catalog/accessors";
import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import {
  allowInternalStagingCheckout,
  studioShortFormVideoEditingLaunchIntegrationV1,
} from "@/config/studio-short-form-video-editing-launch-integration-v1";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";

export type FootageEditingStagingOffer = {
  skuId: typeof SHORT_FORM_VIDEO_EDITING_SKU;
  customerFacingName: string;
  priceCents: number;
  publicMenuPublished: boolean;
  onLaunchNowShelf: boolean;
  checkoutAllowed: boolean;
  promise: string;
};

export function getFootageEditingStagingOffer(): FootageEditingStagingOffer {
  const service = getServiceById(SHORT_FORM_VIDEO_EDITING_SKU);
  return {
    skuId: SHORT_FORM_VIDEO_EDITING_SKU,
    customerFacingName:
      service?.name ?? studioShortFormVideoEditingLaunchIntegrationV1.customerFacingName,
    priceCents:
      service?.priceCents ?? studioShortFormVideoEditingLaunchIntegrationV1.priceCents,
    publicMenuPublished:
      studioShortFormVideoEditingLaunchIntegrationV1.publicMenuPublished,
    onLaunchNowShelf: studioShortFormVideoEditingLaunchIntegrationV1.onLaunchMenu,
    checkoutAllowed: allowInternalStagingCheckout(SHORT_FORM_VIDEO_EDITING_SKU),
    promise: studioShortFormVideoEditingLaunchIntegrationV1.promise,
  };
}

export function buildFootageEditingStagingCampaign(input: {
  campaignId: string;
  ctaText?: string;
  videoPurpose?: string;
}): CampaignRecord {
  if (!allowInternalStagingCheckout(SHORT_FORM_VIDEO_EDITING_SKU)) {
    throw new Error("Staging checkout for this SKU is not allowed.");
  }
  const now = new Date().toISOString();
  const selected = [SHORT_FORM_VIDEO_EDITING_SKU] as const;
  const totals = computePlanPricingTotals([...selected]);
  const offer = getFootageEditingStagingOffer();
  return {
    campaignId: input.campaignId,
    campaignName: "Staging Short-Form Video Editing",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: offer.promise,
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: offer.priceCents,
      confirmedAmountCents: offer.priceCents,
      checkoutSessionId: `cs_staging_${input.campaignId}`,
      selectedServiceIds: [...selected],
      decisionId: `dec_staging_${input.campaignId}`,
      factFingerprint: `fp_staging_${input.campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    approvedStudioPlan: {
      selectedServiceIds: [...selected],
      includedServiceIds: [...selected],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([...selected]),
      approvedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:videoPurpose`]:
          input.videoPurpose ?? "Help customers understand why a finished page feels trustworthy.",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:talkingHeadConfirm`]:
          "Yes — one native-vertical English talking-head I own or have permission to use",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:rightsAcknowledgement`]:
          "I own this recording, or I have permission from everyone who appears in it",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:ctaText`]:
          input.ctaText ?? "Book at riverandreed.example",
        [`${SHORT_FORM_VIDEO_EDITING_SKU}:sourceMaterials`]:
          "talking-head.mp4. I own this recording.",
      },
    },
  };
}
