/**
 * Chain ONE dequeueAsync worker at a time until local-text-proof or production.mp4 exists.
 * Requires Preview deploy with resumable mux chunks (post cut-stall fix).
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
const argv = process.argv.slice(2);
const requireProduction = argv.includes("--require-production");
const positional = argv.filter((a) => !a.startsWith("--"));
const deploymentId = positional[0]?.trim();
const campaignId =
  positional[1]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const maxKicks = Number(positional[2] ?? 10);

function expectedClipCount(probeJson) {
  const ids = probeJson?.renderedClipIds;
  return Array.isArray(ids) && ids.length > 0 ? ids.length : 3;
}

function probeProductionSetComplete(probeJson) {
  const count = Number(probeJson?.productionMp4Count ?? 0);
  return count >= expectedClipCount(probeJson);
}

function chainGoalMet(inv, probeJson) {
  if (requireProduction) {
    if (probeJson) return probeProductionSetComplete(probeJson);
    return Boolean(inv.hasProductionMp4);
  }
  return Boolean(inv.hasProductionMp4 || inv.hasLocalProof);
}

if (!deploymentId?.startsWith("dpl_")) {
  console.error("Usage: node scripts/hosted-clip-mux-phase-chain-1.mjs <dpl_...> [campaignId] [maxKicks]");
  process.exit(2);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function durableSummary() {
  const r = spawnSync("node", ["scripts/hosted-clip-durable-burn-inventory-1.mjs", campaignId], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { ok: false, parseError: true };
  }
}

/** Ordered mux pipeline stages for diagnostics (first missing = next expected). */
function inferMuxPipelineStage(inv) {
  if (!inv?.ok) return { lastCompleted: "unknown", nextExpected: "inventory" };
  const paths = inv.paths ?? [];
  const has = (frag) => paths.some((p) => p.includes(frag));
  if (inv.hasProductionMp4 || has("production.mp4")) {
    return { lastCompleted: "production_mp4", nextExpected: null };
  }
  if (inv.hasLocalProof || has("local-text-proof.mp4")) {
    return { lastCompleted: "local_text_proof", nextExpected: "shotstack_production_mp4" };
  }
  if (has("end-card.mp4")) {
    return { lastCompleted: "end_card", nextExpected: "concat_local_text_proof" };
  }
  if (has("/burned.mp4") || paths.some((p) => p.endsWith("burn-work/burned.mp4"))) {
    return { lastCompleted: "caption_overlay_burned", nextExpected: "end_card" };
  }
  if (has("cut.mp4")) {
    return { lastCompleted: "cut", nextExpected: "caption_overlay_burned" };
  }
  if (inv.hasPaintedWords || has("painted-words.json")) {
    return { lastCompleted: "paint", nextExpected: "cut" };
  }
  return { lastCompleted: "none", nextExpected: "paint" };
}

function stageSnapshot(inv) {
  const stage = inferMuxPipelineStage(inv);
  return {
    hasPaintedWords: inv.hasPaintedWords,
    hasCut: (inv.paths ?? []).some((p) => p.includes("cut.mp4")),
    hasBurned: (inv.paths ?? []).some((p) => p.includes("burn-work/burned.mp4")),
    hasEndCard: (inv.paths ?? []).some((p) => p.includes("end-card.mp4")),
    hasLocalProof: inv.hasLocalProof,
    hasProductionMp4: inv.hasProductionMp4,
    ...stage,
  };
}

const tmpDir = path.join(repoRoot, ".tmp-mux-chain");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl } = createHostedVercelCurl({ repoRoot, deploymentId, tmpDir });

function probe() {
  const resp = vercelCurl(
    `/api/hosted-cert/clip-factory-progress-probe?campaignId=${encodeURIComponent(campaignId)}`,
  );
  return { http: resp.status, json: parseJsonBody(resp.bodyText) };
}

const report = {
  startedAt: new Date().toISOString(),
  deploymentId,
  campaignId,
  kicks: [],
  baseline: stageSnapshot(durableSummary()),
};

for (let i = 0; i < maxKicks; i++) {
  const inv = durableSummary();
  const snap = stageSnapshot(inv);
  report.kicks.push({ kind: "inventory_before", kick: i, ...snap });
  const probeBefore = probe();
  if (chainGoalMet(inv, probeBefore.json)) {
    report.finalStage = snap;
    report.probe = probeBefore.json;
    break;
  }

  let checkpointBeforeKick = null;
  while (true) {
    const p = probe();
    checkpointBeforeKick = p.json?.checkpointUpdatedAt ?? checkpointBeforeKick;
    if (!p.json?.checkpointLeaseActive) break;
    await sleep(15_000);
  }

  const kickStart = Date.now();
  const kick = vercelCurl("/api/hosted-cert/clip-production-chunk", {
    method: "POST",
    rawBody: JSON.stringify({
      campaignId,
      dequeueAsync: true,
      scheduleContinuation: false,
      finalizeLaunchMenu: false,
    }),
    headers: ["Content-Type: application/json"],
  });
  report.kicks.push({ kind: "dequeueAsync", kick: i, http: kick.status, json: parseJsonBody(kick.bodyText) });

  const deadline = Date.now() + 600_000;
  let sawLease = false;
  while (Date.now() < deadline) {
    await sleep(20_000);
    const p = probe();
    if (p.json?.checkpointLeaseActive) sawLease = true;
    if (sawLease && !p.json?.checkpointLeaseActive) break;
    const afterInv = durableSummary();
    if (chainGoalMet(afterInv, p.json)) break;
    if (
      !sawLease &&
      p.json?.checkpointUpdatedAt &&
      checkpointBeforeKick &&
      p.json.checkpointUpdatedAt !== checkpointBeforeKick &&
      Date.now() - kickStart > 90_000
    ) {
      break;
    }
  }

  const after = durableSummary();
  const afterSnap = stageSnapshot(after);
  report.kicks.push({ kind: "inventory_after", kick: i, ...afterSnap });
  const probeAfterKick = probe();
  if (chainGoalMet(after, probeAfterKick.json)) {
    report.finalStage = afterSnap;
    report.probe = probeAfterKick.json;
    break;
  }
}

report.finishedAt = new Date().toISOString();
const finalInv = durableSummary();
const finalProbe = probe();
report.finalStage = report.finalStage ?? stageSnapshot(finalInv);
report.probe = report.probe ?? finalProbe.json;
report.requireProduction = requireProduction;
report.productionMp4Count = finalProbe.json?.productionMp4Count ?? null;
report.expectedClipCount = expectedClipCount(finalProbe.json);
report.success = requireProduction
  ? probeProductionSetComplete(finalProbe.json)
  : finalInv.hasProductionMp4 === true || finalInv.hasLocalProof === true;

if (!report.success) {
  report.failure = {
    code: "MANDATORY_ARTIFACTS_MISSING",
    message: requireProduction
      ? `Not all clip production.mp4 durable (have ${report.productionMp4Count ?? 0}/${report.expectedClipCount}).`
      : "Neither local-text-proof.mp4 nor production.mp4 durable after phase chain.",
    lastCompletedStage: report.finalStage.lastCompleted,
    nextExpectedStage: report.finalStage.nextExpected,
  };
}

const out = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-MUX-PHASE-CHAIN-1-LATEST.json",
);
writeFileSync(out, JSON.stringify(report, null, 2));
console.log("Wrote", out);
console.log(JSON.stringify({ success: report.success, failure: report.failure, finalStage: report.finalStage }, null, 2));
process.exit(report.success ? 0 : 5);
