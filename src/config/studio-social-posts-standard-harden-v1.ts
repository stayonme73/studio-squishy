/**
 * HARDEN #6 — SOCIAL POSTS (STANDARD)
 *
 * STANDARD names hardening effort, not permission to lower quality.
 * Four plates + captions stay one set. Owner does not finish the posts.
 *
 * Authority: Tagia 2026-09-24 AUTHORIZE HARDEN #6 — SOCIAL POSTS STANDARD
 */

import { studioGeneralDesignRuntimeV1 } from "./studio-general-design-runtime-v1";

export const STUDIO_SOCIAL_POSTS_STANDARD_HARDEN_PACKAGE_ID =
  "STUDIO-OPERATING-SOCIAL-POSTS-STANDARD-HARDEN-1" as const;

export const SOCIAL_POSTS_STANDARD_HARDEN_SKU = "v2-rtu-social-posts" as const;

export const SOCIAL_POSTS_CAPTIONS_LABEL =
  "Caption file for all four posts (plain text)" as const;

export const SOCIAL_POSTS_ORDER_LABEL =
  "Suggested posting order (not a calendar) — you post them" as const;

export const SOCIAL_POSTS_HONEST_PROMISED_OUTPUT =
  "Four coordinated square static posts (1024×1024) for one theme and one platform, plus one caption per post and a suggested posting order. You post them. Not a carousel, Stories, Reels, portrait, extra sizes, or Studio posting." as const;

export const studioSocialPostsStandardHardenV1 = {
  packageId: STUDIO_SOCIAL_POSTS_STANDARD_HARDEN_PACKAGE_ID,
  schemaVersion: 1 as const,
  authorizedAt: "2026-09-24" as const,
  owner: "Tagia",
  skuId: SOCIAL_POSTS_STANDARD_HARDEN_SKU,
  hardenClass: "STANDARD" as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  classification: "SELL_NOW" as const,
  frozenAt: "2026-09-24" as const,
  frozen: true as const,
  doNotReopenFlyer: true as const,
  doNotReopenCopyKits: true as const,
  doNotReopenServiceSheet: true as const,
  doNotReopenCampaignGraphics: true as const,
  doNotReopenMenu: true as const,
  doNotTouchBusinessCard: true as const,
  doNotTouchShortVideo: true as const,
  doNotRemintMaya: true as const,
  doNotPadExtraFormats: true as const,
  ownerRescueIsNotTheCompletionPath: true as const,
  ownerConsoleParked: true as const,

  qualityLock: {
    standardMeansHardeningEffortNotLowerQuality: true as const,
    reduceScopeBeforeReducingQuality: true as const,
    allFourMustMeetStudioStandardIndividuallyAndAsASet: true as const,
    captionsPreserveCustomerFacts: true as const,
    captionsMustNotInventBusinessFacts: true as const,
    requiredCustomerStandard: [
      "layout",
      "hierarchy",
      "readability",
      "spacing",
      "accurate customer facts",
      "coordinated set",
      "clean files",
      "professional presentation",
    ] as const,
  },

  captionFactLock: {
    preserveCustomerFacts: true as const,
    doNotInventClaimsOffersDatesPricesTestimonialsResultsGuarantees: true as const,
    captionsBoundToSameApprovedBrief: true as const,
    deterministicFromCampaignTruth: true as const,
    notASecondCopyAgency: true as const,
  },

  offer: {
    customerFacingName: "Make My Social Media Posts",
    priceCents: 9900,
    promisedOutput: SOCIAL_POSTS_HONEST_PROMISED_OUTPUT,
    exactAssetCount: 4 as const,
    plate: { widthPx: 1024, heightPx: 1024 } as const,
    files: ["png", "txt"] as const,
    captionsRequired: true as const,
    postingOrderRequired: true as const,
    oneCampaignTheme: true as const,
    oneAgreedPlatform: true as const,
    customerPosts: true as const,
    studioDoesNotPost: true as const,
    includedRevisions: 1 as const,
    oneSetRevisionNotFourRedesigns: true as const,
    wholeSetVersionsTogether: true as const,
    setIncompleteUnlessAllPass: true as const,
    carousel: false as const,
    stories: false as const,
    portraitVersions: false as const,
    reels: false as const,
    video: false as const,
    extraPlatformSizes: false as const,
    failClosedDisposition: "refund_or_cannot_deliver" as const,
  },

  economics: {
    targetPriceHoldsAtThisScope: true as const,
    perAssetCents: 2475,
    typeLedToolCostAssumedCents: 0,
    doNotRaisePrice: true as const,
    doNotLeaveHardenNext: true as const,
    note:
      "$99 holds because one existing four-post renderer already writes the set, fact-bound captions, and posting order. STANDARD work is fail-closed + honest square catalog + Final Delivery pin + one set revision. A second copy factory or extra formats would break the ticket.",
  },

  piggyback: {
    businessCard: false as const,
    shortVideo: false as const,
    reason:
      "Neither shares this four-square campaign-set renderer. Dropped. No hitchhikers.",
  },

  ceilings: {
    productionTime: "within 3–5 business days" as const,
    internalQaAttempts: studioGeneralDesignRuntimeV1.maxInternalProductionAttempts,
    includedCustomerRevisions: 1 as const,
    toolCostWarningCents: 1485,
    toolCostFailCents: 2970,
  },
} as const;

export function isSocialPostsStandardHardenSku(
  skuId: string | null | undefined,
): boolean {
  return skuId === SOCIAL_POSTS_STANDARD_HARDEN_SKU;
}
