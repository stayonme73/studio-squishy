/**
 * RM-J007 Reference-Guided Promotion Update — types (Owner APPROVE B freeze).
 * One existing promotional REFERENCE → one RECREATED updated final.
 * Bounded edits only · Canva OFF · Owner routine NONE · NOT an rm-j008 kit.
 */

import { PROMO_PORTRAIT_PLATE } from "./promo-types";

export const DESIGN_RENDERER_RM_J007_SKU = "rm-j007" as const;

export const RM_J007_PACKAGE_SPEC_VERSION =
  "rm-j007-reference-guided-update-v1" as const;
export const RM_J007_ORCHESTRATOR_VERSION =
  "rm-j007-orchestrator-v1.0-proof" as const;
export const RM_J007_VISUAL_VERSION =
  "v1.0-reference-recreation-panel" as const;

/** Reuse sealed promo portrait CERT plate — do not invent a new plate. */
export const RM_J007_UPDATE_PLATE = PROMO_PORTRAIT_PLATE;

export const RM_J007_HONESTY_LINE =
  "Reference-guided recreation — not a pixel-perfect edit of your original file." as const;

export type RmJ007MemberId = "updated_promotion";

export type RmJ007MemberKind = "design_promotion_update";

export type RmJ007ReferenceMime = "png" | "jpeg" | "pdf";

export type RmJ007ReferenceMaterial = {
  materialId: string;
  relativePath: string;
  contentSha256: string;
  mime: RmJ007ReferenceMime;
};

export type RmJ007ReplacementImageMaterial = {
  materialId: string;
  relativePath: string;
  contentSha256: string;
  mime: "png" | "jpeg";
};

export type RmJ007BoundedChanges = {
  dates?: string;
  prices?: string;
  contact?: string;
  wording?: string;
  remove?: string;
};

export type RmJ007PlannedMember = {
  memberId: RmJ007MemberId;
  kind: RmJ007MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId: string;
};

export type RmJ007UpdateProjectTruth = {
  skuId: typeof DESIGN_RENDERER_RM_J007_SKU;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  businessName: string;
  itemIdentity: string;
  whereLive: string;
  referenceMaterial: RmJ007ReferenceMaterial | null;
  replacementImage?: RmJ007ReplacementImageMaterial | null;
  boundedChanges: RmJ007BoundedChanges;
  /** Raw customer instruction — what should change. */
  whatChange: string;
  /** Raw customer instruction — new replacement information. */
  newInfo: string;
  /** Customer must accept recreation limits before render. */
  acceptRecreationLimits: true;
  /** Redesign always fails closed — must remain false. */
  redesignRequested: false;
  lockedPackageMemberCount: 1;
  plannedMembers: readonly RmJ007PlannedMember[];
  fulfillmentMode: "recreation";
  label: string;
};

export type RmJ007ArtifactRef = {
  role: string;
  relativePath: string;
  contentSha256: string;
};

export type RmJ007MemberResult = {
  memberId: RmJ007MemberId;
  kind: RmJ007MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId: string;
  producerQaOk: boolean;
  artifacts: readonly RmJ007ArtifactRef[];
  plateHonestyNote?: string;
};

export type RmJ007PackageIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: typeof DESIGN_RENDERER_RM_J007_SKU;
  businessName: string;
  itemIdentity: string;
  packageRenderVersion: number;
  lockedPackageMemberCount: 1;
  plannedMembers: readonly RmJ007PlannedMember[];
  members: readonly RmJ007MemberResult[];
  packageFingerprint: string;
  packageQaOk: boolean;
  manifestRelativePath: string;
  identityRelativePath: string;
  changeRequestRelativePath: string;
  orchestratorVersion: string;
  ownerRoutine: "NONE";
  canvaUsed: false;
  remapAuthorized: true;
  fulfillmentMode: "recreation";
  acceptRecreationLimits: true;
  redesignRequested: false;
  createdAt: string;
};

export type RmJ007OutputMode = "proof" | "dispatch";

export type RmJ007PackagePipelineResult =
  | {
      ok: true;
      verdict: "RM_J007_UPDATE_PROOF_PASS" | "ALREADY_RENDERED";
      invocationOutcome?: "RENDERED" | "ALREADY_RENDERED";
      identity: RmJ007PackageIdentity;
      outputMode: RmJ007OutputMode;
    }
  | {
      ok: false;
      verdict: "RM_J007_UPDATE_PROOF_FAIL";
      failureCode:
        | "MISSING_REFERENCE"
        | "UNSUPPORTED_REFERENCE_MIME"
        | "REDESIGN_REQUESTED"
        | "MISSING_BOUNDED_CHANGES"
        | "MISSING_ACCEPTANCE"
        | "BUSINESS_NAME_MISSING"
        | "ITEM_IDENTITY_MISSING"
        | "MEMBERSHIP_MISMATCH"
        | "PLATE_MISMATCH"
        | "PACKAGE_QA_FAIL"
        | "DESIGN_QA_FAIL"
        | "CAPTURE_FAIL";
      message: string;
      outputMode: RmJ007OutputMode;
    };
