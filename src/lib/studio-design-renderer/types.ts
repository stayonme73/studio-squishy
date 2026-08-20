/**
 * STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1
 * Bounded design specification for v2-rtu-flyer only.
 * Creative reasoning and rendering remain separable — HTML is not the creative SoR.
 */

export const DESIGN_RENDERER_PROOF_SKU = "v2-rtu-flyer" as const;
export type DesignRendererProofSku = typeof DESIGN_RENDERER_PROOF_SKU;

export const FLYER_DESIGN_SPEC_VERSION = "flyer-design-spec-1.0.0" as const;
export const DESIGN_RENDERER_VERSION = "design-renderer-proof-1.0.0" as const;

/** CERT / design-quality plate used for v2-rtu-flyer. */
export const FLYER_CANVAS = {
  widthPx: 1024,
  heightPx: 1536,
} as const;

export type FlyerTextRole =
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
  | "disclaimer";

export type FlyerImageRole = "logo" | "hero";

export type FlyerShapeRole = "plate" | "accent_bar" | "logo_plate" | "footer_rule";

export type DesignMaterialRef = {
  materialId: string;
  role: FlyerImageRole;
  /** Repo-relative path; must exist when referenced. */
  relativePath: string;
  contentSha256: string;
  /** Approved identity source when this material is a logo lock. */
  approvedIdentitySourceId?: string;
};

export type FlyerTextLayer = {
  type: "text";
  id: string;
  role: FlyerTextRole;
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
  maxLines?: number;
};

export type FlyerImageLayer = {
  type: "image";
  id: string;
  role: FlyerImageRole;
  materialId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
};

export type FlyerShapeLayer = {
  type: "shape";
  id: string;
  role: FlyerShapeRole;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  borderRadiusPx?: number;
};

export type FlyerDesignLayer = FlyerTextLayer | FlyerImageLayer | FlyerShapeLayer;

export type FlyerDesignSpec = {
  specVersion: typeof FLYER_DESIGN_SPEC_VERSION;
  skuId: DesignRendererProofSku;
  canvas: { widthPx: number; heightPx: number };
  background: { color: string };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  layers: readonly FlyerDesignLayer[];
  materials: readonly DesignMaterialRef[];
  outputFormats: readonly ("png" | "pdf")[];
  /** Creative-reasoning mode that produced this spec. */
  reasoningMode: "deterministic_constrained" | "anthropic_text_model";
  /** Optional model id when anthropic path used. */
  reasoningModel?: string;
};

export type FlyerOutputMode = "customer" | "certification_fixture";

export type FlyerProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererProofSku;
  fixtureId: string;
  label: string;
  /** customer = live job truth; certification_fixture = Harbor CERT / internal proof only. */
  outputMode: FlyerOutputMode;
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
  approvedLogoVariantId: string | null;
  materials: readonly DesignMaterialRef[];
  requiredTextTokens: readonly string[];
  prohibitedClaimPatterns: readonly string[];
};

export type DesignArtifactIdentity = {
  packageId: "STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1";
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererProofSku;
  renderId: string;
  renderVersion: number;
  designSpecVersion: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  pngRelativePath: string;
  pdfRelativePath: string;
  htmlRelativePath: string;
  pngContentSha256: string;
  pdfContentSha256: string;
  widthPx: number;
  heightPx: number;
  createdAt: string;
  supersedesRenderId?: string;
  lineageNote: string;
};

export type DesignRendererFailureCode =
  | "INVALID_DESIGN_SPEC"
  | "MISSING_REQUIRED_MATERIAL"
  | "BROKEN_ASSET_REFERENCE"
  | "RENDER_FAILURE"
  | "EXPORT_FAILURE"
  | "QA_FAILURE"
  | "SKU_NOT_SUPPORTED"
  | "COLLISION"
  | "OVERLAP";

export type DesignRendererPipelineResult =
  | {
      ok: true;
      verdict: "DESIGN_RENDERER_PROOF_PASS" | "DESIGN_RENDERER_JOB_PASS";
      identity: DesignArtifactIdentity;
      designSpec: FlyerDesignSpec;
      qaOk: true;
      qaSummary: string;
      overflowOk: boolean;
      declaredText: string;
      outputMode: FlyerOutputMode;
    }
  | {
      ok: false;
      verdict: "DESIGN_RENDERER_PROOF_FAIL" | "DESIGN_RENDERER_JOB_FAIL";
      failureCode: DesignRendererFailureCode;
      message: string;
      identity?: DesignArtifactIdentity;
      designSpec?: FlyerDesignSpec;
      outputMode?: FlyerOutputMode;
    };
