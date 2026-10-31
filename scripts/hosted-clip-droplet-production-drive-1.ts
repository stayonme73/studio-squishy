/**
 * DigitalOcean clip worker — controlled production drive (Test Supabase only).
 * Reuses Machine orchestration; no Vercel serverless FFmpeg.
 *
 * Usage (on verified droplet):
 *   STUDIO_HOSTED_CLIP_WORKER=1 npx tsx scripts/hosted-clip-droplet-production-drive-1.ts [campaignId] [maxSteps]
 *
 * Env: /etc/studio/worker.env (default) or repo `.env.local` on desk — never commit secrets.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import { runHostedClipProductionStep } from "@/lib/studio-hosted-cert/hosted-clip-production-orchestrator";

const PRODUCTION_DB_REF = "txgzguzlojlhndkbncc";
const TEST_DB_REF = "tzyglhypseyokhbeozjw";

const campaignId =
  process.argv[2]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const maxSteps = Number(process.argv[3] ?? 48);
const wallClockMs = Number(process.argv[4] ?? 4 * 60 * 60 * 1000);

function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    process.env[key] ??= t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

function assertTestTargetOnly(): void {
  const urls = [
    process.env.DATABASE_URL,
    process.env.STUDIO_DATABASE_URL,
    process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL,
    process.env.SUPABASE_DB_URL,
  ]
    .filter(Boolean)
    .join(" ");
  if (urls.includes(PRODUCTION_DB_REF)) {
    throw new Error("Refusing Production Supabase ref on clip worker.");
  }
  const ref = process.env.STUDIO_PERSISTENCE_TEST_PROJECT_REF?.trim();
  if (ref && ref !== TEST_DB_REF) {
    throw new Error(`Unexpected STUDIO_PERSISTENCE_TEST_PROJECT_REF: ${ref}`);
  }
}

function bootstrapEnv(): void {
  const workerEnv =
    process.env.STUDIO_HOSTED_CLIP_WORKER_ENV?.trim() ?? "/home/studioadmin/studio/worker.env";
  loadEnvFile(workerEnv);
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  process.env.STUDIO_HOSTED_CLIP_WORKER = "1";
  process.env.STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE = "1";
  process.env.STUDIO_PERSISTENCE_BACKEND ??= "postgres";
  process.env.DATABASE_URL ??= process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("Missing Test DATABASE_URL / STUDIO_PERSISTENCE_TEST_DATABASE_URL.");
  }
  assertTestTargetOnly();
}

async function main(): Promise<void> {
  bootstrapEnv();
  const startedAt = Date.now();
  const outDir = path.join(process.cwd(), "docs/launch/studio-hosted-production-team-readiness-1");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const envelope = await readCampaignEnvelope(campaignId);
  const dispatch = envelope?.record.dispatchExecution;
  const record = dispatch?.records?.find((r) => r.skuId === "v2-rtu-clip-repurposing");
  if (!envelope?.record || !record?.executionIdentityReady) {
    throw new Error("no_dispatch_record");
  }

  let lastStage = "prepare";
  let lastMessage = "";
  let hookOk = false;
  let failureCode: string | null = null;
  let steps = 0;
  let continueFlag = true;

  while (continueFlag && steps < maxSteps && Date.now() - startedAt < wallClockMs) {
    steps += 1;
    const step = await withCampaignArtifactProductionWorkspace(campaignId, (repoRoot) =>
      runHostedClipProductionStep({
        repoRoot,
        campaign: envelope.record,
        dispatchRecord: record,
      }),
    );
    lastStage = step.stage;
    lastMessage = step.message;
    failureCode =
      step.failureCode ??
      (step.hookResult && !step.hookResult.ok ? step.hookResult.failureCode : null) ??
      failureCode;
    if (step.skippedDueToLease) {
      await new Promise((r) => setTimeout(r, 15_000));
      continue;
    }
    if (step.hookResult?.ok) {
      hookOk = true;
      break;
    }
    continueFlag = step.continue;
  }

  const report = {
    ok: hookOk,
    campaignId,
    steps,
    lastStage,
    lastMessage,
    hookOk,
    failureCode: hookOk ? null : failureCode,
    elapsedMs: Date.now() - startedAt,
    worker: "hosted-clip-droplet-production-drive-1",
    at: new Date().toISOString(),
  };

  const outPath = path.join(outDir, `HOSTED-CLIP-DO-PRODUCTION-DRIVE-${stamp}.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
  process.exit(report.ok ? 0 : 5);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(5);
});
