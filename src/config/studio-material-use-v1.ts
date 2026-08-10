/**
 * PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1
 *
 * Customer uploaded ≠ automatically cleared for commercial use.
 * Operational safeguard — not legal certainty.
 */

import type { MaterialCategory } from "@/lib/materials/types";

export const studioMaterialUseV1 = {
  packageId: "PRODUCTION-ASSURANCE-RIGHTS-APPROVED-FOR-USE-1",
  decisionSchemaVersion: 1,

  outcomes: {
    approvedForUse: "APPROVED_FOR_USE",
    clarificationRequired: "CLARIFICATION_REQUIRED",
    ownerPolicyReview: "OWNER_POLICY_REVIEW",
    blockedFromUse: "BLOCKED_FROM_USE",
  },

  /**
   * Categories that require rights/use clearance beyond mere submission.
   * Derived from active-22 materials taxonomy — not theoretical legal risk.
   * Music/audio and font *files* are not materials categories today.
   */
  clearanceRequiredCategories: [
    "logo-brand",
    "photo-video",
  ] as const satisfies readonly MaterialCategory[],

  /**
   * Active-menu category policy (pre-seal verified against final-active-sku-ledger).
   * Low-friction ≠ unexamined — each non-clearance path has an existing safeguard.
   */
  activeMenuCategoryPolicy: {
    customerWrittenTextCopy:
      "CLEARANCE_NOT_REQUIRED_EXISTING_SAFEGUARD — intake as factual-confirmation / document-reference; customer-authored text; Acceptance Review ownership attestation",
    logosTrademarksBrandAssets:
      "CLEARANCE_REQUIRED — logo-brand",
    customerPhotos:
      "CLEARANCE_REQUIRED — photo-video",
    customerVideoClips:
      "CLEARANCE_REQUIRED — photo-video",
    customerMusicAudio:
      "NOT_ACCEPTED_NOT_USED — no materials category; short-video musicAllowed=false / omit until rights certain; voice SKUs exclude music production",
    customerFonts:
      "NOT_ACCEPTED_NOT_USED — no font-file category; font language maps to logo-brand keyword or document-reference text notes only",
    customerDocumentsData:
      "CLEARANCE_NOT_REQUIRED_EXISTING_SAFEGUARD — document-reference / factual-confirmation; scripts/menus/facts; Acceptance Review + team review path",
    studioGeneratedCopyAssets:
      "CLEARANCE_NOT_REQUIRED_EXISTING_SAFEGUARD — studio_generated / studio_controlled_licensed / provider_licensed basis; no customer ownership attestation",
  } as const,

  routineClearanceAuthorization: "owner_independent" as const,

  customerCopy: {
    logoOwnership:
      "Do you own this logo, or do you have permission to use it for this project?",
    photoOwnership:
      "Is this photo or video yours, licensed for this use, or supplied with permission by the person or business shown?",
    brandPermission:
      "Do you have permission to use this trademark or brand asset for this project?",
    underReview: "We received this and are confirming it can be used for your project.",
  },

  staffCopy: {
    submittedNotCleared:
      "Material is submitted but not yet approved for Studio use.",
    clarificationPending: "Material needs a short customer clarification before use.",
    ownerPolicyPending: "Material needs Owner/policy review before use.",
    blocked: "Material is blocked from Studio use.",
    hardBlockSignal: "Material text indicates unauthorized or prohibited use.",
    contentReplaced:
      "Material content changed after the prior use decision — prior approval does not authorize the replacement.",
  },
} as const;

export type StudioMaterialUseOutcome =
  (typeof studioMaterialUseV1.outcomes)[keyof typeof studioMaterialUseV1.outcomes];

export type MaterialUseAuthorizationBasis =
  | "customer_owns"
  | "customer_has_permission"
  | "studio_generated"
  | "studio_controlled_licensed"
  | "provider_licensed";
