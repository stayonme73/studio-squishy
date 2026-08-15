import { promises as fs } from "fs";
import path from "path";

import { createSupabasePrivateStorageRef } from "@/lib/file-storage/supabase";
import { buildFileRoomPrivateObjectPath, storageVisibilityStateForCategory } from "@/lib/file-storage/paths";
import type {
  FileRoomStorageAdapter,
  FileRoomStorageDownloadResult,
  FileRoomStorageObject,
  FileRoomStorageUploadRequest,
} from "@/lib/file-storage/types";

const ROOT = path.join(process.cwd(), "data", "file-room-objects");

async function bodyToBuffer(
  body: FileRoomStorageUploadRequest["body"],
): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  if (typeof File !== "undefined" && body instanceof File) {
    return Buffer.from(await body.arrayBuffer());
  }
  throw new Error("Unsupported upload body.");
}

/**
 * Durable private objects on disk when cloud storage is not configured.
 * Same path layout as File Room. Not a second product store.
 */
export function createFsFileRoomStorageAdapter(
  bucket = "studio-files-local",
): FileRoomStorageAdapter {
  return {
    provider: "mock_storage",
    bucket,
    buildObjectPath: buildFileRoomPrivateObjectPath,
    createStorageRef(scope, metadata) {
      return createSupabasePrivateStorageRef({ bucket, scope, metadata });
    },
    async uploadObject(request: FileRoomStorageUploadRequest): Promise<FileRoomStorageObject> {
      const objectPath = buildFileRoomPrivateObjectPath(request.scope, request.metadata);
      const abs = path.join(ROOT, ...objectPath.split("/"));
      await fs.mkdir(path.dirname(abs), { recursive: true });
      const buffer = await bodyToBuffer(request.body);
      await fs.writeFile(abs, buffer);
      return {
        ...request.scope,
        ...request.metadata,
        provider: "mock_storage",
        bucket,
        objectPath,
        visibilityState: storageVisibilityStateForCategory(request.scope.category),
        sizeBytes: buffer.byteLength,
      };
    },
    async downloadObject(request) {
      if (request.storageRef.provider !== "supabase_storage") {
        throw new Error("Local File Room storage can only resolve private object refs.");
      }
      const abs = path.join(ROOT, ...request.storageRef.objectPath.split("/"));
      const buffer = await fs.readFile(abs);
      const result: FileRoomStorageDownloadResult = {
        body: buffer,
        contentType: request.storageRef.contentType,
        sizeBytes: buffer.byteLength,
      };
      return result;
    },
  };
}
