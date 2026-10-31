/**
 * Worker-side Machine orchestrator proof (no manual bounded production scripts).
 * Drives runHostedClipProductionUntilIdle on DO — same code path as POST /run-chunk body.
 *
 * Usage on droplet:
 *   STUDIO_HOSTED_CLIP_WORKER=1 npx tsx scripts/hosted-clip-droplet-orchestrator-inprocess-proof-1.ts [campaignId]
 */
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import {
  readHostedClipProductionCheckpoint,
  type HostedClipProductionCheckpoint,
} from "@/lib/studio-hosted-cert/clip-production-checkpoint";
import {
  runHostedClipProductionUntilIdle,
  type HostedClipProductionStepResult,
} from "@/lib/studio-hosted-cert/hosted-clip-production-orchestrator";

const PRODUCTION_DB_REF = "txgzguzlojlhndkbncc";
const TEST_DB_REF = "tzyglhypseyokhbeozjw";
const campaignId =
  process.argv[2]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipIds = ["c-55-423", "c-17-127", "c-82-641"];
const MAX_STEPS = Number(process.argv[3] ?? 32);

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

function bootstrapEnv(): void {
  loadEnvFile(
    process.env.STUDIO_HOSTED_CLIP_WORKER_ENV?.trim() ?? "/home/studioadmin/studio/worker.env",
  );
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  process.env.STUDIO_HOSTED_CLIP_WORKER = "1";
  process.env.STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE = "1";
  process.env.STUDIO_PERSISTENCE_BACKEND ??= "postgres";
  process.env.DATABASE_URL ??= process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
  delete process.env.VERCEL_ENV;
  const urls = [process.env.DATABASE_URL, process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL]
    .filter(Boolean)
    .join(" ");
  if (urls.includes(PRODUCTION_DB_REF)) {
    throw new Error("Refusing Production Supabase ref.");
  }
  const ref = process.env.STUDIO_PERSISTENCE_TEST_PROJECT_REF?.trim();
  if (ref && ref !== TEST_DB_REF) {
    throw new Error(`Unexpected test project ref: ${ref}`);
  }
}

function spendSha256(repoRoot: string, clipId: string): string | null {
  const spendAbs = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    campaignId,
    "clip-factory/clips",
    clipId,
    "spend.json",
  );
  if (!existsSync(spendAbs)) return null;
  try {
    const spend = JSON.parse(readFileSync(spendAbs, "utf8")) as { outputSha256?: string };
    return spend.outputSha256?.trim() ?? null;
  } catch {
    return null;
  }
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

  let baselineShas: Record<string, string | null> = {};
  const run: { orchestratorResult: HostedClipProductionStepResult | null } = {
    orchestratorResult: null,
  };
  const checkpoints: {
    before: HostedClipProductionCheckpoint | null;
    after: HostedClipProductionCheckpoint | null;
  } = { before: null, after: null };

  await withCampaignArtifactProductionWorkspace(campaignId, async (repoRoot) => {
    checkpoints.before = readHostedClipProductionCheckpoint(repoRoot, campaignId);
    for (const clipId of clipIds) {
      baselineShas[clipId] = spendSha256(repoRoot, clipId);
    }
    run.orchestratorResult = await runHostedClipProductionUntilIdle({
      repoRoot,
      campaign: envelope.record,
      dispatchRecord: record,
      maxSteps: MAX_STEPS,
    });
    checkpoints.after = readHostedClipProductionCheckpoint(repoRoot, campaignId);
  });

  const afterShas: Record<string, string | null> = {};
  await withCampaignArtifactProductionWorkspace(campaignId, async (repoRoot) => {
    for (const clipId of clipIds) {
      afterShas[clipId] = spendSha256(repoRoot, clipId);
    }
  });

  const productionShasUnchanged = clipIds.every((id) => {
    const b = baselineShas[id];
    const a = afterShas[id];
    return b && a && b === a;
  });

  const orchestratorResult = run.orchestratorResult;
  const hookOk = orchestratorResult?.hookResult?.ok === true;
  const ok = hookOk && productionShasUnchanged;

  const report = {
    ok,
    package: "DO-ORCHESTRATOR-INPROCESS-PROOF",
    note: "Same orchestrator as POST /run-chunk; HTTP dispatch auth requires HOSTED_CERT_INTERNAL_CHUNK_KEY on worker.env + caller.",
    campaignId,
    maxSteps: MAX_STEPS,
    manualBoundedProductionScriptsUsed: false,
    orchestratorResult: {
      stage: orchestratorResult?.stage,
      continue: orchestratorResult?.continue,
      message: orchestratorResult?.message,
      failureCode: orchestratorResult?.failureCode ?? null,
      hookOk: orchestratorResult?.hookResult?.ok ?? null,
      invocationOutcome: orchestratorResult?.hookResult?.ok
        ? orchestratorResult.hookResult.invocationOutcome
        : null,
    },
    checkpointBefore: checkpoints.before
      ? {
          stage: checkpoints.before.stage,
          nextRenderIndex: checkpoints.before.nextRenderIndex,
          completedClipCount: checkpoints.before.completedClips?.length ?? 0,
        }
      : null,
    checkpointAfter: checkpoints.after
      ? {
          stage: checkpoints.after.stage,
          nextRenderIndex: checkpoints.after.nextRenderIndex,
          completedClipCount: checkpoints.after.completedClips?.length ?? 0,
        }
      : null,
    productionShasUnchanged,
    baselineShas,
    afterShas,
    totalElapsedMs: Date.now() - startedAt,
    blocker: ok ? null : !hookOk ? "hook_not_ok" : "production_sha_changed",
  };

  const outPath = path.join(
    outDir,
    `HOSTED-CLIP-DO-ORCHESTRATOR-INPROCESS-PROOF-${stamp}.json`,
  );
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
  process.exit(ok ? 0 : 5);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
