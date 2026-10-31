/**
 * Step 1–2: one continue-paid-intake-chain wake + proof polls (no full resume cert).
 * Usage: node scripts/hosted-clip-controlled-wake-proof-1.mjs <dpl_...> [campaignId]
 */
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const PROOF_MS = 600_000;
const POLL_MS = 60_000;

if (!deploymentId?.startsWith("dpl_")) {
  console.error(
    "Usage: node scripts/hosted-clip-controlled-wake-proof-1.mjs <dpl_...> [campaignId]",
  );
  process.exit(2);
}

loadEnvLocal(repoRoot);
const TEST_PASSWORD = process.env.STUDIO_HOSTED_CERT_TEST_PASSWORD?.trim() ?? "";
const tmpDir = path.join(repoRoot, ".tmp-controlled-wake");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl } = createHostedVercelCurl({ repoRoot, deploymentId, tmpDir });
const jar = path.join(tmpDir, "owner.cookies.txt");
const startedAt = new Date().toISOString();
const ledger = [];

function log(stage, status, detail = "") {
  ledger.push({ stage, status, detail, at: new Date().toISOString() });
  console.log(`${status.padEnd(6)} ${stage}${detail ? ` — ${detail}` : ""}`);
}

function probe() {
  const resp = vercelCurl(
    `/api/hosted-cert/clip-factory-progress-probe?campaignId=${encodeURIComponent(campaignId)}`,
    { jar },
  );
  return { http: resp.status, json: parseJsonBody(resp.bodyText) };
}

function signature(j) {
  return JSON.stringify({
    updatedAt: j?.checkpointUpdatedAt,
    mp4: j?.productionMp4Count,
    completed: j?.checkpointCompletedClipCount,
    audio: (j?.audioFinishedClipIds ?? []).slice().sort(),
    painted: (j?.paintedWordsClipIds ?? []).slice().sort(),
    localProof: (j?.localProofClipIds ?? []).slice().sort(),
    set: j?.setResultFileCount,
    lease: j?.checkpointLeaseActive,
  });
}

if (TEST_PASSWORD) {
  const login = vercelCurl("/api/auth/login", {
    method: "POST",
    jar,
    body: {
      email: "hpt-cert-clip_repurposing-2d52e67f@example.com",
      password: TEST_PASSWORD,
    },
  });
  if (login.status !== 200) {
    log("owner-auth", "FAIL", `HTTP ${login.status}`);
    process.exit(3);
  }
  log("owner-auth", "PASS");
} else {
  log("owner-auth", "SKIP", "STUDIO_HOSTED_CERT_TEST_PASSWORD not configured");
}

const before = probe();
if (before.http !== 200 || before.json?.ok === false) {
  log("probe_before", "FAIL", before.json?.message ?? `HTTP ${before.http}`);
  process.exit(4);
}
const baselineSig = signature(before.json);
const baselineUpdatedAt = before.json?.checkpointUpdatedAt;
const baselineAudio = new Set(before.json?.audioFinishedClipIds ?? []);
const baselineMp4 = before.json?.productionMp4Count ?? 0;
const baselineCompleted = before.json?.checkpointCompletedClipCount ?? 0;
const baselineSet = before.json?.setResultFileCount ?? 0;
const baselinePainted = new Set(before.json?.paintedWordsClipIds ?? []);
const baselineLocalProof = new Set(before.json?.localProofClipIds ?? []);
log("probe_before", "PASS", baselineSig);

function artifactAdvanced(j) {
  if ((j?.productionMp4Count ?? 0) > baselineMp4) return "production_mp4";
  if ((j?.checkpointCompletedClipCount ?? 0) > baselineCompleted) return "completed_clips";
  if ((j?.setResultFileCount ?? 0) > baselineSet) return "set_result";
  for (const id of j?.audioFinishedClipIds ?? []) {
    if (!baselineAudio.has(id)) return `audio_finished_${id}`;
  }
  for (const id of j?.paintedWordsClipIds ?? []) {
    if (!baselinePainted.has(id)) return `painted_words_${id}`;
  }
  for (const id of j?.localProofClipIds ?? []) {
    if (!baselineLocalProof.has(id)) return `local_proof_${id}`;
  }
  return null;
}

const wake = vercelCurl(
  `/api/hosted-cert/continue-paid-intake-chain?scope=launch-menu-only&mode=sync`,
  {
    method: "POST",
    jar,
    body: { campaignId },
    longRunning: true,
  },
);
const wakeJson = parseJsonBody(wake.bodyText);
log(
  "continue-paid-intake-chain",
  wake.status === 200 || wake.status === 0 ? "PASS" : "FAIL",
  `HTTP ${wake.status} mode=${wakeJson?.mode ?? "?"}`,
);

let meaningful = false;
const proofStarted = Date.now();
while (Date.now() - proofStarted < PROOF_MS) {
  await new Promise((r) => setTimeout(r, POLL_MS));
  const p = probe();
  if (p.http !== 200 || p.json?.ok === false) {
    log("probe_poll", "WARN", p.json?.message ?? `HTTP ${p.http}`);
    continue;
  }
  const sig = signature(p.json);
  const reason = artifactAdvanced(p.json);
  if (reason) {
    meaningful = true;
    log("meaningful_progress", "PASS", `${reason} ${sig}`);
    break;
  }
  log("probe_poll", "PASS", sig);
}

const out = {
  startedAt,
  finishedAt: new Date().toISOString(),
  deploymentId,
  campaignId,
  baselineUpdatedAt,
  baselineArtifacts: {
    mp4: baselineMp4,
    completed: baselineCompleted,
    set: baselineSet,
    audioClipIds: [...baselineAudio],
  },
  meaningfulProgress: meaningful,
  ledger,
  exitCode: meaningful ? 0 : 5,
};
const outPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-CONTROLLED-WAKE-PROOF-1-RUN.json",
);
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("Wrote", outPath);
process.exit(out.exitCode);
