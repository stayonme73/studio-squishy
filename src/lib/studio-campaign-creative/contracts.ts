/**
 * STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-DESIGN-1
 *
 * Production contract types only — not a renderer rewrite.
 * Machine owns campaign creative capability; vendors are optional sockets.
 */

export const STUDIO_CAMPAIGN_CREATIVE_CONTRACT_VERSION =
  "studio-campaign-creative-contract-1.0.0" as const;

/** Customer-facing service names — never vendor brands. */
export const STUDIO_CAMPAIGN_CREATIVE_CUSTOMER_NAMES = [
  "Campaign Creative",
  "Social Graphic",
  "Print Collateral",
  "Short Promotional Video",
] as const;

export type CampaignFormatId =
  | "social_square"
  | "social_vertical"
  | "print_handout";

export type RectPx = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CreativeBrief = {
  campaignId: string;
  customerName: string;
  businessName: string;
  campaignName: string;
  voiceDirection: string;
  constraints: {
    noNeon: boolean;
    noBeforeAfterBody: boolean;
    calmWellness: boolean;
  };
  facts: {
    headline: string;
    supportingCopy: string;
    datesDisplay: string;
    priceDisplay: string;
    cta: string;
    bookingContact: string;
  };
  selectedAssetIds: {
    logoId: string;
    primaryPhotoId: string;
    supportPhotoIds: string[];
  };
  targetFormats: CampaignFormatId[];
};

export type CampaignVisualSystem = {
  systemId: string;
  palette: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
    accent: string;
  };
  typographyRoles: Record<
    string,
    { fontFamily: string; weight: number; trackingPx?: number }
  >;
  logoRules: {
    minClearspacePx: number;
    maxWidthFraction: number;
    allowedPlacements: ("top_left" | "top_center" | "bottom")[];
  };
  imageTreatmentRules: {
    preferredFit: "cover" | "contain";
    allowFullBleed: boolean;
    overlayMaxOpacity: number;
  };
  spacingScalePx: number[];
  ctaStyle: {
    background: string;
    textColor: string;
    borderRadiusPx: number;
    minHeightPx: number;
  };
  hierarchy: ("logo" | "headline" | "photo" | "body" | "price" | "dates" | "cta")[];
  approvedLayoutFamilyIds: string[];
};

export type AssetAssessment = {
  assetId: string;
  contentSha256: string;
  mimeType: string;
  widthPx: number;
  heightPx: number;
  orientation: "landscape" | "portrait" | "square";
  technical: {
    usable: boolean;
    failReasons: string[];
    estimatedBlurScore?: number;
    tooSmallForPrint: boolean;
  };
  /** Structured layout inputs — not subjective art direction. */
  subject?: {
    focalRegion: RectPx;
    safeCropRegion: RectPx;
    protectedBounds: RectPx[];
  };
};

export type LayoutRecipe = {
  recipeId: string;
  familyId: string;
  formatId: CampaignFormatId;
  canvas: { widthPx: number; heightPx: number };
  /** Absolute or relative slots Machine fills from brief + prepared assets. */
  slots: {
    id: string;
    kind: "image" | "text" | "logo" | "shape" | "cta";
    role: string;
    box: RectPx;
    fit?: "cover" | "contain";
    maxLines?: number;
    minFontPx?: number;
  }[];
};

export type PreparedVisualAsset = {
  preparedId: string;
  sourceAssetId: string;
  forFormat: CampaignFormatId;
  relativePath: string;
  contentSha256: string;
  cropApplied: RectPx;
  focalUsed?: RectPx;
};

export type RenderedCampaignAsset = {
  renderId: string;
  formatId: CampaignFormatId;
  recipeId: string;
  pngRelativePath: string;
  pdfRelativePath?: string;
  contentSha256: string;
  version: number;
};

export type AutomatedQaResult = {
  pass: boolean;
  findings: { id: string; severity: "fail" | "warn"; message: string }[];
};

export type CreativeQaResult = {
  pass: boolean;
  mode: "multimodal_structured" | "owner_visual_inspect_only";
  findings: { id: string; message: string }[];
  sellabilityJudgment?: "would_charge" | "would_not_charge" | "uncertain";
};

/** Provider-neutral sockets — never Adobe/Canva/Placid-named. */
export type SubjectDetectionProvider = {
  detect(input: {
    imageBytes: Uint8Array;
    mimeType: string;
  }): Promise<{
    focalRegion: RectPx;
    safeCropRegion: RectPx;
    protectedBounds: RectPx[];
  }>;
};

export type BackgroundRemovalProvider = {
  removeBackground(input: {
    imageBytes: Uint8Array;
    mimeType: string;
  }): Promise<{ imageBytes: Uint8Array; mimeType: string }>;
};

export type ImageExpansionProvider = {
  expand(input: {
    imageBytes: Uint8Array;
    mimeType: string;
    targetAspect: { width: number; height: number };
  }): Promise<{ imageBytes: Uint8Array; mimeType: string }>;
};

export type VisualGenerationProvider = {
  generate(input: {
    prompt: string;
    widthPx: number;
    heightPx: number;
  }): Promise<{ imageBytes: Uint8Array; mimeType: string }>;
};

export type CreativeQaProvider = {
  critique(input: {
    imagePngBytes: Uint8Array;
    brief: CreativeBrief;
    system: CampaignVisualSystem;
  }): Promise<CreativeQaResult>;
};

export type MachineNativeCampaignPipelineStages = [
  "project_truth",
  "creative_brief",
  "campaign_visual_system",
  "asset_assessment",
  "layout_recipe",
  "prepared_visual_asset",
  "rendered_campaign_asset",
  "automated_qa",
  "creative_qa",
  "review_version",
  "delivery_asset",
];
