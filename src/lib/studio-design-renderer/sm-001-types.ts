/**
 * STUDIO-OPERATING-DESIGN-SM-001-PROOF-1
 * Bounded Launch Set — plannedPostCount ∈ {4,5,6}, Studio captions,
 * posting order, advisory schedule manifest with date governance.
 *
 * Proof only. No primaryTool remap. No dispatch. Sealed social-posts untouched.
 */

import { PROMO_SQUARE_PLATE } from "./promo-types";

export const DESIGN_RENDERER_SM_001_SKU = "sm-001" as const;
export type DesignRendererSm001Sku = typeof DESIGN_RENDERER_SM_001_SKU;

export const SM_001_DESIGN_SPEC_VERSION = "sm-001-design-spec-1.0.0" as const;
export const SM_001_RENDERER_VERSION = "design-renderer-sm-001-1.0.0" as const;

/** Accepted CONTRACT-TRUTH-1 range. */
export const SM_001_PLANNED_POST_COUNTS = [4, 5, 6] as const;
export type Sm001PlannedPostCount = (typeof SM_001_PLANNED_POST_COUNTS)[number];

export const SM_001_SQUARE_PLATE = PROMO_SQUARE_PLATE;
export type Sm001PlateId = typeof PROMO_SQUARE_PLATE.plateId;

/**
 * Studio production layout templates — NOT customer contract roles.
 * 1–4 reuse sealed social layout family; 5–6 are Launch Set extensions.
 */
export const SM_001_LAYOUT_TEMPLATES = [
  "offer_lead",
  "cta_book",
  "dates_window",
  "trust_brand",
  "proof_point",
  "soft_close",
] as const;

export type Sm001LayoutTemplate = (typeof SM_001_LAYOUT_TEMPLATES)[number];

export type Sm001OutputMode = "certification_fixture" | "customer";

export type Sm001MaterialRef = {
  materialId: string;
  role: "logo";
  relativePath: string;
  contentSha256: string;
  approvedIdentitySourceId?: string;
};

export type Sm001TextRole =
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

export type Sm001DesignLayer =
  | {
      type: "text";
      id: string;
      role: Sm001TextRole;
      content: string;
      x: number;
      y: number;
      width: number;
      fontSizePx: number;
      fontWeight: 400 | 500 | 600 | 700;
      lineHeight: number;
      color: string;
      align: "left" | "center" | "right";
    }
  | {
      type: "shape";
      id: string;
      role: "plate" | "accent_bar" | "logo_plate" | "footer_rule" | "offer_band";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
      borderRadiusPx?: number;
    }
  | {
      type: "image";
      id: string;
      role: "logo";
      materialId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };

/** Authoritative campaign timing constraints (date governance). */
export type Sm001TimingConstraints = {
  /** Inclusive campaign / promotion start (ISO date YYYY-MM-DD) when known. */
  startDate?: string;
  /** Inclusive campaign / promotion end or expiration (ISO date YYYY-MM-DD) when known. */
  endDate?: string;
  /** Event date when known. */
  eventDate?: string;
  /** Dates the Studio must not suggest. */
  blackoutDates?: readonly string[];
};

export type Sm001MemberTruth = {
  assetId: string;
  orderIndex: number;
  layoutTemplate: Sm001LayoutTemplate;
};

export type Sm001ProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererSm001Sku;
  fixtureId: string;
  label: string;
  outputMode: Sm001OutputMode;
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
  platformLabel: string;
  brandColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    muted: string;
  };
  materials: readonly Sm001MaterialRef[];
  approvedLogoVariantId: string;
  requiredTextTokens: readonly string[];
  prohibitedClaimPatterns: readonly string[];
  /** Locked before execution — durable job identity. */
  plannedPostCount: Sm001PlannedPostCount;
  /** Auditable N-selection record (set before render). */
  plannedPostCountSelection: Sm001PlannedPostCountSelection;
  timingConstraints: Sm001TimingConstraints;
  assets: readonly Sm001MemberTruth[];
  proofScopeNote: string;
};

export type Sm001PlannedPostCountSelection = {
  plannedPostCount: Sm001PlannedPostCount;
  selectedBeforeExecution: true;
  rationale: string;
  signals: {
    hasLogo: boolean;
    hasOfferFacts: boolean;
    hasDateWindow: boolean;
    hasExtendedCopy: boolean;
    hasSecondaryProofPoint: boolean;
  };
  selectionFingerprint: string;
};

export type Sm001AssetSpec = {
  assetId: string;
  orderIndex: number;
  layoutTemplate: Sm001LayoutTemplate;
  authorizedPurpose: string;
  plateId: Sm001PlateId;
  canvas: { widthPx: number; heightPx: number };
  background: { color: string };
  layers: readonly Sm001DesignLayer[];
  outputFormats: readonly ("png" | "pdf")[];
};

export type Sm001SetSpec = {
  specVersion: typeof SM_001_DESIGN_SPEC_VERSION;
  skuId: DesignRendererSm001Sku;
  plannedPostCount: Sm001PlannedPostCount;
  platformLabel: string;
  colors: Sm001ProjectTruth["brandColors"];
  materials: readonly Sm001MaterialRef[];
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
  assets: readonly Sm001AssetSpec[];
  reasoningMode: "deterministic_constrained";
};

export type Sm001Caption = {
  captionId: string;
  assetId: string;
  orderIndex: number;
  text: string;
};

export type Sm001PostingOrderEntry = {
  position: number;
  assetId: string;
  captionId: string;
};

export type Sm001CalendarEntry = {
  setVersion?: number;
  orderIndex: number;
  assetId: string;
  captionId: string;
  /** Suggested advisory date YYYY-MM-DD */
  suggestedDate: string;
  artifactPngRelativePath?: string;
};

export type Sm001CalendarManifest = {
  kind: "sm_001_schedule_manifest";
  plannedPostCount: Sm001PlannedPostCount;
  campaignSetRenderVersion: number;
  advisory: true;
  publishingExcluded: true;
  postingTimesExcluded: true;
  dateGovernance: {
    respectedConstraints: Sm001TimingConstraints;
    policy: "constraint_window" | "bounded_advisory_sequence";
    policyNote: string;
  };
  entries: readonly Sm001CalendarEntry[];
};

export type Sm001AssetArtifact = {
  assetId: string;
  orderIndex: number;
  layoutTemplate: Sm001LayoutTemplate;
  authorizedPurpose: string;
  captionId: string;
  plateId: Sm001PlateId;
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

export type Sm001SetIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererSm001Sku;
  renderId: string;
  plannedPostCount: Sm001PlannedPostCount;
  plannedPostCountSelection: Sm001PlannedPostCountSelection;
  campaignSetRenderVersion: number;
  designSpecVersion: typeof SM_001_DESIGN_SPEC_VERSION;
  sharedSpecFingerprint: string;
  captionSetFingerprint: string;
  postingOrderFingerprint: string;
  calendarFingerprint: string;
  materialFingerprint: string;
  rendererVersion: typeof SM_001_RENDERER_VERSION;
  platformLabel: string;
  designSpecRelativePath: string;
  captionFileRelativePath: string;
  captionTextRelativePath: string;
  postingOrderRelativePath: string;
  calendarRelativePath: string;
  assets: readonly Sm001AssetArtifact[];
  captions: readonly Sm001Caption[];
  postingOrder: readonly Sm001PostingOrderEntry[];
  calendar: Sm001CalendarManifest;
  setQaOk: boolean;
  createdAt: string;
  lineageNote: string;
  proofScopeNote: string;
  executablePlate: {
    plateId: string;
    widthPx: number;
    heightPx: number;
    note: string;
  };
};

export type Sm001RendererFailureCode =
  | "SKU_NOT_SUPPORTED"
  | "MISSING_REQUIRED_TRUTH"
  | "MISSING_REQUIRED_MATERIAL"
  | "INVALID_PLATE"
  | "INVALID_DESIGN_SPEC"
  | "INVALID_PLANNED_POST_COUNT"
  | "BROKEN_ASSET_REFERENCE"
  | "RENDER_FAILURE"
  | "EXPORT_FAILURE"
  | "CAPTION_FAILURE"
  | "ORDER_FAILURE"
  | "BINDING_FAILURE"
  | "CALENDAR_FAILURE"
  | "DATE_GOVERNANCE_FAILURE"
  | "QA_FAILURE"
  | "SET_CONSISTENCY_FAILURE"
  | "PARTIAL_SET_FAILURE"
  | "COUNT_MISMATCH"
  | "FIXTURE_LEAKAGE";

export type Sm001RendererPipelineResult =
  | {
      ok: true;
      verdict: "SM_001_RENDERER_PROOF_PASS" | "SM_001_RENDERER_JOB_PASS";
      identity: Sm001SetIdentity;
      designSpec: Sm001SetSpec;
      captions: readonly Sm001Caption[];
      postingOrder: readonly Sm001PostingOrderEntry[];
      calendar: Sm001CalendarManifest;
      qaOk: true;
      setQaOk: true;
      qaSummary: string;
      declaredTextByAsset: Record<string, string>;
      outputMode: Sm001OutputMode;
      executablePlate: Sm001SetIdentity["executablePlate"];
    }
  | {
      ok: false;
      verdict: "SM_001_RENDERER_PROOF_FAIL" | "SM_001_RENDERER_JOB_FAIL";
      failureCode: Sm001RendererFailureCode;
      message: string;
      outputMode: Sm001OutputMode;
      designSpec?: Sm001SetSpec;
      identity?: Sm001SetIdentity;
      plannedPostCount?: Sm001PlannedPostCount;
    };
