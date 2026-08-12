/**
 * STUDIO-OPERATING-DESIGN-MENU-PROOF-1
 * (+ MENU-LAYOUT-1 — two-column / tight price pairing; same contract floors)
 * Bounded menu design specification — additive; does not alter flyer/card schemas.
 */

import type { DesignMaterialRef } from "./types";

export const DESIGN_RENDERER_MENU_SKU = "v2-rtu-menu" as const;
export type DesignRendererMenuSku = typeof DESIGN_RENDERER_MENU_SKU;

export const MENU_DESIGN_SPEC_VERSION = "menu-design-spec-1.1.0" as const;
export const MENU_RENDERER_VERSION =
  "design-renderer-menu-layout-1.0.0" as const;

/** CERT-DESIGN portrait plate (same as flyer) — one agreed Machine size. */
export const MENU_CANVAS = {
  widthPx: 1024,
  heightPx: 1536,
} as const;

export const MENU_MAX_SECTIONS = 5 as const;
export const MENU_MAX_ITEMS_TOTAL = 30 as const;

/**
 * Minimum readable typography for menu proof (px on CERT plate).
 * Reasoner must not place text below these floors to “make it fit.”
 */
export const MENU_MIN_FONT_PX = {
  wordmark: 28,
  descriptor: 14,
  sectionTitle: 15,
  itemName: 13,
  itemDescription: 11,
  itemPrice: 13,
  disclaimer: 10,
} as const;

export type MenuTextRole =
  | "wordmark"
  | "descriptor"
  | "section_title"
  | "item_name"
  | "item_description"
  | "item_price"
  | "dietary_disclaimer"
  | "legal_disclaimer";

export type MenuShapeRole =
  | "accent_bar"
  | "logo_plate"
  | "section_rule"
  | "footer_rule"
  | "price_leader";

export type MenuTextLayer = {
  type: "text";
  id: string;
  role: MenuTextRole;
  content: string;
  x: number;
  y: number;
  width: number;
  /** Optional fixed box height — used for clip detection when set. */
  height?: number;
  fontSizePx: number;
  fontWeight: 400 | 500 | 600 | 700;
  lineHeight: number;
  letterSpacingPx?: number;
  color: string;
  align: "left" | "center" | "right";
  maxLines?: number;
  /** Authoritative item id when this layer belongs to a menu item. */
  itemId?: string;
  sectionId?: string;
  /** Min font floor for capture QA (defaults from role). */
  minFontPx?: number;
};

export type MenuImageLayer = {
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

export type MenuShapeLayer = {
  type: "shape";
  id: string;
  role: MenuShapeRole;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  borderRadiusPx?: number;
};

export type MenuDesignLayer =
  | MenuTextLayer
  | MenuImageLayer
  | MenuShapeLayer;

export type MenuItemTruth = {
  itemId: string;
  name: string;
  /** Optional — omit or empty when client supplies none; never invent. */
  description?: string;
  priceDisplay: string;
};

export type MenuSectionTruth = {
  sectionId: string;
  title: string;
  items: readonly MenuItemTruth[];
};

export type MenuDesignSpec = {
  specVersion: typeof MENU_DESIGN_SPEC_VERSION;
  skuId: DesignRendererMenuSku;
  canvas: { widthPx: number; heightPx: number };
  background: { color: string };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  layers: readonly MenuDesignLayer[];
  materials: readonly DesignMaterialRef[];
  outputFormats: readonly ("png" | "pdf")[];
  reasoningMode: "deterministic_constrained" | "anthropic_text_model";
  reasoningModel?: string;
  /** Content bottom bound computed by reasoner (for density audit). */
  contentBottomPx: number;
  /** Font scale used (comfortable → compact → minimum). */
  typographyMode: "comfortable" | "compact" | "minimum";
  /**
   * MENU-LAYOUT-1: structured page strategy.
   * two_column = section flow across left/right columns with tight item–price pairs.
   * single_column = tight price pairing (not full-bleed price gutter).
   */
  layoutMode: "single_column" | "two_column";
};

export type MenuOutputMode = "customer" | "certification_fixture";

export type MenuProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererMenuSku;
  fixtureId: string;
  label: string;
  outputMode: MenuOutputMode;
  businessName: string;
  wordmark: string;
  descriptor?: string;
  sections: readonly MenuSectionTruth[];
  /** Client-supplied dietary/allergen wording (required intake field; may be “None”). */
  dietaryLabels: string;
  /** Optional client-supplied legal disclaimer. */
  legalDisclaimer?: string;
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

export type MenuArtifactIdentity = {
  packageId: "STUDIO-OPERATING-DESIGN-MENU-PROOF-1";
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererMenuSku;
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
  itemCount: number;
  sectionCount: number;
  typographyMode: MenuDesignSpec["typographyMode"];
  layoutMode: MenuDesignSpec["layoutMode"];
  contentBottomPx: number;
  overflowOk: boolean;
  overflowDetail: string;
};

export type MenuRendererFailureCode =
  | "INVALID_DESIGN_SPEC"
  | "MISSING_REQUIRED_MATERIAL"
  | "MISSING_REQUIRED_TRUTH"
  | "BROKEN_ASSET_REFERENCE"
  | "RENDER_FAILURE"
  | "EXPORT_FAILURE"
  | "QA_FAILURE"
  | "DENSITY_OVERFLOW"
  | "SKU_NOT_SUPPORTED";

export type MenuRendererPipelineResult =
  | {
      ok: true;
      verdict: "MENU_RENDERER_PROOF_PASS" | "MENU_RENDERER_JOB_PASS";
      identity: MenuArtifactIdentity;
      designSpec: MenuDesignSpec;
      qaOk: true;
      qaSummary: string;
      overflowOk: boolean;
      overflowDetail: string;
      declaredText: string;
      itemCompletenessOk: true;
      priceTruthOk: true;
      outputMode: MenuOutputMode;
      ownerRoutineProduction: "NONE";
      canvaUsed: false;
      makeUsed: false;
    }
  | {
      ok: false;
      verdict: "MENU_RENDERER_PROOF_FAIL" | "MENU_RENDERER_JOB_FAIL";
      failureCode: MenuRendererFailureCode;
      message: string;
      identity?: MenuArtifactIdentity;
      designSpec?: MenuDesignSpec;
      outputMode?: MenuOutputMode;
      ownerRoutineProduction: "NONE";
      canvaUsed: false;
      makeUsed: false;
    };
