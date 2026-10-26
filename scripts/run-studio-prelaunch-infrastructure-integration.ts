/**
 * STUDIO-PRELAUNCH-INFRASTRUCTURE-COMPLETION-1
 * Applies persistence schemas (including assignments) and runs Phase A/B integration tests.
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";

const PERSISTENCE_ENV_KEYS = new Set([
  "STUDIO_PERSISTENCE_TEST_DATABASE_URL",
  "STUDIO_PERSISTENCE_TEST_PROJECT_REF",
  "STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF",
  "STUDIO_PERSISTENCE_BACKEND",
  "DATABASE_URL",
  "STUDIO_DATABASE_URL",
  "SUPABASE_DB_URL",
  "STUDIO_PERSISTENCE_TEST_SUPABASE_URL",
  "STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY",
  "STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "SESSION_SECRET",
]);

function loadEnvLocal(repoRoot: string): boolean {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return false;
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
  return true;
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, "..");
  loadEnvLocal(repoRoot);

  const { verifyStudioPersistenceTestTarget } = await import(
    "../src/lib/studio-durable-persistence/test-target-verify"
  );
  const dbVerification = verifyStudioPersistenceTestTarget(process.env);
  if (!dbVerification.ok) {
    console.error(`Database target verification failed: ${dbVerification.reason}`);
    process.exit(2);
  }
  console.log(`Database target: OK (ref ${dbVerification.projectRef}).`);

  const { verifyStudioPersistenceTestStorageTarget } = await import(
    "../src/lib/studio-durable-persistence/test-storage-target-verify"
  );
  const { applyStudioPersistenceTestSupabaseEnvToProcess } = await import(
    "../src/lib/studio-durable-persistence/test-storage-target-verify"
  );
  const storageVerification = verifyStudioPersistenceTestStorageTarget(process.env);
  if (storageVerification.ok) {
    applyStudioPersistenceTestSupabaseEnvToProcess(process.env);
    console.log(`Storage target: OK (ref ${storageVerification.projectRef}).`);
  } else {
    console.log(`Storage target: SKIP — ${storageVerification.reason}`);
  }

  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  process.env.SESSION_SECRET =
    process.env.SESSION_SECRET ?? "test-prelaunch-integration-session-secret";

  const { applyLocalPersistenceSchemasFromFile } = await import(
    "../src/lib/studio-durable-persistence/schema-apply"
  );
  console.log("Applying foundation schemas…");
  await applyLocalPersistenceSchemasFromFile();

  const vitest = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      "--no-file-parallelism",
      "src/lib/studio-durable-persistence/studio-prelaunch-infrastructure-phase-a-integration.test.ts",
      "src/lib/studio-durable-persistence/studio-prelaunch-infrastructure-phase-b-delivery-integration.test.ts",
    ],
    {
      cwd: repoRoot,
      env: { ...process.env },
      stdio: "inherit",
      shell: true,
    },
  );

  process.exit(vitest.status === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
