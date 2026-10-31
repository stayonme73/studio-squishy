/**
 * Autonomous dispatch proof (DO worker + Machine chunk orchestration).
 * Does not run manual production scripts — only POST /run-chunk chain.
 *
 * Usage:
 *   node scripts/hosted-clip-droplet-autonomous-dispatch-proof-v2.mjs [workerBaseUrl] [campaignId]
 *
 * workerBaseUrl: http://127.0.0.1:8787 (SSH tunnel) or http://68.183.142.179:8787 if exposed
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerBase = (process.argv[2]?.trim() ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const clipIds = ["c-55-423", "c-17-127", "c-82-641"];
const MAX_CHUNK_STEPS = Number(process.argv[4] ?? 32);
const STEP_PAUSE_MS = Number(process.argv[5] ?? 3000);

function loadEnvFile(envPath) {
  if (!envPath) return;
  try {
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
  } catch {
    // ignore
  }
}

const workerEnvPath =
  process.env.STUDIO_HOSTED_CLIP_WORKER_ENV?.trim() ?? "/home/studioadmin/studio/worker.env";
loadEnvFile(workerEnvPath);
loadEnvLocal(repoRoot);
const internal = process.env.HOSTED_CERT_INTERNAL_CHUNK_KEY?.trim();
if (!internal) {
  console.error(
    "Missing HOSTED_CERT_INTERNAL_CHUNK_KEY (set in .env.local or worker.env via install-remote-env).",
  );
  process.exit(2);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSpendSha256(clipId) {
  const { campaignArtifactStoragePrefix } = await import(
    "../src/lib/campaign-design-artifacts/paths.ts"
  );
  const supabaseUrl = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_URL?.trim();
  const serviceKey = process.env.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET?.trim();
  const objectPath = `${campaignArtifactStoragePrefix(campaignId)}clip-factory/clips/${clipId}/spend.json`;
  const url = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return { clipId, ok: false, status: res.status };
  const json = JSON.parse(await res.text());
  return { clipId, ok: true, outputSha256: json.outputSha256 ?? null, approvedCta: json.approvedCta ?? null };
}

async function setMp4Proof() {
  const r = spawnSync("node", ["scripts/hosted-clip-set-mp4-proof-1.mjs", campaignId], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { ok: false, stdout: r.stdout?.slice(0, 500) };
  }
}

const RUN_CHUNK_TIMEOUT_MS = Number(process.env.HOSTED_CLIP_RUN_CHUNK_TIMEOUT_MS ?? 900_000);

async function runChunk(body) {
  const res = await fetch(`${workerBase}/run-chunk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hosted-cert-internal": internal,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(RUN_CHUNK_TIMEOUT_MS),
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { parseError: true, text: text.slice(0, 400) };
  }
  return { httpStatus: res.status, ...json };
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(repoRoot, "docs/launch/studio-hosted-production-team-readiness-1");
mkdirSync(outDir, { recursive: true });

const health = await fetch(`${workerBase}/health`).catch(() => null);
const healthOk = health?.ok === true;

const baselineProof = await setMp4Proof();
const baselineShas = {};
for (const clipId of clipIds) {
  baselineShas[clipId] = await fetchSpendSha256(clipId);
}

/** Machine dispatch entry (orchestrator only; launch-menu chain is optional second kick). */
const dispatchKick = await runChunk({
  campaignId,
  scheduleContinuation: false,
  finalizeLaunchMenu: false,
});

const chunkSteps = [dispatchKick];
let hookOk = dispatchKick.hookOk === true;
let lastStage = dispatchKick.stage ?? null;

for (let i = 1; i < MAX_CHUNK_STEPS && !hookOk; i += 1) {
  const prev = chunkSteps.at(-1);
  if (prev?.httpStatus !== 200) break;
  if (prev?.continue === false && prev?.hookOk !== true) break;
  if (prev?.skippedDueToLease) {
    await sleep(STEP_PAUSE_MS * 2);
  } else {
    await sleep(STEP_PAUSE_MS);
  }
  const next = await runChunk({
    campaignId,
    scheduleContinuation: false,
    finalizeLaunchMenu: false,
  });
  chunkSteps.push(next);
  hookOk = next.hookOk === true;
  lastStage = next.stage ?? lastStage;
  if (next.continue === false && hookOk) break;
}

const afterProof = await setMp4Proof();
const afterShas = {};
for (const clipId of clipIds) {
  afterShas[clipId] = await fetchSpendSha256(clipId);
}

const productionShasUnchanged = clipIds.every((id) => {
  const b = baselineShas[id]?.outputSha256;
  const a = afterShas[id]?.outputSha256;
  return b && a && b === a;
});

const threeOfThree =
  afterProof.allReadableProductionMp4 === true && afterProof.passCount === 3;

const ok =
  healthOk &&
  dispatchKick.httpStatus === 200 &&
  hookOk === true &&
  threeOfThree &&
  productionShasUnchanged;

const report = {
  ok,
  evidenceLabel: "DO_DISPATCH_AND_IDEMPOTENCY_NOT_AUTONOMOUS_PRODUCTION",
  evidenceScope: {
    proved: [
      "DO worker reachable",
      "authenticated POST /run-chunk",
      "orchestrator recognizes terminal hook when job already complete",
      "3/3 production.mp4 SHAs unchanged when re-dispatched",
    ],
    notProved: [
      "unfinished Test job → first production.mp4 via dispatch chain alone",
      "Preview Vercel observer → HOSTED_CLIP_WORKER_URL → DO",
      "customer Quality / Review / delivery",
    ],
  },
  package: "AUTONOMOUS-DO-DISPATCH-PROOF-V2",
  campaignId,
  workerBase,
  healthOk,
  manualProductionScriptsUsed: false,
  dispatchBodyNote:
    "Bounded proof uses scheduleContinuation:false and finalizeLaunchMenu:false so POST /run-chunk proves orchestrator + hook truth without re-entering the full launch-menu observer (which can exceed HTTP timeouts). Production Machine kick still uses finalizeLaunchMenu:true.",
  dispatchKick: {
    httpStatus: dispatchKick.httpStatus,
    stage: dispatchKick.stage,
    continue: dispatchKick.continue,
    hookOk: dispatchKick.hookOk,
    message: dispatchKick.message,
    failureCode: dispatchKick.failureCode ?? null,
  },
  chunkStepCount: chunkSteps.length,
  chunkSteps: chunkSteps.map((s) => ({
    httpStatus: s.httpStatus,
    stage: s.stage,
    continue: s.continue,
    hookOk: s.hookOk,
    message: s.message,
    failureCode: s.failureCode ?? null,
    skippedDueToLease: s.skippedDueToLease ?? false,
  })),
  lastStage,
  hookOk,
  baselineProof: {
    passCount: baselineProof.passCount,
    allReadableProductionMp4: baselineProof.allReadableProductionMp4,
  },
  afterProof: {
    passCount: afterProof.passCount,
    allReadableProductionMp4: afterProof.allReadableProductionMp4,
  },
  productionShasUnchanged,
  baselineShas,
  afterShas,
  passCriteria: {
    workerHealth: healthOk,
    dispatchHttp200: dispatchKick.httpStatus === 200,
    orchestratorHookOk: hookOk,
    threeOfThreeReadable: threeOfThree,
    noProductionRegeneration: productionShasUnchanged,
  },
  blocker: ok
    ? null
    : !healthOk
      ? "worker_health_unreachable"
      : dispatchKick.httpStatus !== 200
        ? "dispatch_kick_failed"
        : !hookOk
          ? "hook_not_ok"
          : !threeOfThree
            ? "three_of_three_lost"
            : !productionShasUnchanged
              ? "production_sha_changed"
              : "unknown",
};

const outPath = path.join(outDir, `HOSTED-CLIP-DO-AUTONOMOUS-DISPATCH-PROOF-${stamp}.json`);
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
process.exit(ok ? 0 : 5);
