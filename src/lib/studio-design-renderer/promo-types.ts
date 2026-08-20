/**
 * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-PROOF-1
 * Bounded campaign-set model for v2-rtu-promotion-graphics — exactly two assets.
 * Does not generalize to unlimited packs. primaryTool remapping is out of scope.
 */

export const DESIGN_RENDERER_PROMO_SKU = "v2-rtu-promotion-graphics" as const;
export type DesignRendererPromoSku = typeof DESIGN_RENDERER_PROMO_SKU;

export const PROMO_DESIGN_SPEC_VERSION =
  "promotion-graphics-design-spec-1.0.0" as const;
export const PROMO_RENDERER_VERSION =
  "design-renderer-promotion-graphics-1.0.0" as const;

/** CERT square plate exercised by this proof only — not a universal square license. */
export const PROMO_SQUARE_PLATE = {
  plateId: "cert-square-1024",
  widthPx: 1024,
  heightPx: 1024,
} as const;

/** Reuse sealed portrait CERT plate (flyer/menu/service-sheet) — do not mutate those lanes. */
export const PROMO_PORTRAIT_PLATE = {
  plateId: "cert-portrait-1024x1536",
  widthPx: 1024,
  heightPx: 1536,
} as const;

/** Reuse sealed landscape CERT plate (business card) — do not mutate that lane. */
export const PROMO_LANDSCAPE_PLATE = {
  plateId: "cert-landscape-1536x1024",
  widthPx: 1536,
  heightPx: 1024,
} as const;

export type PromoPlateId =
  | typeof PROMO_SQUARE_PLATE.plateId
  | typeof PROMO_PORTRAIT_PLATE.plateId
  | typeof PROMO_LANDSCAPE_PLATE.plateId;

export type PromoOutputMode = "certification_fixture" | "customer";

export type PromoTextRole =
  | "eyebrow"
  | "wordmark"
  | "descriptor"
  | "headline"
  | "offer"
  | "price"
  | "dates"
  | "body"
  | "cta"
  | "contact_phone"
  | "contact_web"
  | "purpose_label"
  | "disclaimer";

export type PromoImageRole = "logo";
export type PromoShapeRole =
  | "plate"
  | "accent_bar"
  | "logo_plate"
  | "footer_rule"
  | "offer_band";

export type PromoMaterialRef = {
  materialId: string;
  role: PromoImageRole;
  relativePath: string;
  contentSha256: string;
  approvedIdentitySourceId?: string;
};

export type PromoTextLayer = {
  type: "text";
  id: string;
  role: PromoTextRole;
  content: string;
  x: number;
  y: number;
  width: number;
  fontSizePx: number;
  fontWeight: 400 | 500 | 600 | 700;
  lineHeight: number;
  letterSpacingPx?: number;
  color: string;
  align: "left" | "center" | "right";
};

export type PromoImageLayer = {
  type: "image";
  id: string;
  role: PromoImageRole;
  materialId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
};

export type PromoShapeLayer = {
  type: "shape";
  id: string;
  role: PromoShapeRole;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  borderRadiusPx?: number;
};

export type PromoDesignLayer =
  | PromoTextLayer
  | PromoImageLayer
  | PromoShapeLayer;

/** Explicit fixture/demo purpose — never invent from live intake. */
export type PromoAssetTruth = {
  assetId: string;
  /** Customer-authorized purpose for this asset (fixture-supplied in proof). */
  authorizedPurpose: string;
  plateId: PromoPlateId;
  canvas: { widthPx: number; heightPx: number };
  /**
   * Layout family — square vs portrait must differ (coordinated, not cloned).
   * `wide_landscape` is intake-recordable (card plate reuse); promo layout for it
   * ships with a future render/dispatch package — reasoner fail-closes until then.
   */
  layoutVariant: "compact_square" | "tall_portrait" | "wide_landscape";
};

export type PromoProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererPromoSku;
  fixtureId: string;
  label: string;
  outputMode: PromoOutputMode;
  businessName: string;
  wordmark: string;
  descriptor: string;
  headline: string;
  offerName: string;
  priceDisplay: string;
  wasPriceDisplay?: string;
  dateWindow: string;
  body: string;
  cta: string;
  phone: string;
  webDisplay: string;
  webUrl: string;
  disclaimer: string;
  brandColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  materials: readonly PromoMaterialRef[];
  approvedLogoVariantId: string;
  requiredTextTokens: readonly string[];
  prohibitedClaimPatterns: readonly string[];
  /** Exactly two assets — semantic ids + explicit purposes. */
  assets: readonly [PromoAssetTruth, PromoAssetTruth];
  /**
   * Intake-truth audit note. Per-graphic purpose+plate are live as of INTAKE-TRUTH-1
   * (`graphicA/B_authorizedPurpose` + `graphicA/B_agreedPlate`). Dispatch still separate.
   */
  liveIntakePerAssetPurposeGap: string;
};

export type PromoAssetSpec = {
  assetId: string;
  authorizedPurpose: string;
  plateId: PromoPlateId;
  canvas: { widthPx: number; heightPx: number };
  layoutVariant: "compact_square" | "tall_portrait" | "wide_landscape";
  background: { color: string };
  layers: readonly PromoDesignLayer[];
  outputFormats: readonly ("png" | "pdf")[];
};

export type PromoCampaignSetSpec = {
  specVersion: typeof PROMO_DESIGN_SPEC_VERSION;
  skuId: DesignRendererPromoSku;
  colors: PromoProjectTruth["brandColors"];
  materials: readonly PromoMaterialRef[];
  sharedCampaign: {
    businessName: string;
    wordmark: string;
    offerName: string;
    priceDisplay: string;
    dateWindow: string;
    phone: string;
    webDisplay: string;
    cta: string;
  };
  assets: readonly [PromoAssetSpec, PromoAssetSpec];
  reasoningMode: "deterministic_constrained";
};

export type PromoAssetArtifact = {
  assetId: string;
  authorizedPurpose: string;
  plateId: PromoPlateId;
  widthPx: number;
  heightPx: number;
  layoutVariant: "compact_square" | "tall_portrait" | "wide_landscape";
  pngRelativePath: string;
  pdfRelativePath: string;
  htmlRelativePath: string;
  pngContentSha256: string;
  pdfContentSha256: string;
  assetSpecFingerprint: string;
  overflowOk: boolean;
  overflowDetail: string;
  individualQaOk: boolean;
};

export type PromoCampaignSetIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererPromoSku;
  renderId: string;
  /** Whole-set version — both assets belong to this vN. */
  campaignSetRenderVersion: number;
  designSpecVersion: typeof PROMO_DESIGN_SPEC_VERSION;
  sharedSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: typeof PROMO_RENDERER_VERSION;
  designSpecRelativePath: string;
  assets: readonly [PromoAssetArtifact, PromoAssetArtifact];
  setQaOk: boolean;
  createdAt: string;
  lineageNote: string;
  liveIntakePerAssetPurposeGap: string;
};

export type PromoRendererFailureCode =
  | "SKU_NOT_SUPPORTED"
  | "MISSING_REQUIRED_TRUTH"
  | "MISSING_REQUIRED_MATERIAL"
  | "INVALID_PLATE"
  | "INVALID_DESIGN_SPEC"
  | "BROKEN_ASSET_REFERENCE"
  | "RENDER_FAILURE"
  | "EXPORT_FAILURE"
  | "QA_FAILURE"
  | "SET_CONSISTENCY_FAILURE"
  | "PARTIAL_SET_FAILURE"
  | "FIXTURE_LEAKAGE"
  | "COLLISION"
  | "OVERLAP";

export type PromoRendererPipelineResult =
  | {
      ok: true;
      verdict: "PROMOTION_GRAPHICS_RENDERER_PROOF_PASS" | "PROMOTION_GRAPHICS_RENDERER_JOB_PASS";
      identity: PromoCampaignSetIdentity;
      designSpec: PromoCampaignSetSpec;
      qaOk: true;
      setQaOk: true;
      qaSummary: string;
      declaredTextByAsset: Record<string, string>;
      outputMode: PromoOutputMode;
      squarePlateProven: { plateId: string; widthPx: number; heightPx: number };
      portraitPlateReused: { plateId: string; widthPx: number; heightPx: number };
    }
  | {
      ok: false;
      verdict: "PROMOTION_GRAPHICS_RENDERER_PROOF_FAIL" | "PROMOTION_GRAPHICS_RENDERER_JOB_FAIL";
      failureCode: PromoRendererFailureCode;
      message: string;
      outputMode: PromoOutputMode;
      designSpec?: PromoCampaignSetSpec;
      identity?: PromoCampaignSetIdentity;
    };
