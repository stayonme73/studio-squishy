/**
 * STUDIO-DURABLE-PERSISTENCE-END-TO-END-1 — separate-process read probe.
 * Usage (Postgres env must be set by caller):
 *   npx tsx scripts/studio-persistence-e2e-state-probe.ts <campaignId>
 */
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

function loadPersistenceEnvLocal(repoRoot: string): void {
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
  const campaignId = process.argv[2]?.trim();
  if (!campaignId) {
    console.error("campaignId argument required");
    process.exit(2);
  }

  const repoRoot = path.resolve(__dirname, "..");
  loadPersistenceEnvLocal(repoRoot);
  process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
  process.env.DATABASE_URL = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;

  const { verifyStudioPersistenceTestTarget } = await import(
    "../src/lib/studio-durable-persistence/test-target-verify"
  );
  const verification = verifyStudioPersistenceTestTarget(process.env);
  if (!verification.ok) {
    console.error(`Target verification failed: ${verification.reason}`);
    process.exit(2);
  }

  const { readCampaignEnvelope } = await import("../src/lib/campaign-store/store");
  const { readTasksEnvelope } = await import("../src/lib/campaign-tasks/store");
  const { readProjectCommunicationEnvelope } = await import(
    "../src/lib/project-communication/store"
  );
  const { readProjectActivityEnvelope } = await import("../src/lib/project-activity/store");
  const { readProductionEnvelope } = await import("../src/lib/campaign-production/store");

  const campaign = await readCampaignEnvelope(campaignId);
  const tasks = await readTasksEnvelope(campaignId);
  const comms = await readProjectCommunicationEnvelope(campaignId);
  const activity = await readProjectActivityEnvelope(campaignId);
  const production = await readProductionEnvelope(campaignId);

  const ok =
    Boolean(campaign?.record.paymentReceivedAt) &&
    campaign?.record.postPayActivation?.status === "activated" &&
    Boolean(tasks?.jobRecords?.length) &&
    Boolean(comms?.messages.length) &&
    Boolean(activity?.requests.length) &&
    Boolean(production);

  console.log(
    JSON.stringify({
      ok,
      campaignId,
      paid: Boolean(campaign?.record.paymentReceivedAt),
      activation: campaign?.record.postPayActivation?.status ?? null,
      jobCount: tasks?.jobRecords?.length ?? 0,
      messageCount: comms?.messages.length ?? 0,
      activityRequests: activity?.requests.length ?? 0,
      hasProduction: Boolean(production),
    }),
  );

  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
