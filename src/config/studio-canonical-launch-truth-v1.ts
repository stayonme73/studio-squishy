/**
 * Canonical launch truth — the single current authority for the customer-facing
 * launch menu, launch prices, publish state, and certification / freeze state.
 *
 * Owner ruling: Tagia, 2026-10-10.
 * Record: docs/launch/studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md
 *
 * Leaf record: imports nothing. Other records may point here; they must not
 * independently contradict it. Prices must equal the owner price lock in
 * `studio-three-package-revision-truth-v1.ts` (checked by test).
 *
 * Records only. This file does not change product behavior.
 */

export const STUDIO_CANONICAL_LAUNCH_TRUTH_ID = "STUDIO-CANONICAL-LAUNCH-TRUTH-1" as const;

export const studioCanonicalLaunchTruthV1 = {
  id: STUDIO_CANONICAL_LAUNCH_TRUTH_ID,
  ruledBy: "Tagia (owner)" as const,
  ruledAt: "2026-10-10" as const,
  record: "docs/launch/studio-canonical-launch-truth-1/STUDIO-CANONICAL-LAUNCH-TRUTH.md" as const,

  canonicalCustomerFacingMenu: "three_package_door" as const,
  customerFacingLaunchPackageCount: 3 as const,
  deployedPublicly: false as const,
  publicationAuthorized: false as const,
  thankYouDiscountPercent: 20 as const,

  packages: [
    {
      packageId: "clip_repurposing" as const,
      customerFacingName: "Clip Repurposing" as const,
      factorySku: "v2-rtu-clip-repurposing" as const,
      listPriceCents: 39900 as const,
      priceDisplay: "$399" as const,
      amountDueAfterThankYouCents: 31920 as const,
      revisionRounds: 3 as const,
      launchPublishState: "UNPUBLISHED" as const,
      certificationState: "END_TO_END_PROVEN_IN_STRIPE_TEST_MODE_WITH_EXPLICIT_LIMITS" as const,
      freezeState: "OWNER_FROZEN_2026-10-09_WITH_EXPLICIT_LIMITS" as const,
      provenProject: "route-proof-clip-1791580066573" as const,
      record: "docs/launch/studio-canonical-launch-truth-1/THREE-PACKAGE-CLIP-REPURPOSING-399-RECORD.md" as const,
    },
    {
      packageId: "short_form_video_editing" as const,
      customerFacingName: "Short-Form Video Editing" as const,
      factorySku: "v2-rtu-short-form-video-edit" as const,
      listPriceCents: 24900 as const,
      priceDisplay: "$249" as const,
      amountDueAfterThankYouCents: 19920 as const,
      revisionRounds: 3 as const,
      launchPublishState: "UNPUBLISHED" as const,
      certificationState: "END_TO_END_PROVEN_IN_STRIPE_TEST_MODE_WITH_EXPLICIT_LIMITS" as const,
      freezeState: "OWNER_FROZEN_2026-10-09_WITH_EXPLICIT_LIMITS" as const,
      provenProject: "route-proof-short-form-1791594132912" as const,
      record: "docs/launch/studio-canonical-launch-truth-1/THREE-PACKAGE-SHORT-FORM-VIDEO-EDITING-249-RECORD.md" as const,
    },
    {
      packageId: "social_and_promo_graphics" as const,
      customerFacingName: "Social & Promo Graphics" as const,
      factorySku: null,
      listPriceCents: 19900 as const,
      priceDisplay: "$199" as const,
      amountDueAfterThankYouCents: 15920 as const,
      revisionRounds: 3 as const,
      launchPublishState: "UNPUBLISHED" as const,
      certificationState: "CERTIFIED_AND_FROZEN_WITH_EXPLICIT_LIMITS" as const,
      freezeState: "OWNER_FROZEN_2026-10-10_WITH_EXPLICIT_LIMITS" as const,
      provenProject: "route-proof-social-promo-1791620985041" as const,
      record: "docs/launch/studio-social-promo-signed-in-delivery-proof-1/STUDIO-SOCIAL-PROMO-GRAPHICS-CERTIFICATION-FREEZE.md" as const,
    },
  ],

  /** The old Launch Now shelf. History and internal reference only. */
  legacyElevenServiceShelf: {
    role: "HISTORICAL_INTERNAL_REFERENCE" as const,
    customerFacingLaunchAuthority: false as const,
    mayDrivePublicLaunchMenu: false as const,
    mayDriveCustomerCheckout: false as const,
    mayOverrideLaunchPrices: false as const,
    mayBeQuotedByStudioVoice: false as const,
    mayCreateSecondPurchasePath: false as const,
  },

  /** Runtime gates: src/lib/studio-canonical-menu-enforcement/enforcement.ts. */
  menuEnforcement: {
    enforcedAt: "2026-10-10" as const,
    studioVoiceQuotesOnlyCanonicalPackages: true as const,
    newCustomerCheckoutPurchaseKind: "condensed_offer" as const,
    legacyCheckoutPurchaseKindsRefused: ["studio_plan", "paid_cycle"] as const,
    conversationRoomOldShelfStepsLeadTo: "/" as const,
    ownerClassification: "PASS_WITH_EXPLICIT_DURABILITY_LIMIT" as const,
    classifiedAt: "2026-10-10" as const,
  },

  knownCodeGapsAgainstThisTruth: [],

  /**
   * Owner decision 2026-10-10: accepted, not resolved. These Final Delivery
   * integration files stay in the working tree because they belong to older
   * uncommitted closed-package architecture and cannot be committed without
   * absorbing unrelated dependency chains.
   */
  durabilityLimits: [
    {
      id: "FINAL-DELIVERY-PATHWAY-INTEGRATION-UNCOMMITTED",
      uncommittedIntegrationFiles: [
        "src/lib/studio-final-delivery-room/content.ts",
        "src/lib/studio-clip-repurposing-live-delivery/resolve.ts",
        "src/lib/studio-final-delivery-room/final-delivery-room.test.ts",
        "src/app/final-delivery-room/page.tsx",
      ],
      committedBuilder: "src/lib/studio-canonical-menu-enforcement/final-delivery-pathway.ts",
      evidenceLimit:
        "The signed-in live Clip Final Delivery pathway was verified by shared-code tests, not by a fresh browser session, because no suitable signed-in delivered Clip browser session was available.",
      resolved: false,
      launchRehearsalGate: {
        requiredBefore: "Launch / No-Launch certification",
        failureMeans: "LAUNCH_STOPS",
        checks: [
          "content.ts still uses the canonical Final Delivery pathway builder.",
          "resolve.ts still uses the same canonical builder.",
          "/final-delivery-room contains no historical service list or historical pricing presented as current.",
          "The Final Delivery pathway tests pass.",
          "The signed-in live Clip Final Delivery pathway is exercised in a real browser session.",
          "Phone and laptop customer views contain no old-shelf services and no $549 or $349 current pricing.",
        ],
      },
    },
  ],

  supersededHistoricalRecords: [
    "docs/launch/studio-operating-short-form-video-editing-build-1/STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-CERTIFICATION-FREEZE.md",
    "docs/launch/studio-operating-short-form-video-editing-public-publish-1/STUDIO-OPERATING-SHORT-FORM-VIDEO-EDITING-PUBLIC-PUBLISH.md",
    "docs/launch/studio-operating-clip-repurposing-build-1/STUDIO-OPERATING-CLIP-REPURPOSING-CERTIFICATION-FREEZE.md",
    "docs/launch/studio-operating-clip-repurposing-price-correction-1/STUDIO-OPERATING-CLIP-REPURPOSING-PRICE-CORRECTION.md",
    "docs/launch/studio-operating-clip-repurposing-public-publish-1/STUDIO-OPERATING-CLIP-REPURPOSING-PUBLIC-PUBLISH.md",
    "docs/launch/studio-operating-public-shelf-honesty-1/STUDIO-OPERATING-PUBLIC-SHELF-HONESTY.md",
    "docs/launch/studio-operating-menu-readiness-and-demand-freeze-1/STUDIO-OPERATING-MENU-READINESS-AND-DEMAND-FREEZE.md",
    "src/config/studio-internal-sell-now-register-v1.ts",
    "src/config/studio-public-shelf-honesty-v1.ts",
    "src/config/studio-menu-readiness-and-demand-freeze-v1.ts",
    "src/config/studio-short-form-video-editing-public-publish-v1.ts",
    "src/config/studio-clip-repurposing-public-publish-v1.ts",
    "src/config/studio-clip-repurposing-price-correction-v1.ts",
  ],

  shortFormEvidenceQuarantine:
    "docs/launch/studio-operating-short-form-video-editing-build-1/STUDIO-OPERATING-SHORT-FORM-EVIDENCE-QUARANTINE-2026-10-10.md" as const,
} as const;
