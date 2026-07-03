import type { StudioFileCategory, StudioFileStorageVisibilityState } from "@/lib/file-registry/types";

import type { FileRoomObjectMetadata, FileRoomObjectScope } from "./types";

const CATEGORY_VISIBILITY: Record<StudioFileCategory, StudioFileStorageVisibilityState> = {
  client_material: "internal-only",
  internal_draft: "internal-only",
  internal_only_source: "internal-only",
  review_proof: "review-proof",
  final_delivery: "client-final",
};

export function storageVisibilityStateForCategory(
  category: StudioFileCategory,
): StudioFileStorageVisibilityState {
  return CATEGORY_VISIBILITY[category];
}

export function safeStoragePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._=-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return sanitized || "untitled";
}

export function buildFileRoomPrivateObjectPath(
  scope: FileRoomObjectScope,
  metadata: FileRoomObjectMetadata,
): string {
  const version = safeStoragePathSegment(metadata.versionLabel ?? "v1");
  const filename = safeStoragePathSegment(metadata.filename);

  return [
    "clients",
    safeStoragePathSegment(scope.clientId),
    "campaigns",
    safeStoragePathSegment(scope.campaignId),
    "jobs",
    safeStoragePathSegment(scope.jobId),
    safeStoragePathSegment(scope.category),
    version,
    filename,
  ].join("/");
}
