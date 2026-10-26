/**
 * Hidden staging purchase path for unpublished $549 Clip Repurposing.
 * Not a public Launch Now shelf entry.
 */

import { getServiceById } from "@/catalog/accessors";
import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  allowClipRepurposingStagingCheckout,
  studioClipRepurposingLaunchIntegrationV1,
} from "@/config/studio-clip-repurposing-launch-integration-v1";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";

export type ClipRepurposingStagingOffer = {
  skuId: typeof CLIP_REPURPOSING_SKU;
  customerFacingName: string;
  priceCents: number;
  publicMenuPublished: boolean;
  onLaunchNowShelf: boolean;
  checkoutAllowed: boolean;
  promise: string;
};

export function getClipRepurposingStagingOffer(): ClipRepurposingStagingOffer {
  const service = getServiceById(CLIP_REPURPOSING_SKU);
  return {
    skuId: CLIP_REPURPOSING_SKU,
    customerFacingName:
      service?.name ?? studioClipRepurposingLaunchIntegrationV1.customerFacingName,
    priceCents:
      service?.priceCents ?? studioClipRepurposingLaunchIntegrationV1.priceCents,
    publicMenuPublished:
      studioClipRepurposingLaunchIntegrationV1.publicMenuPublished,
    onLaunchNowShelf: studioClipRepurposingLaunchIntegrationV1.onLaunchMenu,
    checkoutAllowed: allowClipRepurposingStagingCheckout(CLIP_REPURPOSING_SKU),
    promise: studioClipRepurposingLaunchIntegrationV1.promise,
  };
}

export function buildClipRepurposingStagingCampaign(input: {
  campaignId: string;
  ctaText?: string;
  videoPurpose?: string;
}): CampaignRecord {
  if (!allowClipRepurposingStagingCheckout(CLIP_REPURPOSING_SKU)) {
    throw new Error("Staging checkout for this SKU is not allowed.");
  }
  const now = new Date().toISOString();
  const selected = [CLIP_REPURPOSING_SKU] as const;
  const totals = computePlanPricingTotals([...selected]);
  const offer = getClipRepurposingStagingOffer();
  return {
    campaignId: input.campaignId,
    campaignName: "Staging Clip Repurposing",
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
    routeMapContext: {
      roadId: "i20",
      jobId: CLIP_REPURPOSING_SKU,
      selectedServiceIds: [...selected],
      currentStep: "intake",
      selectedAt: now,
    },
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${CLIP_REPURPOSING_SKU}:videoPurpose`]:
          input.videoPurpose ??
          "Help customers hear three distinct ideas from one workshop recording.",
        [`${CLIP_REPURPOSING_SKU}:talkingHeadConfirm`]:
          "Yes — one 15–60 minute native-vertical English talking-head I own or have permission to use",
        [`${CLIP_REPURPOSING_SKU}:rightsAcknowledgement`]:
          "I own this recording, or I have permission from everyone who appears in it",
        [`${CLIP_REPURPOSING_SKU}:ctaText`]:
          input.ctaText ?? "Book at riverandreed.example",
        [`${CLIP_REPURPOSING_SKU}:sourceMaterials`]:
          "workshop-talking-head.mp4. I own this recording.",
      },
    },
  };
}
