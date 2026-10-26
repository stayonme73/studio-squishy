/**
 * Prepared three-surface public switch. Not flipped.
 * Do not wire this into live catalog, checkout, or Help Center until Owner authorizes.
 * Do not publish the Clip price or an unfinished Clip I/O contract from this stamp.
 */

import { shortFormContentPackContractV1 } from "@/config/studio-short-form-content-pack-v1";

export const CLIP_REPURPOSING_BOUNDARY_SENTENCE =
  "If you want The Studio to search a longer recording and find the moments for you, that is Clip Repurposing." as const;

export const shortFormContentPackBoundaryCopyV1 = {
  customerMarkedSegmentMaxSeconds: 45 as const,
  surroundingReviewMaxSeconds: 240 as const,
  surroundingReviewMeansTotalWindow: true as const,
  doNotImplyFourMinutesBeforeAndAfter: true as const,
  pack349:
    "You point to each moment. Mark each clip, or mark a source segment of 45 seconds or less. The Studio may look around that mark, up to 4 minutes total surrounding your mark, only to make the edit clean. This is not long-form discovery.",
  clipBoundary: CLIP_REPURPOSING_BOUNDARY_SENTENCE,
  lookaroundIsNotCustomerClipLength:
    "The 4-minute allowance is Studio lookaround, up to 4 minutes total surrounding your mark. It is not permission to send unmarked four-minute clips.",
} as const;

export const LEARN_MORE_PURPOSE =
  "You point to each moment. Mark up to 3 clips, or mark each source segment at 45 seconds or less. The Studio may look around that mark, up to 4 minutes total surrounding your mark, only to make the edit clean, then delivers up to 3 polished 15–30 second shorts. If you want The Studio to search a longer recording and find the moments for you, that is Clip Repurposing.";

export const CHECKOUT_LEAD =
  "You point to each moment. Mark each clip, or mark a source segment of 45 seconds or less. The Studio may look around that mark, up to 4 minutes total surrounding your mark, only to make the edit clean. Do not send an unmarked long recording and ask The Studio to find the best moments. If you want The Studio to search a longer recording and find the moments for you, that is Clip Repurposing.";

export const HELP_CENTER_ANSWER =
  "On the Short-Form Content Pack, you point to the moment. Mark each clip, or mark a source segment of 45 seconds or less. The Studio may look around that mark, up to 4 minutes total surrounding your mark, only to make the edit clean. If you want The Studio to search a longer recording and find the moments for you, that is Clip Repurposing.";

export const HELP_CENTER_FOUR_MINUTE_ANSWER =
  "No. Each customer-marked segment stays capped at 45 seconds. The 4-minute allowance is Studio lookaround, up to 4 minutes total surrounding your mark, only to find a clean opening and a complete ending. It is not permission to hand The Studio four-minute clips and ask us to figure it out. If you want The Studio to search a longer recording and find the moments for you, that is Clip Repurposing.";

export const studioShortFormContentPackPublicSwitchV1 = {
  packageId: "STUDIO-349-SHORT-FORM-CONTENT-PACK-PUBLIC-SWITCH-1" as const,
  authorizedToFlip: true as const,
  publicCatalogSwitched: true as const,
  prepared: true as const,
  oneCoordinatedChange: true as const,
  doNotAdvertisePackOnOneSurfaceWhileAnotherStillDescribesOneVideo: true as const,
  doNotPublishClipPrice: true as const,
  doNotPublishUnresolvedClipIo: true as const,
  boundary: shortFormContentPackBoundaryCopyV1,
  surfaces: {
    productCardOrLearnMore: {
      name: shortFormContentPackContractV1.customerFacingName,
      priceCents: 34900,
      purpose: LEARN_MORE_PURPOSE,
      youProvide: shortFormContentPackContractV1.youProvide,
      studioDelivers: shortFormContentPackContractV1.studioDelivers,
      whatsIncluded: shortFormContentPackContractV1.whatsIncluded,
      whatsNotIncluded: shortFormContentPackContractV1.whatsNotIncluded,
      important: shortFormContentPackContractV1.important,
    },
    checkoutIntake: {
      heading: "Here is what you will need",
      lead: CHECKOUT_LEAD,
      youProvide: shortFormContentPackContractV1.youProvide,
      boundary: shortFormContentPackContractV1.important,
      confirmPointing:
        "I am pointing to each clip. I am not asking The Studio to search a long recording for the best moments.",
      confirmSegmentCap: "Each marked segment is 45 seconds or less.",
    },
    helpCenterFull: {
      title:
        "Short-Form Content Pack — what you provide and what The Studio delivers",
      differenceQuestion:
        "What is the difference between the Short-Form Content Pack and Clip Repurposing?",
      differenceAnswer: HELP_CENTER_ANSWER,
      fourMinuteQuestion: "Can I send a four-minute clip on the $349 pack?",
      fourMinuteAnswer: HELP_CENTER_FOUR_MINUTE_ANSWER,
      pack: shortFormContentPackContractV1,
    },
  },
  doNotStartClip: true as const,
  doNotChangeMenuHierarchy: true as const,
} as const;

export function publishedPackSurfaceText(): string {
  const learn = studioShortFormContentPackPublicSwitchV1.surfaces.productCardOrLearnMore;
  const checkout = studioShortFormContentPackPublicSwitchV1.surfaces.checkoutIntake;
  const help = studioShortFormContentPackPublicSwitchV1.surfaces.helpCenterFull;
  return [
    learn.purpose,
    ...learn.youProvide,
    ...learn.studioDelivers,
    ...learn.whatsIncluded,
    ...learn.whatsNotIncluded,
    learn.important,
    checkout.heading,
    checkout.lead,
    ...checkout.youProvide,
    checkout.boundary,
    checkout.confirmPointing,
    checkout.confirmSegmentCap,
    help.title,
    help.differenceQuestion,
    help.differenceAnswer,
    help.fourMinuteQuestion,
    help.fourMinuteAnswer,
    ...help.pack.youProvide,
    ...help.pack.studioDelivers,
    ...help.pack.whatsIncluded,
    ...help.pack.whatsNotIncluded,
    help.pack.important ?? "",
  ].join("\n");
}
