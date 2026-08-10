import type { ServiceId } from "@/catalog/types";
import type { StudioFileReference, StudioFileStorageReference } from "@/lib/file-registry/types";

export type MaterialCategory =
  | "logo-brand"
  | "photo-video"
  | "document-reference"
  | "url-link"
  | "access-instructions"
  | "factual-confirmation"
  | "other";

export type MaterialRequirementLevel = "required" | "optional";

export type MaterialReviewStatus =
  | "missing"
  | "requested"
  | "submitted"
  | "needs_clarification"
  | "approved_for_use"
  | "not_needed"
  /** Genuine gray-area — Owner/policy judgment required. */
  | "owner_policy_review"
  /** Hard stop — must not enter production input. */
  | "blocked_from_use";

export type MaterialContentKind = "file-metadata" | "url" | "text" | "confirmation";

export type MaterialUploadStatus = "none" | "metadata_only" | "pending_upload" | "stored";

export type MaterialSubmittedBy = {
  role: "client" | "owner" | "staff";
  userId: string;
  displayName?: string;
};

export type CampaignMaterialItem = {
  id: string;
  category: MaterialCategory;
  requirementLevel: MaterialRequirementLevel;
  reviewStatus: MaterialReviewStatus;
  contentKind: MaterialContentKind;
  label: string;
  reason: string;
  relatedServiceIds: readonly ServiceId[];
  /** Linked exception when promoted from File Room (Slice 3d-c). */
  sourceExceptionId?: string;
  promotionApprovedAt?: string;
  clientFacingLabel?: string;
  clientFacingPrompt?: string;
  whyNeeded?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  text?: string;
  clientAvailability?: "not_available_yet";
  confirmedAt?: string;
  submittedBy?: MaterialSubmittedBy;
  submittedAt?: string;
  reviewedBy?: MaterialSubmittedBy;
  reviewedAt?: string;
  teamNote?: string;
  storageRef?: StudioFileStorageReference | null;
  /** Reference-only registry entries for client-supplied material files scoped by client/campaign/job. */
  fileRegistryRefs?: readonly StudioFileReference[];
  uploadStatus: MaterialUploadStatus;
  /**
   * Operational use authorization basis (attestation / Studio source).
   * Not a claim of legal certainty.
   */
  useAuthorization?: {
    basis:
      | "customer_owns"
      | "customer_has_permission"
      | "studio_generated"
      | "studio_controlled_licensed"
      | "provider_licensed";
    attestedAt: string;
    attestedBy?: MaterialSubmittedBy;
    statement?: string;
  };
  /** Explicit hold overlay when status alone is insufficient. */
  useHold?: "owner_policy_review" | "blocked_from_use" | null;
  /** Durable last material-use decision — survives session loss with the materials ledger. */
  useDecision?: {
    decisionId: string;
    outcome:
      | "APPROVED_FOR_USE"
      | "CLARIFICATION_REQUIRED"
      | "OWNER_POLICY_REVIEW"
      | "BLOCKED_FROM_USE";
    authorizationBasis:
      | "customer_owns"
      | "customer_has_permission"
      | "studio_generated"
      | "studio_controlled_licensed"
      | "provider_licensed"
      | null;
    /** Fingerprint of fileName/url/text/size/mime/storage at decision time. */
    contentFingerprint: string;
    packageId: string;
    schemaVersion: number;
    evaluatedAt: string;
    customerPrompt: string | null;
    escalationTarget: "none" | "owner_policy";
    reasons: readonly string[];
  };
};

export type CampaignMaterialsRecord = {
  campaignId: string;
  items: CampaignMaterialItem[];
  updatedAt: string;
  version: number;
};

export type ServerMaterialsEnvelope = CampaignMaterialsRecord & {
  syncedAt: string;
};

/** Resolved from frozen approved plan — used to seed the materials ledger. */
export type MaterialSlotDefinition = {
  category: MaterialCategory;
  label: string;
  reason: string;
  requirementLevel: MaterialRequirementLevel;
  relatedServiceIds: readonly ServiceId[];
};
