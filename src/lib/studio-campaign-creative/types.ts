/**
 * Machine-native photo-led campaign creative — DesignSpec-like types.
 * Separate from sealed promo/social lanes (logo-only image roles).
 */

import type {
  CampaignFormatId,
  CampaignVisualSystem,
  CreativeBrief,
} from "./contracts";

export const CAMPAIGN_CREATIVE_SPEC_VERSION =
  "campaign-creative-design-spec-1.0.0" as const;
export const CAMPAIGN_CREATIVE_RENDERER_VERSION =
  "studio-campaign-creative-1.0.0" as const;

export type CampaignImageRole = "logo" | "hero" | "support";

export type CampaignLayoutFamilyId =
  | "full_bleed_hero"
  | "split_hero"
  | "image_panel";

export type CampaignMaterialRef = {
  materialId: string;
  role: CampaignImageRole;
  relativePath: string;
  contentSha256: string;
};

export type CampaignTextRole =
  | "wordmark"
  | "headline"
  | "body"
  | "price"
  | "dates"
  | "cta"
  | "contact";

export type CampaignTextLayer = {
  type: "text";
  id: string;
  role: CampaignTextRole;
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

export type CampaignImageLayer = {
  type: "image";
  id: string;
  role: CampaignImageRole;
  materialId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
};

export type CampaignShapeLayer = {
  type: "shape";
  id: string;
  role: "plate" | "overlay" | "logo_plate" | "content_panel" | "cta_button";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  borderRadiusPx?: number;
  opacity?: number;
};

export type CampaignDesignLayer =
  | CampaignTextLayer
  | CampaignImageLayer
  | CampaignShapeLayer;

export type CampaignAssetSpec = {
  assetId: string;
  formatId: CampaignFormatId;
  recipeId: string;
  familyId: CampaignLayoutFamilyId;
  canvas: { widthPx: number; heightPx: number };
  background: { color: string };
  layers: readonly CampaignDesignLayer[];
  outputFormats: readonly ("png" | "pdf")[];
};

export type CampaignCreativeSetSpec = {
  specVersion: typeof CAMPAIGN_CREATIVE_SPEC_VERSION;
  systemId: string;
  familyId: CampaignLayoutFamilyId;
  colors: CampaignVisualSystem["palette"];
  materials: readonly CampaignMaterialRef[];
  brief: Pick<
    CreativeBrief,
    "campaignId" | "businessName" | "facts" | "constraints" | "voiceDirection"
  >;
  assets: readonly CampaignAssetSpec[];
  reasoningMode: "deterministic_constrained";
  reasoning: {
    familyId: CampaignLayoutFamilyId;
    heroMaterialId: string;
    rationaleCodes: readonly string[];
  };
};

export type CampaignCreativeSetIdentity = {
  packageId: string;
  campaignId: string;
  systemId: string;
  familyId: CampaignLayoutFamilyId;
  renderVersion: number;
  heroMaterialId: string;
  materialFingerprint: string;
  setFingerprint: string;
  assetFingerprints: Record<string, string>;
  pngShas: Record<string, string>;
  createdAt: string;
};
