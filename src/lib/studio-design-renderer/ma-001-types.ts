/**
 * ma-001 Promotion Pack — pack orchestration types (proof only).
 * Member identity ≠ artifact file count. Does not remap primaryTool.
 */

import type { BusinessCardProjectTruth } from "./card-types";
import type { FlyerProjectTruth } from "./types";
import type { PromoAssetTruth, PromoMaterialRef, PromoPlateId } from "./promo-types";
import type { ServiceSheetProjectTruth } from "./service-sheet-types";

export const DESIGN_RENDERER_MA_001_SKU = "ma-001" as const;
export type DesignRendererMa001Sku = typeof DESIGN_RENDERER_MA_001_SKU;

export const MA_001_PACK_SPEC_VERSION = "ma-001-pack-spec-1.0.0" as const;
export const MA_001_PACK_ORCHESTRATOR_VERSION =
  "design-renderer-ma-001-pack-1.0.0" as const;

export const MA_001_SUPPORTED_KINDS = [
  "flyer",
  "menu",
  "service_sheet",
  "business_card",
  "promotion_graphic",
] as const;

export type Ma001SupportedKind = (typeof MA_001_SUPPORTED_KINDS)[number];

export type Ma001LockedPackMemberCount = 1 | 2 | 3 | 4;

export type Ma001OutputMode = "certification_fixture" | "customer";

export type Ma001ProducerFamily =
  | "v2-rtu-flyer"
  | "v2-rtu-menu"
  | "v2-rtu-service-sheet"
  | "v2-rtu-business-card"
  | "v2-rtu-promotion-graphics-single-adapter";

export type Ma001PlannedPackMember = {
  memberId: string;
  kind: Ma001SupportedKind | string;
  order: number;
  memberPurpose: string;
  producerFamily: Ma001ProducerFamily | string;
  /** Required for promotion_graphic; inherited defaults for sealed singles. */
  agreedPlateId?: string;
  contentMaterialRef?: string;
};

export type Ma001PromotionGraphicMemberTruth = {
  assetId: string;
  authorizedPurpose: string;
  plateId: PromoPlateId;
  canvas: { widthPx: number; heightPx: number };
  layoutVariant: "compact_square" | "tall_portrait" | "wide_landscape";
  /** Shared campaign fields for sealed promo surface reuse. */
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
};

export type Ma001PackProjectTruth = {
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererMa001Sku;
  fixtureId: string;
  label: string;
  outputMode: Ma001OutputMode;
  /** Counts member identities — not artifact files. */
  lockedPackMemberCount: Ma001LockedPackMemberCount;
  plannedPackMembers: readonly Ma001PlannedPackMember[];
  /** Shared campaign focus label for pack QA. */
  campaignFocus: string;
  businessName: string;
  offerName: string;
  priceDisplay: string;
  /** Per-member producer payloads keyed by memberId. */
  memberTruthById: Record<
    string,
    | { kind: "flyer"; truth: FlyerProjectTruth }
    | { kind: "business_card"; truth: BusinessCardProjectTruth }
    | { kind: "service_sheet"; truth: ServiceSheetProjectTruth }
    | { kind: "menu"; truth: never }
    | { kind: "promotion_graphic"; truth: Ma001PromotionGraphicMemberTruth }
  >;
};

export type Ma001MemberArtifactRef = {
  role: string;
  relativePath: string;
  contentSha256: string;
  widthPx?: number;
  heightPx?: number;
};

export type Ma001MemberResult = {
  memberId: string;
  kind: string;
  order: number;
  producerFamily: string;
  agreedPlateId: string;
  memberPurpose: string;
  producerQaOk: boolean;
  artifacts: readonly Ma001MemberArtifactRef[];
  producerIdentityRel?: string;
  producerRenderVersion?: number;
  error?: string;
};

export type Ma001PackIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: DesignRendererMa001Sku;
  packRenderVersion: number;
  lockedPackMemberCount: Ma001LockedPackMemberCount;
  plannedPackMembers: readonly Ma001PlannedPackMember[];
  members: readonly Ma001MemberResult[];
  packFingerprint: string;
  packQaOk: boolean;
  manifestRelativePath: string;
  identityRelativePath: string;
  orchestratorVersion: string;
  createdAt: string;
};

export type Ma001PackFailureCode =
  | "SKU_NOT_SUPPORTED"
  | "INVALID_COMPOSITION"
  | "UNSUPPORTED_KIND"
  | "MEMBER_COUNT_MISMATCH"
  | "MEMBER_RENDER_FAILURE"
  | "MEMBER_QA_FAILURE"
  | "PACK_QA_FAILURE"
  | "MANIFEST_INCOMPLETE"
  | "WRONG_KIND"
  | "WRONG_PLATE"
  | "PARTIAL_PACK_FAILURE"
  | "MISSING_MEMBER_TRUTH";

export type Ma001PackPipelineResult =
  | {
      ok: true;
      verdict: "MA_001_PACK_ORCHESTRATOR_PROOF_PASS" | "MA_001_PACK_ORCHESTRATOR_JOB_PASS";
      invocationOutcome: "RENDERED" | "ALREADY_RENDERED";
      identity: Ma001PackIdentity;
      outputMode: Ma001OutputMode;
      artifactRootRel: string;
      packFingerprint: string;
    }
  | {
      ok: false;
      verdict: "MA_001_PACK_ORCHESTRATOR_PROOF_FAIL" | "MA_001_PACK_ORCHESTRATOR_JOB_FAIL";
      failureCode: Ma001PackFailureCode;
      message: string;
      outputMode: Ma001OutputMode;
      identity?: Ma001PackIdentity;
      artifactRootRel?: string;
    };

/** Re-export for adapter convenience. */
export type { PromoAssetTruth };
