/**
 * Drive resumable clip production chunks until hook completes or stall (Preview cert).
 * Usage: node scripts/hosted-clip-chunk-orchestrator-drive-1.mjs <dpl_...> [campaignId] [maxSteps]
 */
import path from "path";
import { fileURLToPath } from "url";

import {
  createHostedVercelCurl,
  parseJsonBody,
} from "./lib/hosted-preview-vercel-curl.mjs";
import pg from "pg";

import {
  loadEnvLocal,
  requireHostedCertTestPassword,
} from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const maxSteps = Number(process.argv[4] ?? 24);
const STALL_MS = 820_000;
const POLL_MS = 15_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

if (!deploymentId?.startsWith("dpl_")) {
  console.error(
    "Usage: node scripts/hosted-clip-chunk-orchestrator-drive-1.mjs <dpl_...> [campaignId] [maxSteps]",
  );
  process.exit(2);
}

loadEnvLocal(repoRoot);
const TEST_PASSWORD = requireHostedCertTestPassword();
const tmpDir = path.join(repoRoot, ".tmp-chunk-drive");
const { vercelCurl } = createHostedVercelCurl({ repoRoot, deploymentId, tmpDir });
const jar = path.join(tmpDir, "owner.cookies.txt");

const login = vercelCurl("/api/auth/login", {
  method: "POST",
  jar,
  body: {
    email: "hpt-cert-clip_repurposing-2d52e67f@example.com",
    password: TEST_PASSWORD,
  },
});
if (login.status !== 200) {
  console.error(JSON.stringify({ ok: false, stage: "login", status: login.status }));
  process.exit(3);
}

const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;

async function fetchProgressProbe() {
  const resp = vercelCurl(
    `/api/hosted-cert/clip-factory-progress-probe?campaignId=${encodeURIComponent(campaignId)}`,
    { jar },
  );
  return { http: resp.status, json: parseJsonBody(resp.bodyText) };
}

async function fetchObserverMessage() {
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [
    campaignId,
  ]);
  await c.end();
  let env = r.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  const hit = (env?.record?.dispatchExecution?.launchMenuProductionObserver?.results ?? [])
    .filter((x) => x.skuId === "v2-rtu-clip-repurposing" && x.action === "invoked")
    .at(-1);
  return hit?.message ?? null;
}

function progressSignature(probe) {
  const p = probe?.json ?? {};
  return JSON.stringify({
    renders: p.factorySpend?.renders,
    setResult: p.setResultFileCount,
    clipDirs: (p.renderedClipIds ?? []).slice().sort(),
    setShas: p.setResultShas ?? [],
  });
}

/** Wait for in-flight render (HTTP 0) or lease skip before firing another chunk. */
async function waitForInFlightWork(baselineSig) {
  const start = Date.now();
  let lastSig = baselineSig;
  let lastMsg = await fetchObserverMessage();
  while (Date.now() - start < STALL_MS) {
    await sleep(POLL_MS);
    const probe = await fetchProgressProbe();
    const sig = progressSignature(probe);
    const msg = await fetchObserverMessage();
    if (sig !== lastSig || (msg && msg !== lastMsg)) {
      console.log(
        JSON.stringify({
          wait: "progress",
          elapsedMs: Date.now() - start,
          observerMessage: msg,
          probe: probe.json,
        }),
      );
      return { progressed: true, probe: probe.json, message: msg };
    }
    lastSig = sig;
    lastMsg = msg;
  }
  return { progressed: false, reason: "FACTORY_STALL_NO_PROGRESS" };
}

const steps = [];
for (let i = 0; i < maxSteps; i++) {
  const beforeProbe = await fetchProgressProbe();
  const beforeSig = progressSignature(beforeProbe);

  const resp = vercelCurl("/api/hosted-cert/clip-production-chunk", {
    method: "POST",
    jar,
    rawBody: JSON.stringify({
      campaignId,
      finalizeLaunchMenu: true,
      scheduleContinuation: false,
    }),
    headers: ["Content-Type: application/json"],
    longRunning: true,
  });
  const json = parseJsonBody(resp.bodyText);
  const entry = { i, http: resp.status, ...json };
  steps.push(entry);
  console.log(JSON.stringify(entry));

  if (json?.hookOk === true) {
    console.log(JSON.stringify({ ok: true, steps: steps.length, hookOk: true }));
    process.exit(0);
  }
  if (json?.failureCode && json?.continue === false && !json?.hookOk) {
    console.log(JSON.stringify({ ok: false, steps: steps.length, last: json }));
    process.exit(5);
  }

  const needsWait =
    resp.status === 0 ||
    json?.skippedDueToLease === true ||
    (json?.continue === true &&
      json?.stage === "render" &&
      resp.status === 200 &&
      String(json?.message ?? "").includes("scheduled"));

  if (needsWait) {
    const wait = await waitForInFlightWork(beforeSig);
    if (!wait.progressed) {
      console.log(JSON.stringify({ ok: false, reason: wait.reason, steps: steps.length }));
      process.exit(5);
    }
    if (json?.hookOk === true || wait.probe?.hookReceiptOk === true) {
      const hookResp = vercelCurl("/api/hosted-cert/clip-production-chunk", {
        method: "POST",
        jar,
        rawBody: JSON.stringify({
          campaignId,
          finalizeLaunchMenu: true,
          scheduleContinuation: false,
        }),
        headers: ["Content-Type: application/json"],
        longRunning: true,
      });
      const hookJson = parseJsonBody(hookResp.bodyText);
      if (hookJson?.hookOk === true) {
        console.log(JSON.stringify({ ok: true, steps: steps.length, hookOk: true }));
        process.exit(0);
      }
    }
    continue;
  }

  if (resp.status !== 200) {
    console.log(JSON.stringify({ ok: false, steps: steps.length, http: resp.status, json }));
    process.exit(5);
  }
}

console.log(JSON.stringify({ ok: false, reason: "max_steps", steps: steps.length }));
process.exit(5);
