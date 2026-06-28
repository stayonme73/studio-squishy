import type { ServiceId } from "@/catalog/types";

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
  | "not_needed";

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
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  text?: string;
  confirmedAt?: string;
  submittedBy?: MaterialSubmittedBy;
  submittedAt?: string;
  reviewedBy?: MaterialSubmittedBy;
  reviewedAt?: string;
  teamNote?: string;
  storageRef?: null;
  uploadStatus: MaterialUploadStatus;
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
