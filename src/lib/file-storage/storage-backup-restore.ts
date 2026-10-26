import { createHash } from "crypto";

import type { FileRoomStorageAdapter } from "./types";

export type StorageBackupSnapshot = {
  bucket: string;
  objectPath: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  body: Uint8Array;
};

export function checksumSha256(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

/** Download object bytes for test backup (isolated infrastructure only). */
export async function backupPrivateObject(input: {
  adapter: FileRoomStorageAdapter;
  storageRef: Extract<
    import("@/lib/file-registry/types").StudioFileStorageReference,
    { provider: "supabase_storage" }
  >;
}): Promise<StorageBackupSnapshot> {
  const downloaded = await input.adapter.downloadObject({ storageRef: input.storageRef });
  const body = new Uint8Array(downloaded.body);
  return {
    bucket: input.storageRef.bucket,
    objectPath: input.storageRef.objectPath,
    contentType: downloaded.contentType,
    sizeBytes: body.byteLength,
    checksumSha256: checksumSha256(body),
    body,
  };
}

/**
 * Restore by re-uploading to the same object path (recovery drill).
 * Caller must delete or overwrite per adapter semantics.
 */
export async function restorePrivateObjectFromBackup(input: {
  adapter: FileRoomStorageAdapter;
  snapshot: StorageBackupSnapshot;
  scope: import("./types").FileRoomObjectScope;
}): Promise<void> {
  await input.adapter.uploadObject({
    scope: input.scope,
    metadata: {
      filename: input.snapshot.objectPath.split("/").at(-1) ?? "restored.bin",
      contentType: input.snapshot.contentType,
      sizeBytes: input.snapshot.sizeBytes,
      checksumSha256: input.snapshot.checksumSha256,
      uploadedAt: new Date().toISOString(),
    },
    body: input.snapshot.body,
  });
}

export function snapshotsMatch(a: StorageBackupSnapshot, b: StorageBackupSnapshot): boolean {
  return a.checksumSha256 === b.checksumSha256 && a.sizeBytes === b.sizeBytes;
}
