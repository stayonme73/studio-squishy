import { createSupabaseStorageAdapter } from "@/lib/file-storage/supabase";
import type { FileRoomStorageAdapter } from "@/lib/file-storage/types";
import { createServerSupabaseStorageClient } from "@/lib/supabase/server";

export function createServerFileRoomStorageAdapter(): FileRoomStorageAdapter {
  return createSupabaseStorageAdapter({
    client: createServerSupabaseStorageClient(),
  });
}
