import type { StudioFileStorageReference } from "@/lib/file-registry/types";

import { buildFileRoomPrivateObjectPath, storageVisibilityStateForCategory } from "./paths";
import type {
  FileRoomObjectMetadata,
  FileRoomObjectScope,
  FileRoomStorageAdapter,
  FileRoomStorageDownloadRequest,
  FileRoomStorageDownloadResult,
  FileRoomStorageObject,
  FileRoomStorageUploadRequest,
} from "./types";

export type SupabaseStorageEnv = {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseStorageBucket?: string;
};

export type SupabaseStorageClientLike = {
  uploadPrivateObject(request: {
    bucket: string;
    objectPath: string;
    body: FileRoomStorageUploadRequest["body"];
    contentType: string;
  }): Promise<{ objectVersion?: string }>;
  downloadPrivateObject(request: {
    bucket: string;
    objectPath: string;
  }): Promise<FileRoomStorageDownloadResult>;
};

export class SupabaseStorageConfigurationError extends Error {
  constructor(readonly missingKeys: readonly string[]) {
    super(`Supabase Storage is not configured. Missing: ${missingKeys.join(", ")}`);
    this.name = "SupabaseStorageConfigurationError";
  }
}

export function resolveSupabaseStorageEnv(
  source: Record<string, string | undefined> = process.env,
): SupabaseStorageEnv {
  const envValue = (key: string) => {
    const value = source[key]?.trim();
    if (!value) return undefined;
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  };
  return {
    supabaseUrl: envValue("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: envValue("SUPABASE_SERVICE_ROLE_KEY"),
    supabaseStorageBucket: envValue("SUPABASE_STORAGE_BUCKET"),
  };
}

export function missingSupabaseStorageEnvKeys(env: SupabaseStorageEnv): string[] {
  const entries: { key: string; value?: string }[] = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", value: env.supabaseUrl },
    { key: "SUPABASE_SERVICE_ROLE_KEY", value: env.supabaseServiceRoleKey },
    { key: "SUPABASE_STORAGE_BUCKET", value: env.supabaseStorageBucket },
  ];
  return entries.filter((entry) => !entry.value?.trim()).map((entry) => entry.key);
}

export function assertSupabaseStorageConfigured(env: SupabaseStorageEnv): asserts env is Required<SupabaseStorageEnv> {
  const missing = missingSupabaseStorageEnvKeys(env);
  if (missing.length > 0) throw new SupabaseStorageConfigurationError(missing);
}

export function createSupabasePrivateStorageRef(input: {
  bucket: string;
  scope: FileRoomObjectScope;
  metadata: FileRoomObjectMetadata;
  objectPath?: string;
  objectVersion?: string;
}): StudioFileStorageReference {
  const objectPath = input.objectPath ?? buildFileRoomPrivateObjectPath(input.scope, input.metadata);

  return {
    provider: "supabase_storage",
    connectionStatus: "private_object",
    bucket: input.bucket,
    objectPath,
    visibilityState: storageVisibilityStateForCategory(input.scope.category),
    originalFilename: input.metadata.filename.trim(),
    contentType: input.metadata.contentType.trim(),
    sizeBytes: input.metadata.sizeBytes,
    checksumSha256: input.metadata.checksumSha256,
    objectVersion: input.objectVersion,
    uploadedAt: input.metadata.uploadedAt,
    displayLabel: input.metadata.filename.trim(),
  };
}

export function createSupabaseStorageAdapter(input: {
  env?: SupabaseStorageEnv;
  client?: SupabaseStorageClientLike;
} = {}): FileRoomStorageAdapter {
  const storageEnv = input.env ?? resolveSupabaseStorageEnv();
  assertSupabaseStorageConfigured(storageEnv);

  if (!input.client) {
    throw new Error(
      "Supabase Storage client is not installed. Inject a server-only client after credentials are configured.",
    );
  }

  const bucket = storageEnv.supabaseStorageBucket;

  return {
    provider: "supabase_storage",
    bucket,
    buildObjectPath: buildFileRoomPrivateObjectPath,
    createStorageRef(scope, metadata) {
      return createSupabasePrivateStorageRef({ bucket, scope, metadata });
    },
    async uploadObject(request: FileRoomStorageUploadRequest): Promise<FileRoomStorageObject> {
      const objectPath = buildFileRoomPrivateObjectPath(request.scope, request.metadata);
      const result = await input.client!.uploadPrivateObject({
        bucket,
        objectPath,
        body: request.body,
        contentType: request.metadata.contentType,
      });

      return {
        ...request.scope,
        ...request.metadata,
        provider: "supabase_storage",
        bucket,
        objectPath,
        objectVersion: result.objectVersion,
        visibilityState: storageVisibilityStateForCategory(request.scope.category),
      };
    },
    async downloadObject(request: FileRoomStorageDownloadRequest) {
      if (request.storageRef.provider !== "supabase_storage") {
        throw new Error("Supabase adapter can only download private Supabase storage refs.");
      }
      return input.client!.downloadPrivateObject({
        bucket: request.storageRef.bucket,
        objectPath: request.storageRef.objectPath,
      });
    },
  };
}
