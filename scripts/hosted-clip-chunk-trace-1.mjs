/**
 * Quick Preview clip-chunk trace — no full resume cert.
 * Usage: node scripts/hosted-clip-chunk-trace-1.mjs <dpl_...> [campaignId]
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  createHostedVercelCurl,
  parseJsonBody,
} from "./lib/hosted-preview-vercel-curl.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";

if (!deploymentId?.startsWith("dpl_")) {
  console.error("Usage: node scripts/hosted-clip-chunk-trace-1.mjs <dpl_...> [campaignId]");
  process.exit(2);
}

const tmpDir = path.join(repoRoot, ".tmp-chunk-trace");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl } = createHostedVercelCurl({ repoRoot, deploymentId, tmpDir });

function probe() {
  const resp = vercelCurl(
    `/api/hosted-cert/clip-factory-progress-probe?campaignId=${encodeURIComponent(campaignId)}`,
  );
  return { http: resp.status, json: parseJsonBody(resp.bodyText) };
}

function postChunk(body) {
  const resp = vercelCurl("/api/hosted-cert/clip-production-chunk", {
    method: "POST",
    rawBody: JSON.stringify(body),
    headers: ["Content-Type: application/json"],
    longRunning: !body.dequeueAsync,
  });
  return { http: resp.status, json: parseJsonBody(resp.bodyText), spawnError: resp.spawnError };
}

const startedAt = new Date().toISOString();
const report = { startedAt, deploymentId, campaignId, steps: [] };

const beforeProbe = probe();
report.steps.push({ kind: "probe_before", ...beforeProbe });
const baselineUpdatedAt = beforeProbe.json?.checkpointUpdatedAt ?? null;

report.steps.push({
  kind: "dequeueAsync_kick",
  ...postChunk({
    campaignId,
    dequeueAsync: true,
    scheduleContinuation: true,
    finalizeLaunchMenu: true,
  }),
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

for (let i = 0; i < 8; i++) {
  await sleep(30_000);
  report.steps.push({ kind: `probe_poll_${i}`, ...probe() });
  const p = report.steps.at(-1)?.json;
  const updated = p?.checkpointUpdatedAt ?? null;
  const meaningful =
    (p?.productionMp4Count ?? 0) >= 1 ||
    (p?.checkpointCompletedClipCount ?? 0) >= 1 ||
    (updated && updated !== baselineUpdatedAt);
  if (meaningful) {
    report.meaningfulProgress = true;
    break;
  }
}

for (let k = 0; k < 6; k++) {
  report.steps.push({
    kind: `dequeueAsync_chain_${k}`,
    ...postChunk({
      campaignId,
      dequeueAsync: true,
      scheduleContinuation: true,
      finalizeLaunchMenu: false,
    }),
  });
  await sleep(45_000);
  const mid = probe();
  report.steps.push({ kind: `probe_mid_${k}`, ...mid });
  const p = mid.json;
  const updated = p?.checkpointUpdatedAt ?? null;
  if (
    (p?.productionMp4Count ?? 0) >= 1 ||
    (p?.checkpointCompletedClipCount ?? 0) >= 1 ||
    (updated && updated !== baselineUpdatedAt)
  ) {
    report.meaningfulProgress = true;
    break;
  }
}

report.steps.push({ kind: "probe_after", ...probe() });

report.finishedAt = new Date().toISOString();
const outPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-CHUNK-TRACE-1-LATEST.json",
);
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log("Wrote", outPath);
console.log(JSON.stringify(report.steps.map((s) => ({ kind: s.kind, http: s.http, json: s.json })), null, 2));
