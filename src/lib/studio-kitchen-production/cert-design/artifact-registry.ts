import type {
  DesignArtifactRef,
  DesignQualityBrief,
  DesignQualityJudgmentAttestations,
  DesignQualitySubmission,
} from "../design-quality";
import { designFixtureA, designFixtureB, type CertDesignTestedSku } from "./fixtures";
import { harborOakIdentityLock, saltCedarIdentityLock } from "./identity-locks";

export const CERT_DESIGN_ARTIFACT_ROOT =
  "docs/launch/kitchen-production-cert-design-1/artifacts" as const;

const PORTRAIT = { widthPx: 1024, heightPx: 1536 } as const;
const SQUARE = { widthPx: 1024, heightPx: 1024 } as const;
const CARD_LANDSCAPE = { widthPx: 1536, heightPx: 1024 } as const;

const HARBOR_LOGO = harborOakIdentityLock.approvedLogoVariantIds[0];
const SALT_LOGO = saltCedarIdentityLock.approvedLogoVariantIds[0];

function harborBrandBrief() {
  return {
    brandIdentity: {
      businessName: harborOakIdentityLock.businessName,
      requiredWordmark: harborOakIdentityLock.requiredWordmark,
      approvedDescriptors: [...harborOakIdentityLock.approvedDescriptors],
      prohibitedDescriptors: [...harborOakIdentityLock.prohibitedDescriptors],
      approvedLogoVariantIds: [...harborOakIdentityLock.approvedLogoVariantIds],
    },
    campaignTruth: {
      offerName: harborOakIdentityLock.campaign.offerName,
      offerNameRequiredTokens: [...harborOakIdentityLock.campaign.offerNameRequiredTokens],
      priceToken: harborOakIdentityLock.campaign.priceToken,
      dateTokens: [...harborOakIdentityLock.campaign.dateTokens],
      phone: harborOakIdentityLock.campaign.phone,
      urlTokens: [...harborOakIdentityLock.campaign.urlTokens],
      prohibitedOfferAliases: [...harborOakIdentityLock.campaign.prohibitedOfferAliases],
    },
    contactSemantics: harborOakIdentityLock.contactSemantics.map((c) => ({ ...c })),
  };
}

function saltBrandBrief() {
  return {
    brandIdentity: {
      businessName: saltCedarIdentityLock.businessName,
      requiredWordmark: saltCedarIdentityLock.requiredWordmark,
      approvedDescriptors: [...saltCedarIdentityLock.approvedDescriptors],
      prohibitedDescriptors: [...saltCedarIdentityLock.prohibitedDescriptors],
      approvedLogoVariantIds: [...saltCedarIdentityLock.approvedLogoVariantIds],
    },
    campaignTruth: {
      offerName: saltCedarIdentityLock.campaign.offerName,
      offerNameRequiredTokens: [...saltCedarIdentityLock.campaign.offerNameRequiredTokens],
      priceToken: saltCedarIdentityLock.campaign.priceToken,
      dateTokens: [...saltCedarIdentityLock.campaign.dateTokens],
      phone: saltCedarIdentityLock.campaign.phone,
      urlTokens: [...saltCedarIdentityLock.campaign.urlTokens],
      prohibitedOfferAliases: [...saltCedarIdentityLock.campaign.prohibitedOfferAliases],
      bundleInclusionsExact: [...saltCedarIdentityLock.campaign.bundleInclusionsExact],
    },
    contactSemantics: saltCedarIdentityLock.contactSemantics.map((c) => ({ ...c })),
    prohibitedImageryThemes: ["home_goods", "candle", "soap"],
  };
}

/** Forced fail — Fixture A flyer v1 (substantive visual/content defects). Preserved. */
export const flyerAFailArtifact: DesignArtifactRef = {
  id: "flyer-a-v1-fail",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/flyer-v1-fail.png`,
  version: "v1_fail",
  ...PORTRAIT,
  extension: "png",
  contentSha256: "82d067f9a1b512d9c16f3ff053dedbef7329365cd25d24401c93fa3430b4ed89",
  approvedIdentitySourceId: "unauthorized-neon-junk",
  declaredText:
    "HOME COMFORT SYNERGY UNLOCKED!!! Best in Richmond #1 rated — cut your energy bills in half. Same-day everywhere. Tiny buried note somewhere.",
  declaredLogoVariantId: "unauthorized-neon-junk",
  declaredImageryTheme: "hype_clutter",
};

/**
 * Final flyer for certification.
 * Priors retained: flyer-v2-final.png (identity drift), flyer-v3-corrected.png (reversed contact icons).
 */
export const flyerAFinalArtifact: DesignArtifactRef = {
  id: "flyer-a-v4-corrected",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/flyer-v4-corrected.png`,
  version: "v4_corrected",
  ...PORTRAIT,
  extension: "png",
  contentSha256: "fb683221b8c0e82af1ecb79b4eea964108e2247623f5dda246b114dced6c2e72",
  approvedIdentitySourceId: HARBOR_LOGO,
  declaredText:
    "Harbor & Oak Home Services. Spring Tune-Up + Drain Clear Bundle $189 (was $249). March 10 – April 15, 2026. phone (804) 555-0142 · web harborandoak.example/book-tuneup",
  declaredLogoVariantId: HARBOR_LOGO,
  declaredContactPresentations: [
    { value: "(804) 555-0142", presentedAs: "phone" },
    { value: "harborandoak.example", presentedAs: "web" },
  ],
  declaredImageryTheme: "hvac_home_services",
};

/** Prior service-sheet-final.png retained (lighthouse identity — audit only). */
export const serviceSheetAFinal: DesignArtifactRef = {
  id: "service-sheet-a-v3-corrected",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/service-sheet-v3-corrected.png`,
  version: "v3_corrected",
  ...PORTRAIT,
  extension: "png",
  contentSha256: "ff2146d57863a0e2f0b1a78a000793ef0c22be3d20a4b0175b149e7b716cc324",
  approvedIdentitySourceId: HARBOR_LOGO,
  declaredText:
    "Harbor & Oak Home Services. Spring Tune-Up + Drain Clear. HVAC tune-up, drain clear, seasonal checks. $189 Spring Bundle March 10 – April 15, 2026. (804) 555-0142 · harborandoak.example",
  declaredLogoVariantId: HARBOR_LOGO,
  declaredContactPresentations: [
    { value: "(804) 555-0142", presentedAs: "phone" },
    { value: "harborandoak.example", presentedAs: "web" },
  ],
  declaredImageryTheme: "hvac_home_services",
};

/** Prior unauthorized identity proofs used in set-consistency tests. */
export const flyerAPriorIdentityDrift: DesignArtifactRef = {
  id: "flyer-a-v2-identity-drift",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/flyer-v2-final.png`,
  version: "final",
  ...PORTRAIT,
  extension: "png",
  contentSha256: "728529ebd5d7959a48277283d151b043cb46e74b45e9080dd52564d17dc3e645",
  approvedIdentitySourceId: "harbor-oak-unauthorized-oak-leaf-wordmark",
  declaredText:
    "Harbor & Oak Home Services. Spring Tune-Up + Drain Clear Bundle $189. March 10 – April 15, 2026. (804) 555-0142",
  declaredLogoVariantId: "harbor-oak-unauthorized-oak-leaf-wordmark",
  declaredImageryTheme: "hvac_home_services",
};

export const serviceSheetAPriorIdentityDrift: DesignArtifactRef = {
  id: "service-sheet-a-prior-identity-drift",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/service-sheet-final.png`,
  version: "final",
  ...PORTRAIT,
  extension: "png",
  contentSha256: "f494b53bc52146da7bb6f0783e6d62f72eab98fc8f84d13dfe07b560592885de",
  approvedIdentitySourceId: "harbor-oak-unauthorized-lighthouse-tree",
  declaredText:
    "Harbor & Oak Home Services. Spring Tune-Up + Drain Clear. $189 March 10 – April 15, 2026. (804) 555-0142 · harborandoak.example",
  declaredLogoVariantId: "harbor-oak-unauthorized-lighthouse-tree",
  declaredImageryTheme: "hvac_home_services",
};

/**
 * Prior evidence retained on disk (do not use for final cert submission):
 * - business-card-final.png (lighthouse+envelope — owner FAIL)
 * - business-card-v2-corrected.png (superseded by V3 after re-review)
 */
export const businessCardACorrected: DesignArtifactRef = {
  id: "business-card-a-v3-corrected",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/business-card-v3-corrected.png`,
  version: "v3_corrected",
  ...CARD_LANDSCAPE,
  extension: "png",
  contentSha256: "2b2ae31b05ea2acc1cc5d49a0e9b7689e5ba5c3811b578ecefbb102aad3fd4bb",
  approvedIdentitySourceId: HARBOR_LOGO,
  declaredText:
    "Harbor & Oak Home Services. Jordan Hale · Service Coordinator. (804) 555-0142 · web/globe harborandoak.example",
  declaredLogoVariantId: HARBOR_LOGO,
  isCampaignOfferAsset: false,
  declaredContactPresentations: [
    { value: "(804) 555-0142", presentedAs: "phone" },
    { value: "harborandoak.example", presentedAs: "web" },
  ],
  declaredImageryTheme: "hvac_home_services",
};

/**
 * Final Harbor social set for certification submission.
 * #1/#2/#4 are V3; #3 retained from V2 (no unauthorized availability claims).
 * Priors retained on disk for audit.
 */
export const socialPostsACorrected: readonly DesignArtifactRef[] = [
  {
    id: "social-a-1-v3",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/social-1-v3-corrected.png`,
    version: "v3_corrected",
    ...SQUARE,
    extension: "png",
    contentSha256: "4b1d5b8bd2e631767a4f286abb75a3aef65cff14e669336c5736336420df0dc9",
    approvedIdentitySourceId: HARBOR_LOGO,
    declaredText:
      "Harbor & Oak Home Services. Spring Tune-Up + Drain Clear $189. March 10 – April 15, 2026. Book harborandoak.example/book-tuneup · (804) 555-0142",
    declaredLogoVariantId: HARBOR_LOGO,
    isCampaignOfferAsset: true,
    declaredContactPresentations: [
      { value: "(804) 555-0142", presentedAs: "phone" },
      { value: "harborandoak.example", presentedAs: "web" },
    ],
    declaredImageryTheme: "hvac_home_services",
  },
  {
    id: "social-a-2-v3",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/social-2-v3-corrected.png`,
    version: "v3_corrected",
    ...SQUARE,
    extension: "png",
    contentSha256: "4f4c31aea1cfb242ef2e7da59f6926de88013afb7a056a861f752c75ca3bac5a",
    approvedIdentitySourceId: HARBOR_LOGO,
    // Prior social-2-v2-corrected.png retained on disk (unauthorized Saturday-slot language).
    declaredText:
      "Harbor & Oak Home Services. Spring Tune-Up + Drain Clear $189. March 10 – April 15, 2026. Book online harborandoak.example/book-tuneup or call (804) 555-0142",
    declaredLogoVariantId: HARBOR_LOGO,
    isCampaignOfferAsset: true,
    declaredContactPresentations: [
      { value: "(804) 555-0142", presentedAs: "phone" },
      { value: "harborandoak.example", presentedAs: "web" },
    ],
    declaredImageryTheme: "hvac_home_services",
  },
  {
    id: "social-a-3-v2",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/social-3-v2-corrected.png`,
    version: "v2_corrected",
    ...SQUARE,
    extension: "png",
    contentSha256: "b1a8f9ebbf0aa062b1a6a00f43e9c37f7b999af7d6a4fae5e12c991a29313ca3",
    approvedIdentitySourceId: HARBOR_LOGO,
    declaredText:
      "Harbor & Oak Home Services. Prepare before summer — Spring Tune-Up + Drain Clear $189 through April 15, 2026. Drain Clear included. harborandoak.example",
    declaredLogoVariantId: HARBOR_LOGO,
    isCampaignOfferAsset: true,
    declaredContactPresentations: [
      { value: "harborandoak.example", presentedAs: "web" },
    ],
    declaredImageryTheme: "hvac_home_services",
  },
  {
    id: "social-a-4-v3",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/social-4-v3-corrected.png`,
    version: "v3_corrected",
    ...SQUARE,
    extension: "png",
    contentSha256: "3d7ca4e70bd70d2696fce9b4c1535487417fb1b4eeef64112e6d8804c6fdd29d",
    approvedIdentitySourceId: HARBOR_LOGO,
    declaredText:
      "Harbor & Oak Home Services. Plain answers. No hard sell. Trust is earned. Book (804) 555-0142",
    declaredLogoVariantId: HARBOR_LOGO,
    isCampaignOfferAsset: false,
    declaredContactPresentations: [
      { value: "(804) 555-0142", presentedAs: "phone" },
    ],
    declaredImageryTheme: "hvac_home_services",
  },
];

export const menuBFinal: DesignArtifactRef = {
  id: "menu-b-final",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/menu-final.png`,
  version: "final",
  ...PORTRAIT,
  extension: "png",
  contentSha256: "63c9532fde333b6e753b8cabd8532aee66e0382d3e808fe09c993286b93c4c45",
  approvedIdentitySourceId: SALT_LOGO,
  declaredText:
    "Salt & Cedar Bakery. 214 Maple Street, Richmond, VA. (804) 555-0198. Pastries, breads, coffee. Saturday Morning Bundle coffee + pastry $8 through April 30, 2026.",
  declaredLogoVariantId: SALT_LOGO,
  declaredInclusions: ["coffee", "pastry"],
  declaredContactPresentations: [
    { value: "(804) 555-0198", presentedAs: "phone" },
    { value: "214 Maple Street", presentedAs: "address" },
  ],
  declaredImageryTheme: "bakery_food",
};

export const promoGraphicsBFinal: readonly DesignArtifactRef[] = [
  {
    id: "promo-b-1",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promo-1-final.png`,
    version: "final",
    ...SQUARE,
    extension: "png",
    contentSha256: "e0422b5ad9c8c47c947f783bf5fe380b9d14aa42eed918671b10e16f290cdad6",
    approvedIdentitySourceId: SALT_LOGO,
    declaredText:
      "Salt & Cedar Bakery. Saturday Morning Bundle $8 through April 30, 2026. Coffee + pastry. Visit 214 Maple Street · (804) 555-0198",
    declaredLogoVariantId: SALT_LOGO,
    isCampaignOfferAsset: true,
    declaredInclusions: ["coffee", "pastry"],
    declaredContactPresentations: [
      { value: "(804) 555-0198", presentedAs: "phone" },
      { value: "214 Maple Street", presentedAs: "address" },
    ],
    declaredImageryTheme: "bakery_food",
  },
  {
    id: "promo-b-2",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promo-2-final.png`,
    version: "final",
    ...PORTRAIT,
    extension: "png",
    contentSha256: "6069ad354d43c1cbf3f3719ea34a546f2cb3e7e840ba5244a67af0128629d14e",
    approvedIdentitySourceId: SALT_LOGO,
    declaredText:
      "Salt & Cedar Bakery. Saturday Morning Bundle. Coffee + pastry $8 Saturdays through April 30, 2026. saltandcedar.example/saturday",
    declaredLogoVariantId: SALT_LOGO,
    isCampaignOfferAsset: true,
    declaredInclusions: ["coffee", "pastry"],
    declaredContactPresentations: [
      { value: "saltandcedar.example", presentedAs: "web" },
    ],
    declaredImageryTheme: "bakery_food",
  },
];

/** Prior pack finals retained on disk for audit. */
export const promotionPackBCorrected: readonly DesignArtifactRef[] = [
  {
    id: "ma-b-1-v2",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promotion-pack-1-v2-corrected.png`,
    version: "v2_corrected",
    ...PORTRAIT,
    extension: "png",
    contentSha256: "cb05829397cb701928c7f77af8c47424542e14ab952bd2d20ef45adff4a16fc1",
    approvedIdentitySourceId: SALT_LOGO,
    declaredText:
      "Salt & Cedar Bakery Saturday Morning Bundle $8. Coffee + one pastry (customer chooses one). Through April 30, 2026. 214 Maple Street · (804) 555-0198",
    declaredLogoVariantId: SALT_LOGO,
    isCampaignOfferAsset: true,
    declaredInclusions: ["coffee", "pastry"],
    declaredContactPresentations: [
      { value: "(804) 555-0198", presentedAs: "phone" },
      { value: "214 Maple Street", presentedAs: "address" },
    ],
    declaredImageryTheme: "bakery_food",
  },
  {
    id: "ma-b-2",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promotion-pack-2-final.png`,
    version: "final",
    ...SQUARE,
    extension: "png",
    contentSha256: "c35907d3957165420c59c5ecd932c711c92c69d111b771e2e3b99ba9c059150d",
    approvedIdentitySourceId: SALT_LOGO,
    declaredText:
      "Salt & Cedar Bakery. Neighborhood bakery mornings. Saturday Morning Bundle $8. Visit Saturdays through April 30, 2026. Coffee + pastry.",
    declaredLogoVariantId: SALT_LOGO,
    isCampaignOfferAsset: true,
    declaredInclusions: ["coffee", "pastry"],
    declaredImageryTheme: "bakery_food",
  },
  {
    id: "ma-b-3-v2",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promotion-pack-3-v2-corrected.png`,
    version: "v2_corrected",
    ...SQUARE,
    extension: "png",
    contentSha256: "7d1369a23d778d03ddf66d6f1ba7ca57fcbe7b267bc5dc4e1c55d0d6ee122cce",
    approvedIdentitySourceId: SALT_LOGO,
    declaredText:
      "Salt & Cedar Bakery. Saturday Morning Bundle. Coffee + pastry $8. (804) 555-0198 · saltandcedar.example/saturday. Through April 30, 2026.",
    declaredLogoVariantId: SALT_LOGO,
    isCampaignOfferAsset: true,
    declaredInclusions: ["coffee", "pastry"],
    declaredContactPresentations: [
      { value: "(804) 555-0198", presentedAs: "phone" },
      { value: "saltandcedar.example", presentedAs: "web" },
    ],
    declaredImageryTheme: "bakery_food",
  },
  {
    id: "ma-b-4-v2",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promotion-pack-4-v2-corrected.png`,
    version: "v2_corrected",
    ...PORTRAIT,
    extension: "png",
    contentSha256: "c10e657983109cda242ebe598d0e6f9bc922e04a3d5af1c514b7278635467935",
    approvedIdentitySourceId: SALT_LOGO,
    declaredText:
      "Salt & Cedar Bakery. Handmade weekends. Saturday Morning Bundle coffee + pastry through April 30, 2026. 214 Maple Street. Bakery food imagery.",
    declaredLogoVariantId: SALT_LOGO,
    isCampaignOfferAsset: true,
    declaredInclusions: ["coffee", "pastry"],
    declaredContactPresentations: [
      { value: "214 Maple Street", presentedAs: "address" },
    ],
    declaredImageryTheme: "bakery_food",
  },
];

/** Defective priors used in tests to prove multi-asset gate failures. */
export const socialPostsAPriorDefects: readonly DesignArtifactRef[] = [
  {
    id: "social-a-2-prior-fail",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/social-2-final.png`,
    version: "final",
    ...SQUARE,
    extension: "png",
    declaredText:
      "Harbor & Oak Trades. $189 SPRING CHECK. Saturday morning slots. CALL (804) 555-0142",
    declaredLogoVariantId: "harbor-oak-unauthorized-trades-van",
    isCampaignOfferAsset: true,
    declaredImageryTheme: "hvac_home_services",
  },
  {
    id: "social-a-2-v2-unauthorized-urgency",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/social-2-v2-corrected.png`,
    version: "v2_corrected",
    ...SQUARE,
    extension: "png",
    contentSha256: "47838f7ef0509087fb71f8a0a2717476135913ae63af098d2c8df0e1a4cf4539",
    approvedIdentitySourceId: HARBOR_LOGO,
    declaredText:
      "Harbor & Oak Home Services. Saturday morning slots. LIMITED AVAILABILITY. BOOK EARLY. Spring Tune-Up + Drain Clear $189. March 10 – April 15, 2026. (804) 555-0142",
    declaredLogoVariantId: HARBOR_LOGO,
    isCampaignOfferAsset: true,
    declaredImageryTheme: "hvac_home_services",
  },
  {
    id: "social-a-3-prior-fail",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/social-3-final.png`,
    version: "final",
    ...SQUARE,
    extension: "png",
    declaredText:
      "Harbor & Oak. BEFORE SUMMER AC RUSH. Spring Tune-Up Bundle $189 through April 15, 2026. harborandoak.example",
    declaredLogoVariantId: "harbor-oak-unauthorized-lighthouse-tree",
    isCampaignOfferAsset: true,
    declaredImageryTheme: "hvac_home_services",
  },
];

export const businessCardAPriorDefect: DesignArtifactRef = {
  id: "business-card-a-prior",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/business-card-final.png`,
  version: "final",
  ...CARD_LANDSCAPE,
  extension: "png",
  contentSha256: "3411c22cdaa0666a6b619019a2efc1e74ea2637056af15e93dd11b9ec988f10f",
  approvedIdentitySourceId: "harbor-oak-unauthorized-lighthouse-tree",
  declaredText:
    "Harbor & Oak Home Services. Jordan Hale. email: harborandoak.example envelope icon. (804) 555-0142",
  declaredLogoVariantId: "harbor-oak-unauthorized-lighthouse-tree",
  isCampaignOfferAsset: false,
  declaredContactPresentations: [
    { value: "(804) 555-0142", presentedAs: "phone" },
    { value: "harborandoak.example", presentedAs: "email" },
  ],
};

/** Metadata lie: claims approved oval + web semantics while bytes are prior lighthouse/envelope card. */
export const businessCardMetadataLie: DesignArtifactRef = {
  id: "business-card-metadata-lie",
  relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-a/business-card-final.png`,
  version: "final",
  ...CARD_LANDSCAPE,
  extension: "png",
  contentSha256: "3411c22cdaa0666a6b619019a2efc1e74ea2637056af15e93dd11b9ec988f10f",
  approvedIdentitySourceId: HARBOR_LOGO,
  declaredText:
    "Harbor & Oak Home Services. Jordan Hale · Service Coordinator. (804) 555-0142 · web harborandoak.example",
  declaredLogoVariantId: HARBOR_LOGO,
  isCampaignOfferAsset: false,
  declaredContactPresentations: [
    { value: "(804) 555-0142", presentedAs: "phone" },
    { value: "harborandoak.example", presentedAs: "web" },
  ],
};

export const promotionPackPriorDefects: {
  pack1: DesignArtifactRef;
  pack3: DesignArtifactRef;
  pack4: DesignArtifactRef;
} = {
  pack1: {
    id: "ma-b-1-prior",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promotion-pack-1-final.png`,
    version: "final",
    ...PORTRAIT,
    extension: "png",
    declaredText:
      "Salt & Cedar Bakery Saturday Morning Bundle $8. INCLUDES pastry, muffin, scone, drip coffee. Through April 30, 2026.",
    declaredLogoVariantId: SALT_LOGO,
    declaredInclusions: ["pastry", "muffin", "scone", "drip coffee"],
    declaredImageryTheme: "bakery_food",
  },
  pack3: {
    id: "ma-b-3-prior",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promotion-pack-3-final.png`,
    version: "final",
    ...SQUARE,
    extension: "png",
    declaredText:
      "Salt & Cedar Bakery & Provisions. Coffee + pastry $8. (804) 555-0198 · saltandcedar.example/saturday",
    declaredLogoVariantId: SALT_LOGO,
    declaredInclusions: ["coffee", "pastry"],
    declaredImageryTheme: "bakery_food",
  },
  pack4: {
    id: "ma-b-4-prior",
    relativePath: `${CERT_DESIGN_ARTIFACT_ROOT}/fixture-b/promotion-pack-4-final.png`,
    version: "final",
    ...PORTRAIT,
    extension: "png",
    declaredText:
      "Salt & Cedar. Handmade weekends. Saturday Morning Bundle through April 30, 2026. 214 Maple Street.",
    declaredLogoVariantId: SALT_LOGO,
    declaredInclusions: ["coffee", "pastry"],
    declaredImageryTheme: "home_goods_candle_soap",
  },
};

export function briefForSku(
  skuId: CertDesignTestedSku,
  fixture: "a" | "b",
): DesignQualityBrief {
  const fx = fixture === "a" ? designFixtureA : designFixtureB;
  const identity = fixture === "a" ? harborBrandBrief() : saltBrandBrief();
  const base = {
    skuId,
    fixtureId: fx.id,
    requiredTextTokens: [...fx.requiredFacts, fx.businessName.split(" ")[0]!],
    prohibitedClaimPatterns: [...fx.prohibitedClaims],
    ctaTokens: [fx.phone, fx.ctaUrl.replace("https://", ""), "example"],
    requireCta: true,
    allowedExtensions: ["png", "jpg", "jpeg", "pdf"],
    dimensionTolerancePx: 40,
    ...identity,
  };

  switch (skuId) {
    case "v2-rtu-flyer":
      return {
        ...base,
        minAssets: 1,
        maxAssets: 1,
        expectedWidthPx: PORTRAIT.widthPx,
        expectedHeightPx: PORTRAIT.heightPx,
        requireLogoVariant: true,
        requireMultiAssetConsistency: false,
      };
    case "v2-rtu-menu":
      return {
        ...base,
        minAssets: 1,
        maxAssets: 1,
        expectedWidthPx: PORTRAIT.widthPx,
        expectedHeightPx: PORTRAIT.heightPx,
        requireLogoVariant: true,
        requireMultiAssetConsistency: false,
      };
    case "v2-rtu-service-sheet":
      return {
        ...base,
        minAssets: 1,
        maxAssets: 1,
        expectedWidthPx: PORTRAIT.widthPx,
        expectedHeightPx: PORTRAIT.heightPx,
        requireLogoVariant: true,
        requireMultiAssetConsistency: false,
      };
    case "v2-rtu-social-posts":
      return {
        ...base,
        // Brand-only trust post may omit offer facts; set still carries requiredFacts.
        requiredTextTokens: ["$189", "March 10", "April 15", "2026", "Harbor"],
        minAssets: 4,
        maxAssets: 4,
        expectedWidthPx: SQUARE.widthPx,
        expectedHeightPx: SQUARE.heightPx,
        requireLogoVariant: true,
        requireMultiAssetConsistency: true,
      };
    case "v2-rtu-promotion-graphics":
      return {
        ...base,
        minAssets: 2,
        maxAssets: 2,
        requireLogoVariant: true,
        requireMultiAssetConsistency: true,
      };
    case "v2-rtu-business-card":
      return {
        ...base,
        requiredTextTokens: ["Harbor", "555-0142", "Jordan|Hale|Coordinator|harborandoak"],
        minAssets: 1,
        maxAssets: 1,
        expectedWidthPx: CARD_LANDSCAPE.widthPx,
        expectedHeightPx: CARD_LANDSCAPE.heightPx,
        requireCta: true,
        requireLogoVariant: true,
        requireMultiAssetConsistency: false,
        // Card is contact identity — campaign truth lock still blocks Trades/aliases in text.
      };
    case "ma-001":
      return {
        ...base,
        minAssets: 1,
        maxAssets: 4,
        requireLogoVariant: true,
        requireMultiAssetConsistency: true,
      };
  }
}

export function submissionForSku(
  skuId: CertDesignTestedSku,
  stage: "fail" | "final",
): DesignQualitySubmission {
  if (skuId === "v2-rtu-flyer" && stage === "fail") {
    return { artifacts: [flyerAFailArtifact] };
  }
  switch (skuId) {
    case "v2-rtu-flyer":
      return { artifacts: [flyerAFinalArtifact] };
    case "v2-rtu-service-sheet":
      return { artifacts: [serviceSheetAFinal] };
    case "v2-rtu-business-card":
      return { artifacts: [businessCardACorrected] };
    case "v2-rtu-social-posts":
      return { artifacts: [...socialPostsACorrected] };
    case "v2-rtu-menu":
      return { artifacts: [menuBFinal] };
    case "v2-rtu-promotion-graphics":
      return { artifacts: [...promoGraphicsBFinal] };
    case "ma-001":
      return { artifacts: [...promotionPackBCorrected] };
  }
}

export const PASS_JUDGMENT_NOTES_A =
  "Hierarchy leads with offer then CTA; readable at phone size; Harbor & Oak Home Services uses locked harbor-oak-anchor-oak-oval-v1 on each bound file (sha256 contentSha256 verified); rendered identity matches declared source; contact globe/web semantics match on bound card/social files; multi-asset set keeps Spring Tune-Up + Drain Clear $189; imagery HVAC-appropriate; not a generic template swap.";

export const PASS_JUDGMENT_NOTES_B =
  "Menu/promo hierarchy scannable; Salt & Cedar Bakery locked wordmark+sprig on bound files (sha256 contentSha256 verified); rendered identity matches declared source; coffee+one pastry $8 truth; bakery imagery not home-goods; coordinated set with layout variation; export ready.";

export function passAttestations(fixture: "a" | "b"): DesignQualityJudgmentAttestations {
  return {
    hierarchyReviewed: true,
    readabilityReviewed: true,
    spacingCompositionReviewed: true,
    brandFitReviewed: true,
    genericnessRejected: true,
    exportReadinessReviewed: true,
    multiAssetConsistencyReviewed: true,
    imageryBusinessFitReviewed: true,
    renderedIdentityMatchesDeclaredSource: true,
    renderedContactSemanticsMatchDeclared: true,
    notes: fixture === "a" ? PASS_JUDGMENT_NOTES_A : PASS_JUDGMENT_NOTES_B,
  };
}

export const FAIL_JUDGMENT_NOTES_FLYER_A =
  "FAIL: hierarchy buried under hype; poor contrast implied by chaotic poster energy; CTA not clear; reads as generic template hype; brand fit wrong for plainspoken trades customer; imageryBusinessFitReviewed false for junk-mail energy.";

export const FAIL_JUDGMENT_NOTES_OFF_INDUSTRY =
  "FAIL: imagery shows candle/soap/textile home-goods lifestyle; does not communicate bakery production despite attractive polish; off-brief for Salt & Cedar Bakery campaign.";
