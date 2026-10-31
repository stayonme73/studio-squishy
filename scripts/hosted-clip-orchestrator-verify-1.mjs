/**
 * Verify resumable clip orchestrator gates on Preview.
 * Usage: node scripts/hosted-clip-orchestrator-verify-1.mjs <dpl_...> [campaignId] [--driver-only|--auto-only]
 */
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

import {
  createHostedVercelCurl,
  parseJsonBody,
} from "./lib/hosted-preview-vercel-curl.mjs";
import {
  loadEnvLocal,
  requireHostedCertTestPassword,
} from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const campaignId =
  process.argv.find((a) => a.startsWith("disposable-")) ??
  "disposable-hpt-cert-clip_repurposing-6a31a13c";
const mode = process.argv.includes("--driver-only")
  ? "driver"
  : process.argv.includes("--auto-only")
    ? "auto"
    : "both";

if (!deploymentId?.startsWith("dpl_")) {
  console.error(
    "Usage: node scripts/hosted-clip-orchestrator-verify-1.mjs <dpl_...> [campaignId] [--driver-only|--auto-only]",
  );
  process.exit(2);
}

loadEnvLocal(repoRoot);
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const TEST_PASSWORD = requireHostedCertTestPassword();
const tmpDir = path.join(repoRoot, ".tmp-orchestrator-verify");
const { vercelCurl } = createHostedVercelCurl({ repoRoot, deploymentId, tmpDir });
const jar = path.join(tmpDir, "owner.cookies.txt");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function observerSnapshot() {
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [
    campaignId,
  ]);
  await c.end();
  let env = r.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  const lmo = env?.record?.dispatchExecution?.launchMenuProductionObserver ?? {};
  const hit = (lmo.results ?? []).find((x) => x.skuId === "v2-rtu-clip-repurposing");
  return {
    observedAt: lmo.observedAt ?? null,
    message: hit?.message ?? null,
    hookOk: hit?.ok === true,
    clipFileCount: hit?.clipFiles?.length ?? 0,
  };
}

async function progressProbe() {
  const r = vercelCurl(
    `/api/hosted-cert/clip-factory-progress-probe?campaignId=${encodeURIComponent(campaignId)}`,
    { jar },
  );
  return parseJsonBody(r.bodyText);
}

const login = vercelCurl("/api/auth/login", {
  method: "POST",
  jar,
  body: { email: "hpt-cert-clip_repurposing-2d52e67f@example.com", password: TEST_PASSWORD },
});
if (login.status !== 200) {
  console.log(JSON.stringify({ ok: false, gate: "login", status: login.status }));
  process.exit(3);
}

const report = { deploymentId, campaignId, mode, gates: {} };

if (mode === "driver" || mode === "both") {
  const steps = [];
  for (let i = 0; i < 12; i++) {
    const resp = vercelCurl("/api/hosted-cert/clip-production-chunk", {
      method: "POST",
      jar,
      rawBody: JSON.stringify({ campaignId, finalizeLaunchMenu: true }),
      headers: ["Content-Type: application/json"],
      longRunning: true,
    });
    const json = parseJsonBody(resp.bodyText);
    const prog = await progressProbe();
    steps.push({
      step: i + 1,
      http: resp.status,
      stage: json?.stage,
      hookOk: json?.hookOk,
      message: json?.message,
      renders: prog?.factorySpend?.renders ?? null,
      setFiles: prog?.setResultFileCount ?? 0,
    });
    if (json?.hookOk === true) break;
    if (json?.failureCode && json?.continue === false) break;
  }
  report.gates.explicitDriver = {
    pass: steps.some((s) => s.hookOk === true),
    steps,
  };
}

if (mode === "auto" || mode === "both") {
  const baseline = await observerSnapshot();
  const baselineProg = await progressProbe();
  const kick = vercelCurl(
    `/api/hosted-cert/continue-paid-intake-chain?scope=launch-menu-only&mode=sync`,
    {
      method: "POST",
      jar,
      rawBody: JSON.stringify({ campaignId }),
      headers: ["Content-Type: application/json"],
      longRunning: true,
    },
  );
  const polls = [];
  let events = 0;
  let lastObs = baseline.observedAt;
  let lastMsg = baseline.message;
  let lastRenders = baselineProg?.factorySpend?.renders ?? 0;
  let lastMp4 = baselineProg?.productionMp4Count ?? 0;
  const splitPhases = baselineProg?.previewRenderSplitPhases ?? [];
  const started = Date.now();
  const AUTO_POLL_MS = 2_700_000;
  while (Date.now() - started < AUTO_POLL_MS) {
    await sleep(45_000);
    const obs = await observerSnapshot();
    const prog = await progressProbe();
    const renders = prog?.factorySpend?.renders ?? 0;
    const mp4 = prog?.productionMp4Count ?? 0;
    if (
      obs.observedAt !== lastObs ||
      obs.message !== lastMsg ||
      renders > lastRenders ||
      mp4 > lastMp4
    ) {
      events += 1;
      lastObs = obs.observedAt;
      lastMsg = obs.message;
      lastRenders = renders;
      lastMp4 = mp4;
    }
    polls.push({
      elapsedMs: Date.now() - started,
      obs,
      renders,
      mp4,
      checkpointStage: prog?.checkpointStage,
      setFiles: prog?.setResultFileCount ?? 0,
    });
    const finalObs = await observerSnapshot();
    if (finalObs.hookOk && finalObs.clipFileCount >= 1) break;
    if ((prog?.setResultFileCount ?? 0) >= 1) break;
    if (mp4 >= 3) break;
    if ((prog?.setResultFileCount ?? 0) >= 3) break;
  }
  const finalProg = await progressProbe();
  const finalObs = await observerSnapshot();
  const sawSplitPhaseMsg = polls.some((p) =>
    /local_audio|local_paint|local_mux|Shotstack|Clip rendered/i.test(p.obs?.message ?? ""),
  );
  report.gates.autonomousContinuation = {
    kickHttp: kick.status,
    previewRenderSplitPhases: splitPhases,
    progressEvents: events,
    sawSplitPhaseMsg,
    productionMp4Count: finalProg?.productionMp4Count ?? 0,
    setResultFileCount: finalProg?.setResultFileCount ?? 0,
    hookOk: finalObs.hookOk,
    pass:
      splitPhases.includes("local_audio") &&
      events >= 2 &&
      sawSplitPhaseMsg &&
      ((finalObs.hookOk && finalObs.clipFileCount >= 1) ||
        (finalProg?.productionMp4Count ?? 0) >= 1 ||
        (finalProg?.setResultFileCount ?? 0) >= 1),
    polls: polls.slice(-12),
  };
}

report.ok =
  (mode !== "driver" || report.gates.explicitDriver?.pass === true) &&
  (mode !== "auto" || report.gates.autonomousContinuation?.pass === true);

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 5);
