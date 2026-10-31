import {
  missingSupabaseStorageEnvKeys,
  resolveSupabaseStorageEnv,
  SupabaseStorageConfigurationError,
} from "@/lib/file-storage/supabase";
import { createFsFileRoomStorageAdapter } from "@/lib/file-storage/fs-adapter";
import { createSupabaseStorageAdapter } from "@/lib/file-storage/supabase";
import type { FileRoomStorageAdapter } from "@/lib/file-storage/types";
import { createServerSupabaseStorageClient } from "@/lib/supabase/server";
import { applyStudioPersistenceTestSupabaseEnvToProcess } from "@/lib/studio-durable-persistence/test-storage-target-verify";

function applyPreviewPersistenceTestStorageEnv(): void {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv !== "preview" && vercelEnv !== "development") return;
  applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
}

export function createServerFileRoomStorageAdapter(): FileRoomStorageAdapter {
  applyPreviewPersistenceTestStorageEnv();
  const env = resolveSupabaseStorageEnv();
  const missing = missingSupabaseStorageEnvKeys(env);
  if (missing.length === 0) {
    return createSupabaseStorageAdapter({
      env,
      client: createServerSupabaseStorageClient(env),
    });
  }
  if (process.env.NODE_ENV === "production") {
    throw new SupabaseStorageConfigurationError(missing);
  }
  return createFsFileRoomStorageAdapter();
}
