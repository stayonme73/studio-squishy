/**
 * STUDIO-PRELAUNCH-INFRASTRUCTURE-COMPLETION-1 — Storage preflight (no secret logging).
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const PERSISTENCE_ENV_KEYS = new Set([
  "STUDIO_PERSISTENCE_TEST_DATABASE_URL",
  "STUDIO_PERSISTENCE_TEST_PROJECT_REF",
  "STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF",
  "STUDIO_PERSISTENCE_TEST_SUPABASE_URL",
  "STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY",
  "STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET",
]);

function loadEnvLocal(repoRoot: string): void {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!PERSISTENCE_ENV_KEYS.has(key)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, "..");
  loadEnvLocal(repoRoot);

  const requiredStorageKeys = [
    "STUDIO_PERSISTENCE_TEST_SUPABASE_URL",
    "STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY",
    "STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET",
  ] as const;

  for (const key of requiredStorageKeys) {
    const present = Boolean(process.env[key]?.trim());
    console.log(`${key}: ${present ? "set" : "MISSING"}`);
    if (!present) process.exit(2);
  }

  const bucket = process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET!.trim();
  console.log(`STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET name: ${bucket}`);

  const { verifyStudioPersistenceTestTarget } = await import(
    "../src/lib/studio-durable-persistence/test-target-verify"
  );
  const dbVerification = verifyStudioPersistenceTestTarget(process.env);
  if (!dbVerification.ok) {
    console.error(`Database target: FAIL — ${dbVerification.reason}`);
    process.exit(2);
  }
  console.log(`Database target: OK (ref ${dbVerification.projectRef}).`);

  const { verifyStudioPersistenceTestStorageTarget, resolveTestSupabaseStorageEnv } =
    await import("../src/lib/studio-durable-persistence/test-storage-target-verify");
  const storageVerification = verifyStudioPersistenceTestStorageTarget(process.env);
  if (!storageVerification.ok) {
    console.error(`Storage target: FAIL — ${storageVerification.reason}`);
    process.exit(2);
  }
  console.log(`Storage target: OK (ref ${storageVerification.projectRef}).`);

  if (dbVerification.projectRef !== storageVerification.projectRef) {
    console.error("Database and Storage project refs do not match.");
    process.exit(2);
  }

  const env = resolveTestSupabaseStorageEnv(process.env);
  if (!env) {
    console.error("resolveTestSupabaseStorageEnv returned null.");
    process.exit(2);
  }

  const { createServerSupabaseStorageClient } = await import("../src/lib/supabase/server");
  const client = createServerSupabaseStorageClient({
    supabaseUrl: env.supabaseUrl,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
    supabaseStorageBucket: env.supabaseStorageBucket,
  });

  const visibility = await client.getBucketVisibility(bucket);
  if (visibility.public !== false) {
    console.error(
      `Bucket "${bucket}": FAIL — expected private (public=false), got public=${String(visibility.public)}`,
    );
    process.exit(2);
  }
  console.log(`Bucket "${bucket}": exists, private (public=false).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
