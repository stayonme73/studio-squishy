/**
 * STUDIO-OPERATING-DESIGN-RM-J008-PROOF-1 — Profile Update Kit types.
 * Contract authority: CONTRACT-TRUTH-1 (Owner accepted) · DELTA B.
 */

import type { RmJ002Platform } from "./rm-j002-types";
import {
  RM_J002_AVATAR_PLATE,
  RM_J002_FACEBOOK_COVER_PLATE,
} from "./rm-j002-types";

export const DESIGN_RENDERER_RM_J008_SKU = "rm-j008" as const;

export const RM_J008_KIT_SPEC_VERSION = "rm-j008-kit-spec-1.0.0" as const;
export const RM_J008_KIT_ORCHESTRATOR_VERSION =
  "rm-j008-kit-orchestrator-1.0.0" as const;

/** Customer-facing change-sheet / checklist wording revision (visual-product gate). */
export const RM_J008_CHANGE_SHEET_PRESENTATION_VERSION =
  "v1.2-unchanged-checklist-no-upload-contradiction" as const;

export type RmJ008Platform = RmJ002Platform;

export type RmJ008MemberKind =
  | "copy"
  | "field_map_package"
  | "design_avatar"
  | "design_page_cover";

/** After-state recipe ids inherit rm-j002; change sheet is update-only. */
export type RmJ008MemberId =
  | "bio_about_copy"
  | "bio_profile_copy"
  | "field_map_checklist"
  | "profile_image"
  | "page_cover"
  | "before_after_change_sheet";

export type RmJ008PlannedKitMember = {
  memberId: RmJ008MemberId;
  kind: RmJ008MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId?: string;
};

/** Customer-supplied before-state only — never live scrape / login readback. */
export type RmJ008BeforeState = {
  source: "customer_supplied";
  displayName: string;
  /** Current bio/about text, or explicit blank sentinel. */
  bioOrAbout: string;
  /** Current URL, or explicit "none". */
  website: string;
  /** Current phone, or explicit "none". */
  phone: string;
  /** Description / screenshot ref for current avatar. */
  profileImageNote: string;
  /** Facebook only — current Page cover note, or "none". */
  pageCoverNote?: string;
};

/**
 * Approved after-state facts. Design CHANGED/UNCHANGED is frozen by explicit
 * actions (not artifact hashes).
 */
export type RmJ008AfterState = {
  businessName: string;
  displayName: string;
  profileGoal: string;
  updateIntentNotes: string;
  website: string;
  phone: string;
  brandNotes: string;
  /** Avatar always reissued; action drives change-sheet status only. */
  avatarAction: "reissue_unchanged" | "replace";
  /** Facebook: cover always reissued. IG/TT: not_applicable. */
  coverAction: "reissue_unchanged" | "replace" | "not_applicable";
};

export type RmJ008UpdateKitProjectTruth = {
  skuId: typeof DESIGN_RENDERER_RM_J008_SKU;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  platform: RmJ008Platform;
  lockedKitMemberCount: 4 | 5;
  plannedKitMembers: readonly RmJ008PlannedKitMember[];
  before: RmJ008BeforeState;
  after: RmJ008AfterState;
  customerControlsExistingProfile: true;
  label: string;
  credentialsPresent: false;
  mutationRequested: false;
  /** If true, composition must fail closed (bio-only / partial recipe). */
  partialKitRequested: false;
  logoMaterial?: {
    materialId: string;
    relativePath: string;
    contentSha256: string;
  };
};

export type RmJ008ChangeStatus = "CHANGED" | "UNCHANGED" | "NOT_APPLICABLE";

export type RmJ008ChangeSheetRow = {
  fieldId: string;
  fieldLabel: string;
  beforeValue: string;
  afterValue: string;
  status: RmJ008ChangeStatus;
  memberId?: RmJ008MemberId;
  note: string;
};

export type RmJ008ArtifactRef = {
  role: string;
  relativePath: string;
  contentSha256: string;
};

export type RmJ008MemberResult = {
  memberId: RmJ008MemberId;
  kind: RmJ008MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId?: string;
  producerQaOk: boolean;
  artifacts: readonly RmJ008ArtifactRef[];
  plateHonestyNote?: string;
  changeStatus?: RmJ008ChangeStatus;
};

export type RmJ008KitIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: typeof DESIGN_RENDERER_RM_J008_SKU;
  platform: RmJ008Platform;
  kitRenderVersion: number;
  lockedKitMemberCount: 4 | 5;
  plannedKitMembers: readonly RmJ008PlannedKitMember[];
  members: readonly RmJ008MemberResult[];
  kitFingerprint: string;
  kitQaOk: boolean;
  manifestRelativePath: string;
  identityRelativePath: string;
  orchestratorVersion: typeof RM_J008_KIT_ORCHESTRATOR_VERSION;
  ownerRoutine: "NONE";
  canvaUsed: false;
  accountMutation: false;
  beforeStateSource: "customer_supplied";
  createdAt: string;
};

export type RmJ008OutputMode = "proof" | "customer";

export type RmJ008KitPipelineResult =
  | {
      ok: true;
      verdict: "RM_J008_KIT_COMPOSER_PROOF_PASS" | "ALREADY_RENDERED";
      invocationOutcome: "RENDERED" | "ALREADY_RENDERED";
      identity: RmJ008KitIdentity;
      outputMode: RmJ008OutputMode;
      changeSheetRows: readonly RmJ008ChangeSheetRow[];
    }
  | {
      ok: false;
      verdict: "RM_J008_KIT_COMPOSER_PROOF_FAIL";
      failureCode:
        | "WRONG_SKU"
        | "UNSUPPORTED_PLATFORM"
        | "UNSUPPORTED_USE"
        | "MEMBERSHIP_MISMATCH"
        | "BEFORE_STATE_INVALID"
        | "PARTIAL_KIT_FORBIDDEN"
        | "CREDENTIALS_FORBIDDEN"
        | "MUTATION_FORBIDDEN"
        | "COPY_QA_FAIL"
        | "FIELD_MAP_QA_FAIL"
        | "DESIGN_QA_FAIL"
        | "CHANGE_SHEET_QA_FAIL"
        | "KIT_QA_FAIL"
        | "INCOMPLETE_KIT";
      message: string;
      outputMode: RmJ008OutputMode;
    };

export { RM_J002_AVATAR_PLATE, RM_J002_FACEBOOK_COVER_PLATE };
