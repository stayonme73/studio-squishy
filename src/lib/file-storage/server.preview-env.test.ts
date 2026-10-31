import { afterEach, describe, expect, it } from "vitest";

import { resolveSupabaseStorageEnv } from "@/lib/file-storage/supabase";
import { applyStudioPersistenceTestSupabaseEnvToProcess } from "@/lib/studio-durable-persistence/test-storage-target-verify";

describe("Preview File Room storage env", () => {
  const prior = { ...process.env };

  afterEach(() => {
    process.env = { ...prior };
  });

  it("maps Persistence Test Supabase on VERCEL_ENV=preview", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    process.env.SUPABASE_STORAGE_BUCKET = "";
    process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_URL = "https://testref.supabase.co";
    process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET = "studio-files-test";
    process.env.STUDIO_PERSISTENCE_TEST_PROJECT_REF = "testref";
    process.env.STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF = "productionref";

    applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
    const env = resolveSupabaseStorageEnv();
    expect(env.supabaseUrl).toBe("https://testref.supabase.co");
    expect(env.supabaseStorageBucket).toBe("studio-files-test");
  });
});
