/**
 * STUDIO-OPERATING-DESIGN-RM-J002-PROOF-1 — Profile Setup Kit types.
 * Contract authority: CONTRACT-TRUTH-1 (Owner accepted).
 */

export const DESIGN_RENDERER_RM_J002_SKU = "rm-j002" as const;

export const RM_J002_KIT_SPEC_VERSION = "rm-j002-kit-spec-1.0.0" as const;
export const RM_J002_KIT_ORCHESTRATOR_VERSION =
  "rm-j002-kit-orchestrator-1.0.0" as const;

/**
 * Avatar visual revision (Owner visual gate).
 * v1 = wordmark + "Profile photo" (FAIL visual quality).
 * v2 = Harbor & Oak anchor mark primary · no production labels in PNG.
 * v2.1 = a11y mark label without business wordmark string on proof path.
 */
export const RM_J002_AVATAR_VISUAL_VERSION =
  "v2.1-brand-mark-primary" as const;

/**
 * Facebook cover visual revision (Owner visual gate).
 * v1 = artwork + production annotations baked into PNG.
 * v2 = customer artwork only — guidance lives in field-map/checklist.
 */
export const RM_J002_COVER_VISUAL_VERSION =
  "v2-customer-artwork-clean" as const;

/**
 * Customer-facing copy + checklist presentation revision (Owner product gate).
 * v1 = assignment-echo copy · identical IG/TT · bracket placeholders.
 * v2 = business-voice copy · platform-tailored · plain customer checklist wording.
 */
export const RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION =
  "v2.1-customer-voice-platform-tailored" as const;

export type RmJ002Platform = "facebook" | "instagram" | "tiktok";

export type RmJ002MemberKind =
  | "copy"
  | "field_map_package"
  | "design_avatar"
  | "design_page_cover";

export type RmJ002MemberId =
  | "bio_about_copy"
  | "bio_profile_copy"
  | "field_map_checklist"
  | "profile_image"
  | "page_cover";

/** Studio render plate — distinct from platform crop/safe-area behavior. */
export const RM_J002_AVATAR_PLATE = {
  plateId: "profile-avatar-square",
  widthPx: 1024,
  heightPx: 1024,
  aspect: "1:1",
  note:
    "Studio render canvas 1024×1024. Platforms crop to a circle — corner pixels are not guaranteed visible. Safe zone = centered content.",
} as const;

export const RM_J002_FACEBOOK_COVER_PLATE = {
  plateId: "facebook-page-cover-851x315",
  widthPx: 851,
  heightPx: 315,
  aspect: "~2.7:1",
  note:
    "Studio render canvas 851×315 (Meta fastest-load Page cover reference). Desktop/mobile crop differently; profile picture overlaps lower-left — not every pixel is guaranteed visible on every device.",
} as const;

export type RmJ002PlannedKitMember = {
  memberId: RmJ002MemberId;
  kind: RmJ002MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId?: string;
};

export type RmJ002KitProjectTruth = {
  skuId: typeof DESIGN_RENDERER_RM_J002_SKU;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  /** Locked before payment — one platform only. */
  platform: RmJ002Platform;
  lockedKitMemberCount: 3 | 4;
  plannedKitMembers: readonly RmJ002PlannedKitMember[];
  businessName: string;
  /** Customer facts feeding Studio-written scoped copy. */
  profileGoal: string;
  currentProfileNotes: string;
  website?: string;
  phone?: string;
  displayName?: string;
  brandNotes?: string;
  label: string;
  /** Proof must never set credentials — kit delivery only. */
  credentialsPresent: false;
  mutationRequested: false;
  /**
   * Approved logo material for avatar (customer dispatch).
   * Proof path may omit and use Harbor fixture staging.
   */
  logoMaterial?: {
    materialId: string;
    relativePath: string;
    contentSha256: string;
  };
};

export type RmJ002ArtifactRef = {
  role: string;
  relativePath: string;
  contentSha256: string;
};

export type RmJ002MemberResult = {
  memberId: RmJ002MemberId;
  kind: RmJ002MemberKind;
  order: number;
  memberPurpose: string;
  agreedPlateId?: string;
  producerQaOk: boolean;
  artifacts: readonly RmJ002ArtifactRef[];
  /** Plate vs platform crop honesty for design members. */
  plateHonestyNote?: string;
};

export type RmJ002KitIdentity = {
  packageId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: typeof DESIGN_RENDERER_RM_J002_SKU;
  platform: RmJ002Platform;
  kitRenderVersion: number;
  lockedKitMemberCount: 3 | 4;
  plannedKitMembers: readonly RmJ002PlannedKitMember[];
  members: readonly RmJ002MemberResult[];
  kitFingerprint: string;
  kitQaOk: boolean;
  manifestRelativePath: string;
  identityRelativePath: string;
  orchestratorVersion: typeof RM_J002_KIT_ORCHESTRATOR_VERSION;
  ownerRoutine: "NONE";
  canvaUsed: false;
  accountMutation: false;
  createdAt: string;
};

export type RmJ002OutputMode = "proof" | "customer";

export type RmJ002KitPipelineResult =
  | {
      ok: true;
      verdict: "RM_J002_KIT_COMPOSER_PROOF_PASS" | "ALREADY_RENDERED";
      invocationOutcome: "RENDERED" | "ALREADY_RENDERED";
      identity: RmJ002KitIdentity;
      outputMode: RmJ002OutputMode;
    }
  | {
      ok: false;
      verdict: "RM_J002_KIT_COMPOSER_PROOF_FAIL";
      failureCode:
        | "WRONG_SKU"
        | "UNSUPPORTED_PLATFORM"
        | "UNSUPPORTED_USE"
        | "MEMBERSHIP_MISMATCH"
        | "PLATFORM_LOCK_VIOLATION"
        | "CREDENTIALS_FORBIDDEN"
        | "MUTATION_FORBIDDEN"
        | "COPY_QA_FAIL"
        | "FIELD_MAP_QA_FAIL"
        | "DESIGN_QA_FAIL"
        | "KIT_QA_FAIL"
        | "INCOMPLETE_KIT";
      message: string;
      outputMode: RmJ002OutputMode;
      identity?: RmJ002KitIdentity;
    };
