import { isSupabasePrivateStorageRef } from "@/lib/file-registry/job-files";
import type { StudioFileStorageReference } from "@/lib/file-registry/types";

export type FileRoomClientAccessPurpose = "proof" | "download";

export function fileRoomFileAccessPath(
  fileId: string,
  purpose: FileRoomClientAccessPurpose = "download",
): string {
  return `/api/file-room/files/${encodeURIComponent(fileId)}/${purpose}`;
}

export function resolveClientFacingFileHref(input: {
  registryFileId?: string;
  url?: string;
  storageRef?: StudioFileStorageReference;
  purpose?: FileRoomClientAccessPurpose;
}): string {
  if (input.storageRef && isSupabasePrivateStorageRef(input.storageRef)) {
    if (!input.registryFileId) return "";
    return fileRoomFileAccessPath(input.registryFileId, input.purpose);
  }

  return input.url?.trim() ?? "";
}
