import {
  missingSupabaseStorageEnvKeys,
  resolveSupabaseStorageEnv,
  SupabaseStorageConfigurationError,
} from "@/lib/file-storage/supabase";
import { createFsFileRoomStorageAdapter } from "@/lib/file-storage/fs-adapter";
import { createSupabaseStorageAdapter } from "@/lib/file-storage/supabase";
import type { FileRoomStorageAdapter } from "@/lib/file-storage/types";
import { createServerSupabaseStorageClient } from "@/lib/supabase/server";

export function createServerFileRoomStorageAdapter(): FileRoomStorageAdapter {
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
