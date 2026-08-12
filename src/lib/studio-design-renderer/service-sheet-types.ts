/**
 * STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1
 * Bounded service-sheet truth — additive; does not alter flyer/card/menu schemas.
 */

import type { DesignMaterialRef } from "./types";
import { MENU_CANVAS, MENU_MIN_FONT_PX } from "./menu-types";

export const DESIGN_RENDERER_SERVICE_SHEET_SKU = "v2-rtu-service-sheet" as const;
export type DesignRendererServiceSheetSku =
  typeof DESIGN_RENDERER_SERVICE_SHEET_SKU;

export const SERVICE_SHEET_DESIGN_SPEC_VERSION =
  "service-sheet-design-spec-1.0.0" as const;
export const SERVICE_SHEET_RENDERER_VERSION =
  "design-renderer-service-sheet-1.0.0" as const;

/** Same CERT portrait plate as flyer/menu — one agreed Machine size. */
export const SERVICE_SHEET_CANVAS = MENU_CANVAS;

export const SERVICE_SHEET_MAX_SERVICES = 10 as const;

/**
 * Comfortable floors for ≤10-row sheets (do not inherit menu max-density mins).
 */
export const SERVICE_SHEET_MIN_FONT_PX = {
  wordmark: Math.max(MENU_MIN_FONT_PX.wordmark, 30),
  descriptor: Math.max(MENU_MIN_FONT_PX.descriptor, 15),
  sectionTitle: Math.max(MENU_MIN_FONT_PX.sectionTitle, 16),
  serviceName: Math.max(MENU_MIN_FONT_PX.itemName, 15),
  serviceDescription: Math.max(MENU_MIN_FONT_PX.itemDescription, 12),
  servicePrice: Math.max(MENU_MIN_FONT_PX.itemPrice, 14),
  contact: 12,
  disclaimer: Math.max(MENU_MIN_FONT_PX.disclaimer, 11),
} as const;

/**
 * Authoritative pricing modes — exactly one per service row.
 * contact_for_pricing is customer-authorized wording only — never a Machine fallback.
 */
export type ServicePriceDisplayMode =
  | "listed"
  | "contact_for_pricing"
  | "omitted";

export type ServiceSheetTextRole =
  | "wordmark"
  | "descriptor"
  | "section_title"
  | "service_name"
  | "service_description"
  | "service_price"
  | "contact_block"
  | "legal_disclaimer";

export type ServiceSheetShapeRole =
  | "accent_bar"
  | "logo_plate"
  | "section_rule"
  | "footer_rule"
  | "row_rule";

export type ServiceSheetTextLayer = {
  type: "text";
  id: string;
  role: ServiceSheetTextRole;
  content: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  fontSizePx: number;
  fontWeight: 400 | 500 | 600 | 700;
  lineHeight: number;
  letterSpacingPx?: number;
  color: string;
  align: "left" | "center" | "right";
  maxLines?: number;
  serviceId?: string;
  minFontPx?: number;
};

export type ServiceSheetImageLayer = {
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

export type ServiceSheetShapeLayer = {
  type: "shape";
  id: string;
  role: ServiceSheetShapeRole;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  borderRadiusPx?: number;
};

export type ServiceSheetDesignLayer =
  | ServiceSheetTextLayer
  | ServiceSheetImageLayer
  | ServiceSheetShapeLayer;

export type ServiceRowTruth = {
  serviceId: string;
  name: string;
  /** Optional — omit when client supplies none; never invent. */
  description?: string;
  priceMode: ServicePriceDisplayMode;
  /**
   * Exact customer price text when listed.
   * Exact customer-authorized contact wording when contact_for_pricing.
   * Must be absent/empty when omitted.
   */
  priceDisplay?: string;
};

export type ServiceSheetDesignSpec = {
  specVersion: typeof SERVICE_SHEET_DESIGN_SPEC_VERSION;
  skuId: DesignRendererServiceSheetSku;
  canvas: { widthPx: number; heightPx: number };
  background: { color: string };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  layers: readonly ServiceSheetDesignLayer[];
  materials: readonly DesignMaterialRef[];
  outputFormats: readonly ("png" | "pdf")[];
  reasoningMode: "deterministic_constrained";
  contentBottomPx: number;
  typographyMode: "comfortable" | "compact" | "minimum";
  layoutMode: "single_column";
};

export type ServiceSheetOutputMode = "customer" | "certification_fixture";

export type ServiceSheetProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererServiceSheetSku;
  fixtureId: string;
  label: string;
  outputMode: ServiceSheetOutputMode;
  businessName: string;
  wordmark: string;
  descriptor?: string;
  /** Sheet heading above the service list (customer or fixture truth). */
  listHeading: string;
  services: readonly ServiceRowTruth[];
  /** Required intake contact details — client-supplied. */
  contactDetails: string;
  /** Client-supplied disclosures / wording. */
  legalDisclaimer: string;
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

export type ServiceSheetArtifactIdentity = {
  packageId: "STUDIO-OPERATING-DESIGN-SERVICE-SHEET-PROOF-1";
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererServiceSheetSku;
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
  serviceCount: number;
  listedCount: number;
  contactForPricingCount: number;
  omittedCount: number;
  typographyMode: ServiceSheetDesignSpec["typographyMode"];
  layoutMode: ServiceSheetDesignSpec["layoutMode"];
  contentBottomPx: number;
  overflowOk: boolean;
  overflowDetail: string;
};

export type ServiceSheetRendererFailureCode =
  | "INVALID_DESIGN_SPEC"
  | "MISSING_REQUIRED_MATERIAL"
  | "MISSING_REQUIRED_TRUTH"
  | "BROKEN_ASSET_REFERENCE"
  | "RENDER_FAILURE"
  | "EXPORT_FAILURE"
  | "QA_FAILURE"
  | "DENSITY_OVERFLOW"
  | "SKU_NOT_SUPPORTED"
  | "FIXTURE_LEAKAGE";

export type ServiceSheetRendererPipelineResult =
  | {
      ok: true;
      verdict:
        | "SERVICE_SHEET_RENDERER_PROOF_PASS"
        | "SERVICE_SHEET_RENDERER_JOB_PASS";
      identity: ServiceSheetArtifactIdentity;
      designSpec: ServiceSheetDesignSpec;
      qaOk: true;
      qaSummary: string;
      overflowOk: boolean;
      overflowDetail: string;
      declaredText: string;
      serviceCompletenessOk: true;
      priceTruthOk: true;
      outputMode: ServiceSheetOutputMode;
      ownerRoutineProduction: "NONE";
      canvaUsed: false;
      makeUsed: false;
    }
  | {
      ok: false;
      verdict:
        | "SERVICE_SHEET_RENDERER_PROOF_FAIL"
        | "SERVICE_SHEET_RENDERER_JOB_FAIL";
      failureCode: ServiceSheetRendererFailureCode;
      message: string;
      identity?: ServiceSheetArtifactIdentity;
      designSpec?: ServiceSheetDesignSpec;
      outputMode?: ServiceSheetOutputMode;
      ownerRoutineProduction: "NONE";
      canvaUsed: false;
      makeUsed: false;
    };
