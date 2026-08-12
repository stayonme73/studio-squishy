/**
 * STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1
 * Bounded business-card design specification — additive to flyer; does not alter flyer schema.
 */

import type { DesignMaterialRef } from "./types";

export const DESIGN_RENDERER_BUSINESS_CARD_SKU = "v2-rtu-business-card" as const;
export type DesignRendererBusinessCardSku =
  typeof DESIGN_RENDERER_BUSINESS_CARD_SKU;

export const BUSINESS_CARD_DESIGN_SPEC_VERSION =
  "business-card-design-spec-1.0.0" as const;
export const BUSINESS_CARD_RENDERER_VERSION =
  "design-renderer-business-card-proof-1.0.0" as const;

/**
 * Authoritative CERT-DESIGN landscape plate for v2-rtu-business-card.
 * Catalog promises “one agreed size” without fixed inches; this is the repo CERT plate
 * used for Machine proof preview/PDF pixels — not a claim of physical print inches,
 * bleed, trim, CMYK, or DPI certification.
 */
export const BUSINESS_CARD_CANVAS = {
  widthPx: 1536,
  heightPx: 1024,
} as const;

export type BusinessCardSideId = "front" | "back";

export type BusinessCardTextRole =
  | "wordmark"
  | "person_name"
  | "title"
  | "phone"
  | "email"
  | "web"
  | "address"
  | "descriptor"
  | "side_label";

export type BusinessCardShapeRole =
  | "plate"
  | "accent_bar"
  | "logo_plate"
  | "footer_rule"
  | "divider";

export type BusinessCardTextLayer = {
  type: "text";
  id: string;
  role: BusinessCardTextRole;
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

export type BusinessCardImageLayer = {
  type: "image";
  id: string;
  role: "logo";
  materialId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
};

export type BusinessCardShapeLayer = {
  type: "shape";
  id: string;
  role: BusinessCardShapeRole;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  borderRadiusPx?: number;
};

export type BusinessCardDesignLayer =
  | BusinessCardTextLayer
  | BusinessCardImageLayer
  | BusinessCardShapeLayer;

export type BusinessCardSideSpec = {
  side: BusinessCardSideId;
  background: { color: string };
  layers: readonly BusinessCardDesignLayer[];
};

export type BusinessCardDesignSpec = {
  specVersion: typeof BUSINESS_CARD_DESIGN_SPEC_VERSION;
  skuId: DesignRendererBusinessCardSku;
  canvas: { widthPx: number; heightPx: number };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  front: BusinessCardSideSpec;
  back: BusinessCardSideSpec;
  materials: readonly DesignMaterialRef[];
  outputFormats: readonly ("png" | "pdf")[];
  reasoningMode: "deterministic_constrained" | "anthropic_text_model";
  reasoningModel?: string;
};

export type BusinessCardOutputMode = "customer" | "certification_fixture";

export type BusinessCardProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererBusinessCardSku;
  fixtureId: string;
  label: string;
  outputMode: BusinessCardOutputMode;
  businessName: string;
  wordmark: string;
  /** Person name for the card (required by intake). */
  personName: string;
  /** Title/role when supplied — omit empty; never invent. */
  title?: string;
  phone: string;
  email: string;
  /** Website or social when supplied. */
  webDisplay?: string;
  webUrl?: string;
  /** Address when supplied. */
  address?: string;
  /** Optional short back descriptor from approved truth only. */
  backDescriptor?: string;
  brandColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  approvedLogoVariantId: string;
  materials: readonly DesignMaterialRef[];
  requiredTextTokens: readonly string[];
  prohibitedClaimPatterns: readonly string[];
};

export type BusinessCardSideArtifact = {
  side: BusinessCardSideId;
  pngRelativePath: string;
  htmlRelativePath: string;
  pngContentSha256: string;
  widthPx: number;
  heightPx: number;
  overflowOk: boolean;
  overflowDetail: string;
};

export type BusinessCardArtifactIdentity = {
  packageId: "STUDIO-OPERATING-DESIGN-BUSINESS-CARD-PROOF-1";
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererBusinessCardSku;
  renderId: string;
  renderVersion: number;
  designSpecVersion: string;
  designSpecFingerprint: string;
  materialFingerprint: string;
  rendererVersion: string;
  sides: readonly BusinessCardSideArtifact[];
  pdfRelativePath: string;
  pdfContentSha256: string;
  /** Combined design-spec.json */
  designSpecRelativePath: string;
  widthPx: number;
  heightPx: number;
  createdAt: string;
  supersedesRenderId?: string;
  lineageNote: string;
  printPromiseNote: string;
};

export type BusinessCardRendererFailureCode =
  | "INVALID_DESIGN_SPEC"
  | "MISSING_REQUIRED_MATERIAL"
  | "BROKEN_ASSET_REFERENCE"
  | "MISSING_REQUIRED_TRUTH"
  | "RENDER_FAILURE"
  | "EXPORT_FAILURE"
  | "QA_FAILURE"
  | "SKU_NOT_SUPPORTED";

export type BusinessCardRendererPipelineResult =
  | {
      ok: true;
      verdict: "BUSINESS_CARD_RENDERER_PROOF_PASS" | "BUSINESS_CARD_RENDERER_JOB_PASS";
      identity: BusinessCardArtifactIdentity;
      designSpec: BusinessCardDesignSpec;
      qaOk: true;
      qaSummary: string;
      declaredTextFront: string;
      declaredTextBack: string;
      outputMode: BusinessCardOutputMode;
    }
  | {
      ok: false;
      verdict: "BUSINESS_CARD_RENDERER_PROOF_FAIL" | "BUSINESS_CARD_RENDERER_JOB_FAIL";
      failureCode: BusinessCardRendererFailureCode;
      message: string;
      identity?: BusinessCardArtifactIdentity;
      designSpec?: BusinessCardDesignSpec;
      outputMode?: BusinessCardOutputMode;
    };
