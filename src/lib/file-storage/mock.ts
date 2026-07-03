import { buildFileRoomPrivateObjectPath, storageVisibilityStateForCategory } from "./paths";
import { createSupabasePrivateStorageRef } from "./supabase";
import type {
  FileRoomStorageAdapter,
  FileRoomStorageDownloadResult,
  FileRoomStorageObject,
  FileRoomStorageUploadRequest,
} from "./types";

export function createMockFileRoomStorageAdapter(bucket = "studio-files-test"): FileRoomStorageAdapter {
  const objects = new Map<string, FileRoomStorageDownloadResult>();

  return {
    provider: "mock_storage",
    bucket,
    buildObjectPath: buildFileRoomPrivateObjectPath,
    createStorageRef(scope, metadata) {
      return createSupabasePrivateStorageRef({ bucket, scope, metadata });
    },
    async uploadObject(request: FileRoomStorageUploadRequest): Promise<FileRoomStorageObject> {
      const objectPath = buildFileRoomPrivateObjectPath(request.scope, request.metadata);
      objects.set(objectPath, {
        body: request.body,
        contentType: request.metadata.contentType,
        sizeBytes: request.metadata.sizeBytes,
      });

      return {
        ...request.scope,
        ...request.metadata,
        provider: "mock_storage",
        bucket,
        objectPath,
        visibilityState: storageVisibilityStateForCategory(request.scope.category),
      };
    },
    async downloadObject(request) {
      if (request.storageRef.provider !== "supabase_storage") {
        throw new Error("Mock storage can only resolve private object refs.");
      }
      const stored = objects.get(request.storageRef.objectPath);
      if (!stored) throw new Error("Mock storage object not found.");
      return stored;
    },
  };
}
