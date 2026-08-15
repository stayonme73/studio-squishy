/**
 * BF-001 Brand Identity Refresh — PROOF-1 types (contract freeze).
 * No remap · Canva OFF in proof · Owner routine NONE.
 */

import {
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
} from "./rm-j002-types";

export const DESIGN_RENDERER_BF_001_SKU = "bf-001" as const;

export const BF_001_PACKAGE_SPEC_VERSION = "bf-001-refresh-package-v1" as const;
export const BF_001_ORCHESTRATOR_VERSION =
  "bf-001-orchestrator-v1.0-proof" as const;
export const BF_001_SHEET_VISUAL_VERSION =
  "v1.4-brand-direction-sheet-distributed" as const;
export const BF_001_GRAPHIC_VISUAL_VERSION =
  "v1.1-profile-or-cover-logo-placed-clean" as const;

/** Contract-frozen sheet plate. */
export const BF_001_SHEET_PLATE = {
  plateId: "brand-direction-sheet-portrait-1024x1536",
  widthPx: 1024,
  heightPx: 1536,
  aspect: "2:3",
  note: "One-page Brand Direction Sheet — strategy document, not a campaign flyer.",
} as const;

export const BF_001_PROFILE_PLATE = RM_J002_AVATAR_PLATE;
export const BF_001_COVER_PLATE = RM_J002_FACEBOOK_COVER_PLATE;

/** Studio-safe fonts usable in Machine-rendered graphic HTML. */
export const BF_001_STUDIO_SAFE_FONTS = [
  "Georgia",
  "Times New Roman",
  "Times",
  "serif",
  "Arial",
  "Helvetica",
  "sans-serif",
] as const;

export type Bf001GraphicKind = "profile" | "cover";

export type Bf001MemberId =
  | "brand_direction_sheet"
  | "profile_or_cover_graphic";

export type Bf001MemberKind =
  | "strategy_document"
  | "design_profile"
  | "design_cover";

export type Bf001LogoMaterial = {
  materialId: string;
  role: "logo";
  relativePath: string;
  contentSha256: string;
  approvedIdentitySourceId?: string;
};

export type Bf001HexSwatch = {
  role: string;
  hex: string;
  label: string;
};

export type Bf001FontRecommendation = {
  role: "primary" | "secondary" | "accent";
  recommendedFamily: string;
  recommendationOnly: true;
  notes: string;
};

export type Bf001LogoUsageRules = {
  clearSpace: string;
  placement: string;
  backgroundContrast: string;
  preferredLockup: string;
  avoidDistortion: string;
  minimumSize: string;
  consistency: string;
  redesignForbidden: true;
};

export type Bf001PlannedMember = {
  memberId: Bf001MemberId;
  kind: Bf001MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId: string;
};

export type Bf001RefreshProjectTruth = {
  skuId: typeof DESIGN_RENDERER_BF_001_SKU;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  businessName: string;
  /** Locked before payment — profile XOR cover. */
  graphicKind: Bf001GraphicKind;
  lockedPackageMemberCount: 2;
  plannedMembers: readonly Bf001PlannedMember[];
  /** Customer visual starting point — required. */
  logoMaterial: Bf001LogoMaterial | null;
  visualStartingPointNotes: string;
  likesDislikes: string;
  businessFacts: string;
  hexPalette: readonly Bf001HexSwatch[];
  fontRecommendations: readonly Bf001FontRecommendation[];
  logoUsageRules: Bf001LogoUsageRules;
  /** Studio-safe face used on the graphic (must be in BF_001_STUDIO_SAFE_FONTS). */
  graphicRenderFontFamily: string;
  label: string;
};

export type Bf001ArtifactRef = {
  role: string;
  relativePath: string;
  contentSha256: string;
};

export type Bf001MemberResult = {
  memberId: Bf001MemberId;
  kind: Bf001MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId: string;
  producerQaOk: boolean;
  artifacts: readonly Bf001ArtifactRef[];
  plateHonestyNote?: string;
};

export type Bf001PackageIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: typeof DESIGN_RENDERER_BF_001_SKU;
  businessName: string;
  graphicKind: Bf001GraphicKind;
  packageRenderVersion: number;
  lockedPackageMemberCount: 2;
  plannedMembers: readonly Bf001PlannedMember[];
  members: readonly Bf001MemberResult[];
  packageFingerprint: string;
  packageQaOk: boolean;
  manifestRelativePath: string;
  identityRelativePath: string;
  orchestratorVersion: string;
  ownerRoutine: "NONE";
  canvaUsed: false;
  remapAuthorized: false;
  createdAt: string;
};

export type Bf001OutputMode = "proof" | "dispatch";

export type Bf001PackagePipelineResult =
  | {
      ok: true;
      verdict: "BF_001_REFRESH_PACKAGE_PROOF_PASS" | "ALREADY_RENDERED";
      invocationOutcome?: "RENDERED" | "ALREADY_RENDERED";
      identity: Bf001PackageIdentity;
      outputMode: Bf001OutputMode;
    }
  | {
      ok: false;
      verdict: "BF_001_REFRESH_PACKAGE_PROOF_FAIL";
      failureCode:
        | "STARTING_POINT_INSUFFICIENT"
        | "BUSINESS_NAME_MISSING"
        | "GRAPHIC_KIND_INVALID"
        | "PROFILE_AND_COVER"
        | "NO_GRAPHIC_SELECTED"
        | "MEMBERSHIP_MISMATCH"
        | "PLATE_MISMATCH"
        | "STUDIO_SAFE_FONT_VIOLATION"
        | "LOGO_REDRAW_FORBIDDEN"
        | "SHEET_QA_FAIL"
        | "GRAPHIC_QA_FAIL"
        | "PACKAGE_QA_FAIL"
        | "DESIGN_QA_FAIL"
        | "CAPTURE_FAIL";
      message: string;
      outputMode: Bf001OutputMode;
    };
