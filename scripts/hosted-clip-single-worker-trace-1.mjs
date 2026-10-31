/**
 * ONE worker: wait for lease clear → single sync chunk (no continuation) → probe + optional logs.
 * Usage: node scripts/hosted-clip-single-worker-trace-1.mjs <dpl_...> [campaignId]
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

import {
  createHostedVercelCurl,
  parseJsonBody,
} from "./lib/hosted-preview-vercel-curl.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";

if (!deploymentId?.startsWith("dpl_")) {
  console.error("Usage: node scripts/hosted-clip-single-worker-trace-1.mjs <dpl_...> [campaignId]");
  process.exit(2);
}

const tmpDir = path.join(repoRoot, ".tmp-single-worker-trace");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl } = createHostedVercelCurl({ repoRoot, deploymentId, tmpDir });

function probe() {
  const resp = vercelCurl(
    `/api/hosted-cert/clip-factory-progress-probe?campaignId=${encodeURIComponent(campaignId)}`,
  );
  return { http: resp.status, json: parseJsonBody(resp.bodyText), raw: resp.bodyText?.slice(0, 800) };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const report = {
  startedAt: new Date().toISOString(),
  deploymentId,
  campaignId,
  steps: [],
};

report.steps.push({ kind: "probe_initial", ...probe() });

const maxWaitMs = 200_000;
const leaseWaitStart = Date.now();
while (Date.now() - leaseWaitStart < maxWaitMs) {
  const p = probe();
  const lease = p.json?.checkpointLeaseActive === true;
  report.steps.push({ kind: "probe_wait_lease", lease, summary: summarizeProbe(p.json) });
  if (!lease) break;
  await sleep(15_000);
}

const beforeSync = probe();
report.steps.push({ kind: "probe_before_sync", ...beforeSync });
report.baseline = summarizeProbe(beforeSync.json);

if (beforeSync.json?.checkpointLeaseActive) {
  report.error = "lease_still_active_after_wait";
  finish(report);
  process.exit(4);
}

const mode = process.env.HOSTED_CLIP_WORKER_MODE === "sync" ? "sync" : "dequeueAsync";
const kickStart = Date.now();
const chunkResp = vercelCurl("/api/hosted-cert/clip-production-chunk", {
  method: "POST",
  rawBody: JSON.stringify({
    campaignId,
    dequeueAsync: mode === "dequeueAsync",
    scheduleContinuation: false,
    finalizeLaunchMenu: false,
  }),
  headers: ["Content-Type: application/json"],
  longRunning: mode === "sync",
});
report.workerMode = mode;
report.steps.push({
  kind: `${mode}_chunk`,
  http: chunkResp.status,
  spawnError: chunkResp.spawnError,
  elapsedMs: Date.now() - kickStart,
  json: parseJsonBody(chunkResp.bodyText),
  bodyPreview: chunkResp.bodyText?.slice(0, 1200),
});

const artifactWaitMs = mode === "dequeueAsync" ? 780_000 : 8_000;
const pollEveryMs = 30_000;
const artifactWaitStart = Date.now();
let sawLease = false;
while (Date.now() - artifactWaitStart < artifactWaitMs) {
  await sleep(pollEveryMs);
  const p = probe();
  if (p.json?.checkpointLeaseActive) sawLease = true;
  const summary = summarizeProbe(p.json);
  report.steps.push({ kind: "artifact_wait_poll", ...summary, lease: p.json?.checkpointLeaseActive });
  if ((summary.productionMp4Count ?? 0) >= 1 || (summary.localProofClipIds?.length ?? 0) >= 1) {
    report.artifactReached = true;
    break;
  }
  if (mode === "dequeueAsync" && sawLease && !p.json?.checkpointLeaseActive) {
    report.leaseCycleComplete = true;
  }
}
report.steps.push({ kind: "probe_after_worker", ...probe() });

const logs = spawnSync(
  "npx",
  ["vercel", "logs", deploymentId, "--limit", "40"],
  { cwd: repoRoot, encoding: "utf8", shell: true, timeout: 120_000 },
);
report.vercelLogsTail = (logs.stdout || logs.stderr || "").slice(-8000);

report.finishedAt = new Date().toISOString();
finish(report);

function summarizeProbe(json) {
  if (!json) return null;
  return {
    checkpointUpdatedAt: json.checkpointUpdatedAt,
    checkpointStage: json.checkpointStage,
    checkpointNextRenderIndex: json.checkpointNextRenderIndex,
    leaseActive: json.checkpointLeaseActive,
    productionMp4Count: json.productionMp4Count,
    audioFinishedClipIds: json.audioFinishedClipIds,
    paintedWordsClipIds: json.paintedWordsClipIds,
    localProofClipIds: json.localProofClipIds ?? [],
    paintedWordsClipIds: json.paintedWordsClipIds ?? [],
    completed: json.checkpointCompletedClipCount,
  };
}

function finish(report) {
  const outPath = path.join(
    repoRoot,
    "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-SINGLE-WORKER-TRACE-1-LATEST.json",
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("Wrote", outPath);
  console.log(JSON.stringify(report.baseline, null, 2));
  console.log(
    "sync:",
    report.steps.find((s) => s.kind === "sync_chunk")?.json ??
      report.steps.find((s) => s.kind === "sync_chunk")?.spawnError,
  );
  console.log("after:", summarizeProbe(report.steps.find((s) => s.kind === "probe_after_sync")?.json));
}
