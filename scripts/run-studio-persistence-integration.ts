/**
 * STUDIO-DURABLE-PERSISTENCE-INTEGRATION-1
 * Loads test-only env from .env.local, verifies Supabase target, applies foundation schema, runs Vitest.
 * Never prints secret values.
 *
 *   npx tsx scripts/run-studio-persistence-integration.ts
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
]);

function loadPersistenceEnvLocal(repoRoot: string): boolean {
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
  const loaded = loadPersistenceEnvLocal(repoRoot);
  if (!loaded) {
    console.error("No .env.local found — add test-only persistence variables there.");
    process.exit(2);
  }

  const { verifyStudioPersistenceTestTarget } = await import(
    "../src/lib/studio-durable-persistence/test-target-verify"
  );
  const verification = verifyStudioPersistenceTestTarget(process.env);
  if (!verification.ok) {
    console.error(`Target verification failed: ${verification.reason}`);
    process.exit(2);
  }
  console.log(`Target verification: OK (project ref ${verification.projectRef}).`);

  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;

  const { applyLocalPersistenceSchemasFromFile } = await import(
    "../src/lib/studio-durable-persistence/schema-apply"
  );
  console.log("Applying foundation schemas to test database…");
  await applyLocalPersistenceSchemasFromFile();
  console.log("Foundation schema apply: complete.");

  const vitest = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      "--no-file-parallelism",
      "src/lib/studio-durable-persistence/studio-durable-persistence.test.ts",
      "src/lib/studio-durable-persistence/studio-durable-persistence-integration-2.test.ts",
      "src/lib/studio-durable-persistence/studio-durable-persistence-users-claim-integration.test.ts",
      "src/lib/studio-durable-persistence/studio-durable-persistence-comms-life-integration.test.ts",
      "src/lib/studio-durable-persistence/studio-durable-persistence-comms-atomicity-integration.test.ts",
      "src/lib/studio-durable-persistence/studio-durable-persistence-activity-production-integration.test.ts",
      "src/lib/studio-durable-persistence/studio-durable-persistence-end-to-end-integration.test.ts",
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        STUDIO_PERSISTENCE_TEST_DATABASE_URL: process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL,
      },
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
