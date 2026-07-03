export type StudioFileCategory =
  | "client_material"
  | "internal_draft"
  | "review_proof"
  | "final_delivery"
  | "internal_only_source";

export type StudioFileVisibility = "internal_only" | "client_visible";

export type StudioFileStatus =
  | "draft"
  | "approved_for_review"
  | "approved_for_release"
  | "released"
  | "superseded";

export type StudioFileActor = {
  role: "owner" | "staff" | "client" | "system";
  userId?: string;
  displayName?: string;
};

export type StudioFileStorageReference = {
  provider: "google_shared_drive";
  connectionStatus: "reference_only";
  referenceKind: "manual_link" | "manual_reference" | "path_hint";
  reference: string;
  displayLabel?: string;
  note?: string;
};

export type StudioFileReference = {
  id: string;
  clientId: string;
  campaignId: string;
  jobId: string;
  category: StudioFileCategory;
  filename: string;
  fileType: string;
  storageRef: StudioFileStorageReference;
  visibility: StudioFileVisibility;
  versionLabel: string;
  status: StudioFileStatus;
  addedBy: StudioFileActor;
  addedAt: string;
  updatedAt?: string;
  visibilityChangedAt?: string;
  versionUpdatedAt?: string;
  releasedAt?: string;
  deliverableKey?: string;
  deliverableLabel?: string;
  sourceMaterialId?: string;
};

export type StudioFileClientScope = {
  clientId: string;
  campaignId: string;
  jobId?: string;
};
