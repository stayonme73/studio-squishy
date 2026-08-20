/**
 * STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-PROOF-1
 * Bounded campaign-set model for v2-rtu-social-posts — exactly four square posts
 * plus Studio-written captions and a durable posting order.
 *
 * Proof only. primaryTool remapping and dispatch wiring are out of scope.
 */

import { PROMO_SQUARE_PLATE } from "./promo-types";

export const DESIGN_RENDERER_SOCIAL_POSTS_SKU = "v2-rtu-social-posts" as const;
export type DesignRendererSocialPostsSku =
  typeof DESIGN_RENDERER_SOCIAL_POSTS_SKU;

export const SOCIAL_POSTS_DESIGN_SPEC_VERSION =
  "social-posts-design-spec-1.0.0" as const;
export const SOCIAL_POSTS_RENDERER_VERSION =
  "design-renderer-social-posts-1.0.0" as const;

/** SKU promise — exactly four posts. */
export const SOCIAL_POSTS_EXACT_COUNT = 4 as const;

/**
 * Square CERT plate reused from the promotion-graphics lane (`cert-square-1024`).
 * Social posts are square-only in this proof — no portrait variants authorized.
 */
export const SOCIAL_POSTS_SQUARE_PLATE = PROMO_SQUARE_PLATE;

export type SocialPostPlateId = typeof PROMO_SQUARE_PLATE.plateId;

export type SocialPostOrderIndex = 1 | 2 | 3 | 4;

/**
 * Proven Machine layout templates (CERT / Harbor PROOF-1).
 *
 * Classification (INTAKE-TRUTH-1):
 * - NOT fixed customer-facing service-contract roles
 * - NOT live intake selects (customer never picks these four)
 * - Harbor used them as fixture angles for variety
 * - Live path: Studio production assigns these proven templates for anti-clone
 *   layout variety — not a universal “offer → CTA → dates → trust” campaign arc
 */
export const SOCIAL_POST_ROLE_ANGLES = [
  "offer_lead",
  "cta_book",
  "dates_window",
  "trust_brand",
] as const;

export type SocialPostRoleAngle = (typeof SOCIAL_POST_ROLE_ANGLES)[number];

/** The one layout template allowed to omit campaign price/date facts on-asset. */
export const SOCIAL_POST_TRUST_ROLE_ANGLE = "trust_brand" as const;

export type SocialPostsOutputMode = "certification_fixture" | "customer";

/** Fixed-length set helper — the set is always exactly four members. */
export type SocialPostsQuad<T> = readonly [T, T, T, T];

export type SocialPostTextRole =
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

export type SocialPostImageRole = "logo";

export type SocialPostShapeRole =
  | "plate"
  | "accent_bar"
  | "logo_plate"
  | "footer_rule"
  | "offer_band";

export type SocialPostMaterialRef = {
  materialId: string;
  role: SocialPostImageRole;
  relativePath: string;
  contentSha256: string;
  approvedIdentitySourceId?: string;
};

export type SocialPostTextLayer = {
  type: "text";
  id: string;
  role: SocialPostTextRole;
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

export type SocialPostImageLayer = {
  type: "image";
  id: string;
  role: SocialPostImageRole;
  materialId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
};

export type SocialPostShapeLayer = {
  type: "shape";
  id: string;
  role: SocialPostShapeRole;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  borderRadiusPx?: number;
};

export type SocialPostDesignLayer =
  | SocialPostTextLayer
  | SocialPostImageLayer
  | SocialPostShapeLayer;

/** One member of the four-post set — position and editorial angle are truth, not inference. */
export type SocialPostMemberTruth = {
  assetId: string;
  orderIndex: SocialPostOrderIndex;
  roleAngle: string;
};

export type SocialPostsProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererSocialPostsSku;
  fixtureId: string;
  label: string;
  outputMode: SocialPostsOutputMode;
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
  /** Where the customer will publish — surfaced on-asset so the set is honest about placement. */
  platformLabel: string;
  brandColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  materials: readonly SocialPostMaterialRef[];
  approvedLogoVariantId: string;
  requiredTextTokens: readonly string[];
  prohibitedClaimPatterns: readonly string[];
  /** Exactly four members — semantic ids + explicit posting positions. */
  assets: SocialPostsQuad<SocialPostMemberTruth>;
  /** Audit note: dispatch/observer wiring intentionally not part of this proof. */
  dispatchWiringScopeNote: string;
};

export type SocialPostAssetSpec = {
  assetId: string;
  orderIndex: SocialPostOrderIndex;
  roleAngle: string;
  authorizedPurpose: string;
  plateId: SocialPostPlateId;
  canvas: { widthPx: number; heightPx: number };
  background: { color: string };
  layers: readonly SocialPostDesignLayer[];
  outputFormats: readonly ("png" | "pdf")[];
};

export type SocialPostsSetSpec = {
  specVersion: typeof SOCIAL_POSTS_DESIGN_SPEC_VERSION;
  skuId: DesignRendererSocialPostsSku;
  platformLabel: string;
  colors: SocialPostsProjectTruth["brandColors"];
  materials: readonly SocialPostMaterialRef[];
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
  assets: SocialPostsQuad<SocialPostAssetSpec>;
  reasoningMode: "deterministic_constrained";
};

/** Studio-written caption bound to exactly one post and posting position. */
export type SocialPostCaption = {
  captionId: string;
  assetId: string;
  orderIndex: SocialPostOrderIndex;
  text: string;
};

/** Durable posting order — position → post → caption. */
export type SocialPostingOrderEntry = {
  position: SocialPostOrderIndex;
  assetId: string;
  captionId: string;
};

export type SocialPostAssetArtifact = {
  assetId: string;
  orderIndex: SocialPostOrderIndex;
  roleAngle: string;
  authorizedPurpose: string;
  captionId: string;
  plateId: SocialPostPlateId;
  widthPx: number;
  heightPx: number;
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

export type SocialPostsSetIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererSocialPostsSku;
  renderId: string;
  /** Whole-set version — all four posts, captions, and order belong to this vN. */
  campaignSetRenderVersion: number;
  designSpecVersion: typeof SOCIAL_POSTS_DESIGN_SPEC_VERSION;
  sharedSpecFingerprint: string;
  captionSetFingerprint: string;
  postingOrderFingerprint: string;
  materialFingerprint: string;
  rendererVersion: typeof SOCIAL_POSTS_RENDERER_VERSION;
  platformLabel: string;
  designSpecRelativePath: string;
  captionFileRelativePath: string;
  captionTextRelativePath: string;
  postingOrderRelativePath: string;
  assets: SocialPostsQuad<SocialPostAssetArtifact>;
  captions: SocialPostsQuad<SocialPostCaption>;
  postingOrder: SocialPostsQuad<SocialPostingOrderEntry>;
  setQaOk: boolean;
  createdAt: string;
  lineageNote: string;
  dispatchWiringScopeNote: string;
};

export type SocialPostsRendererFailureCode =
  | "SKU_NOT_SUPPORTED"
  | "MISSING_REQUIRED_TRUTH"
  | "MISSING_REQUIRED_MATERIAL"
  | "INVALID_PLATE"
  | "INVALID_DESIGN_SPEC"
  | "BROKEN_ASSET_REFERENCE"
  | "RENDER_FAILURE"
  | "EXPORT_FAILURE"
  | "CAPTION_FAILURE"
  | "ORDER_FAILURE"
  | "BINDING_FAILURE"
  | "QA_FAILURE"
  | "SET_CONSISTENCY_FAILURE"
  | "PARTIAL_SET_FAILURE"
  | "FIXTURE_LEAKAGE"
  | "COLLISION"
  | "OVERLAP";

export type SocialPostsRendererPipelineResult =
  | {
      ok: true;
      verdict:
        | "SOCIAL_POSTS_RENDERER_PROOF_PASS"
        | "SOCIAL_POSTS_RENDERER_JOB_PASS";
      identity: SocialPostsSetIdentity;
      designSpec: SocialPostsSetSpec;
      captions: SocialPostsQuad<SocialPostCaption>;
      postingOrder: SocialPostsQuad<SocialPostingOrderEntry>;
      qaOk: true;
      setQaOk: true;
      qaSummary: string;
      declaredTextByAsset: Record<string, string>;
      outputMode: SocialPostsOutputMode;
      squarePlateReused: { plateId: string; widthPx: number; heightPx: number };
    }
  | {
      ok: false;
      verdict:
        | "SOCIAL_POSTS_RENDERER_PROOF_FAIL"
        | "SOCIAL_POSTS_RENDERER_JOB_FAIL";
      failureCode: SocialPostsRendererFailureCode;
      message: string;
      outputMode: SocialPostsOutputMode;
      designSpec?: SocialPostsSetSpec;
      identity?: SocialPostsSetIdentity;
    };
