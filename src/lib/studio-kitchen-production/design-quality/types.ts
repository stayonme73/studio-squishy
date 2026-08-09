/**
 * Runtime design-quality evaluation for static visual production.
 *
 * Deterministic checks ≠ complete visual judgment.
 * Judgment attestations must explain hierarchy, brand fit, genericness, etc.
 * Multi-asset jobs additionally require brand-identity + campaign-truth consistency.
 */

export type DesignQualityFinding = {
  id: string;
  severity: "fail" | "warn";
  message: string;
  checkKind:
    | "required_text"
    | "prohibited_claim"
    | "scope_count"
    | "format"
    | "dimensions"
    | "cta"
    | "judgment_attestation"
    | "artifact_path"
    | "brand_identity"
    | "campaign_truth"
    | "contact_semantics"
    | "bundle_inclusions"
    | "multi_asset_consistency"
    | "artifact_binding";
};

export type DesignContactKind = "phone" | "email" | "web" | "address";

export type DesignBrandIdentityLock = {
  businessName: string;
  requiredWordmark: string;
  approvedDescriptors: readonly string[];
  prohibitedDescriptors: readonly string[];
  approvedLogoVariantIds: readonly string[];
};

export type DesignCampaignTruthLock = {
  offerName: string;
  offerNameRequiredTokens: readonly string[];
  priceToken: string;
  dateTokens: readonly string[];
  phone: string;
  urlTokens: readonly string[];
  prohibitedOfferAliases: readonly string[];
  /** When present, any declaredInclusions must equal this set (order-insensitive). */
  bundleInclusionsExact?: readonly string[];
};

export type DesignContactSemanticExpectation = {
  value: string;
  expectedKind: DesignContactKind;
};

export type DesignQualityBrief = {
  skuId: string;
  fixtureId: string;
  requiredTextTokens: readonly string[];
  prohibitedClaimPatterns: readonly string[];
  ctaTokens: readonly string[];
  requireCta: boolean;
  maxAssets: number;
  minAssets: number;
  allowedExtensions: readonly string[];
  /** Expected width/height when known; optional for judgment-only formats. */
  expectedWidthPx?: number;
  expectedHeightPx?: number;
  dimensionTolerancePx?: number;
  /** Authoritative brand identity for the job (required for multi-asset design jobs). */
  brandIdentity?: DesignBrandIdentityLock;
  /** Authoritative campaign facts; mutations fail QA. */
  campaignTruth?: DesignCampaignTruthLock;
  /** Contact values that must not be presented with the wrong semantic icon/label. */
  contactSemantics?: readonly DesignContactSemanticExpectation[];
  /**
   * When true (default if minAssets >= 2 and brandIdentity present), evaluate
   * cross-asset brand + campaign consistency.
   */
  requireMultiAssetConsistency?: boolean;
  /**
   * When true, every artifact must declare a logo variant in the approved set.
   * Defaults true for multi-asset jobs; single-asset jobs may omit unless set.
   */
  requireLogoVariant?: boolean;
  /** Declared imagery themes that must fail (e.g. home_goods for a bakery). */
  prohibitedImageryThemes?: readonly string[];
  /**
   * When true, every artifact must declare contentSha256 + approvedIdentitySourceId
   * matching bytes on disk. Defaults true when logo lock or multi-asset consistency applies.
   */
  requireArtifactBinding?: boolean;
  /** Repo root for binding checks (tests/production supply cwd or absolute root). */
  artifactRepoRoot?: string;
};

export type DesignArtifactContactPresentation = {
  value: string;
  presentedAs: DesignContactKind;
};

export type DesignArtifactRef = {
  id: string;
  relativePath: string;
  version: "v1_fail" | "v2_corrected" | "v3_corrected" | "v4_corrected" | "final";
  widthPx?: number;
  heightPx?: number;
  extension: string;
  /** Extracted/declared on-artifact text for deterministic presence checks. */
  declaredText: string;
  /**
   * SHA-256 of the exact PNG/PDF bytes on disk.
   * Required when brief.requireArtifactBinding — prevents certifying unbound metadata.
   */
  contentSha256?: string;
  /**
   * Authoritative approved identity source used to produce this file
   * (must equal declaredLogoVariantId / approved set member).
   */
  approvedIdentitySourceId?: string;
  /** Must be in brief.brandIdentity.approvedLogoVariantIds when brand lock present. */
  declaredLogoVariantId?: string;
  /**
   * When true (default for multi-asset campaign jobs), artifact is checked against
   * full campaign offer tokens. Brand-only trust pieces may set false but still
   * must not mutate offer facts if they mention price/offer aliases.
   */
  isCampaignOfferAsset?: boolean;
  declaredContactPresentations?: readonly DesignArtifactContactPresentation[];
  /** Normalized inclusion labels if the artifact claims what a bundle includes. */
  declaredInclusions?: readonly string[];
  /**
   * Declared imagery theme for industry-fit judgment support
   * (e.g. "bakery_food", "home_goods_candle_soap").
   */
  declaredImageryTheme?: string;
};

export type DesignQualitySubmission = {
  artifacts: readonly DesignArtifactRef[];
};

export type DesignQualityJudgmentAttestations = {
  hierarchyReviewed: boolean;
  readabilityReviewed: boolean;
  spacingCompositionReviewed: boolean;
  brandFitReviewed: boolean;
  genericnessRejected: boolean;
  exportReadinessReviewed: boolean;
  /**
   * Required when brief requires multi-asset consistency:
   * same brand + campaign truth with allowed creative variation.
   */
  multiAssetConsistencyReviewed?: boolean;
  /**
   * Imagery/products shown match the customer's actual business and campaign
   * (beautiful off-industry imagery must fail).
   */
  imageryBusinessFitReviewed?: boolean;
  /**
   * Human/AI visual judgment: rendered PNG matches declared approvedIdentitySourceId
   * for the exact contentSha256-bound file. Metadata alone is insufficient.
   */
  renderedIdentityMatchesDeclaredSource?: boolean;
  /**
   * Human/AI visual judgment: contact iconography matches declaredContactPresentations
   * on the exact bound file (e.g. globe for web, not envelope).
   */
  renderedContactSemanticsMatchDeclared?: boolean;
  /** Must explain why the visual passes/fails judgment (not "looks_good=true"). */
  notes: string;
};

export type DesignQualityEvaluation = {
  skuId: string;
  fixtureId: string;
  ok: boolean;
  findings: readonly DesignQualityFinding[];
  checkedAt: string;
  deterministicFailCount: number;
  judgmentRequired: true;
  summary: string;
  /** Present when multi-asset consistency was evaluated. */
  multiAssetConsistencyChecked?: boolean;
};

export type DesignQualityEvidence = {
  evaluation: DesignQualityEvaluation;
  attestations: DesignQualityJudgmentAttestations;
  gatePassed: boolean;
};

export type DesignQualityQaPayload = {
  brief: DesignQualityBrief;
  submission: DesignQualitySubmission;
  attestations: DesignQualityJudgmentAttestations;
};
