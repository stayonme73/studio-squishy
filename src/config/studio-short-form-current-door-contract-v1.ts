/**
 * Authoritative fulfillment contract for the current Short-Form Video Editing door.
 * The historical $349 Short-Form Content Pack stays on its own shelf and is not
 * customer-facing copy for this package.
 */

import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";
import { studioThankYouAmount } from "@/config/studio-thank-you-discount-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";

const DOOR = STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packages.short_form_video_editing;
const THANK_YOU = studioThankYouAmount(DOOR.priceCents);

export const studioShortFormCurrentDoorContractV1 = {
  packageId: "short_form_video_editing" as const,
  skuId: SHORT_FORM_VIDEO_EDITING_SKU,
  customerFacingName: DOOR.name,
  listPriceCents: DOOR.priceCents,
  priceDisplay: DOOR.priceDisplay,
  thankYouDiscountCents: THANK_YOU.discountCents,
  amountDueCents: THANK_YOU.amountDueCents,
  revisionRounds: DOOR.revisionRounds,
  sourceMin: 1 as const,
  sourceMax: 3 as const,
  sourceMaxSeconds: 45 as const,
  outputMinSeconds: 15 as const,
  outputMaxSeconds: 30 as const,
  width: 1080 as const,
  height: 1920 as const,
  ctaOptional: true as const,
  blankCtaMeans: "none" as const,
  doNotInventCta: true as const,
  preserveSuppliedCta: true as const,
  mustKeepOptional: true as const,
  doNotInventVideosToReachThree: true as const,
  videoTool: "footage_editing_pipeline" as const,
  coverTool: "paintPackCover" as const,
  postCaptionTool: "writePackPostCaption" as const,
  postingGuideTool: "writePackUseGuide" as const,
  coverEyebrow: DOOR.name,
  postingGuideTitle: "How to use these Short-Form Video Editing files" as const,
  completionLanguage:
    "Videos, covers, captions, and the use guide arrive together. You post them. Three revision rounds are included." as const,
} as const;

/** Historical factory values. Not used in current-door customer messaging. */
export const studioShortFormObsoleteContractIsolatedV1 = {
  customerFacingName: "Short-Form Content Pack" as const,
  listPriceCents: 34900 as const,
  sourceCount: 1 as const,
  revisionRounds: 1 as const,
  ctaRequired: true as const,
  sourceMaxSeconds: 180 as const,
  surroundingReviewMaxSeconds: 240 as const,
  notUsedForCurrentDoorCustomerMessaging: true as const,
} as const;

export function currentDoorCustomerFacingText(): string {
  const contract = studioShortFormCurrentDoorContractV1;
  return [
    contract.customerFacingName,
    contract.priceDisplay,
    contract.completionLanguage,
    contract.postingGuideTitle,
    contract.coverEyebrow,
    `${contract.revisionRounds} revision rounds`,
    `Up to ${contract.sourceMax} polished vertical videos`,
    "Matching captions",
    "Cover and title graphics",
    "A simple posting guide",
    "Call-to-action wording, if you have one",
  ].join(" ");
}
