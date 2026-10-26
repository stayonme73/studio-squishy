/**
 * Flagship alignment for $349 Short-Form Video Editing.
 * Proves candidate Reel-style enhancements. Does not change public price.
 * Does not alter Clip Repurposing, Social Posts, or $149 stills.
 */

export const STUDIO_FLAGSHIP_SHORT_FORM_VIDEO_EDITING_MARKET_ALIGNMENT_PACKAGE_ID =
  "STUDIO-FLAGSHIP-SHORT-FORM-VIDEO-EDITING-MARKET-ALIGNMENT-1" as const;

export const FLAGSHIP_SHORT_FORM_SKU = "v2-rtu-short-form-video-edit" as const;

export const studioFlagshipShortFormVideoEditingMarketAlignmentV1 = {
  packageId:
    STUDIO_FLAGSHIP_SHORT_FORM_VIDEO_EDITING_MARKET_ALIGNMENT_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  skuId: FLAGSHIP_SHORT_FORM_SKU,
  publicPriceCentsUnchanged: 34900 as const,
  doNotChangePrice: true as const,
  doNotAlterClipRepurposing: true as const,
  doNotAlterSocialPosts: true as const,
  doNotRenameStillsShortVideo: true as const,
  doNotChangeMenuHierarchy: true as const,
  doNotChangePublicCatalogCopyFromThisStamp: true as const,
  ownerConsoleParked: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotStartClipFromThisStamp: true as const,

  music: {
    soldMethod: "eleven_music_instrumental_embedded_only" as const,
    fallbackForProofWhenKeyAbsent: "original_rights_safe_pad" as const,
    optionalWhenWorse: true as const,
    duckUnderSpeech: true as const,
    amixNormalize: false as const,
    targetBedMeanDb: -20 as const,
    noTrendingSongScrape: true as const,
    standaloneRedistributionForbidden: true as const,
  },

  broll: {
    customerSuppliedRightsCleared: true as const,
    studioStockLibrary: "pexels_approved_catalog" as const,
    studioStockSearch: "pinned_catalog_not_live_search" as const,
    noCustomFilming: true as const,
    noDecorativeInsert: true as const,
    mustSupportSpokenStory: true as const,
    followsCompleteSemanticThought: true as const,
    doNotTriggerOnlyOnKeyword: true as const,
    doNotRemoveBeforeThoughtFinishes: true as const,
    doNotLeaveIntoNextThought: true as const,
    noIdentifiablePeople: true as const,
    preferSpeakerConnection: true as const,
    treatments: ["picture_in_picture", "short_fullframe"] as const,
  },

  revision: {
    includedRounds: 1 as const,
    provenKinds: [
      "different_opening",
      "change_music",
      "remove_broll",
      "adjust_cta_hold",
      "caption_treatment",
    ] as const,
  },

  format: {
    width: 1080 as const,
    height: 1920 as const,
    file: "mp4" as const,
    customerPosts: true as const,
  },

  packDefinition:
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/SHORT-FORM-CONTENT-PACK-DEFINITION.md" as const,
  inputOutputContractRequired: true as const,
  publicCatalogSwitched: false as const,
  stampDoc:
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/STUDIO-FLAGSHIP-SHORT-FORM-VIDEO-EDITING-MARKET-ALIGNMENT.md" as const,
  proofJson:
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/proof.json" as const,
} as const;
