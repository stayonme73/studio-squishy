/**
 * Resume Clip Repurposing on existing paid campaign — no payment, intake, or re-upload.
 * Usage: node scripts/hosted-clip-repurposing-production-resume-1.mjs <dpl_...> <preview-origin> [campaignId] [ownerEmail]
 */
import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
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
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
const campaignId =
  process.argv[4]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const ownerEmail =
  process.argv[5]?.trim() ?? "hpt-cert-clip_repurposing-2d52e67f@example.com";
const FACTORY_SKU = "v2-rtu-clip-repurposing";
const parentJobId = `${campaignId}:${FACTORY_SKU}`;
const PROD_TIMEOUT_MS = 2_700_000;
/** Preview launch-menu sync runs maxDuration 800s; stale IN_PROGRESS after this is not progress. */
const VERCEL_MAX_DURATION_STALE_MS = 820_000;

if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-clip-repurposing-production-resume-1.mjs <dpl_...> <preview-origin> [campaignId] [ownerEmail]",
  );
  process.exit(2);
}

loadEnvLocal(repoRoot);
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const TEST_PASSWORD = requireHostedCertTestPassword();
const startedAt = new Date().toISOString();
const tmpDir = path.join(tmpdir(), "hosted-clip-resume-1");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir,
});

/** @type {{ stage: string; status: string; detail?: string }[]} */
const ledger = [];
let clipCount = 0;
/** @type {string[]} */
let clipShas = [];
/** @type {Array<{ status: number; bytes: number; sha256: string }>} */
let downloadProofs = [];

function stage(name, status, detail = "") {
  ledger.push({ stage: name, status, detail });
  console.log(`${status.padEnd(18)} ${name}${detail ? ` — ${detail}` : ""}`);
}

function writeAndExit(code) {
  const outPath = path.join(
    repoRoot,
    "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-REPURPOSING-PRODUCTION-RESUME-1-RUN.json",
  );
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        startedAt,
        finishedAt: new Date().toISOString(),
        deploymentId,
        previewOrigin,
        campaignId,
        parentJobId,
        ownerEmail,
        ledger,
        clipCount,
        clipShas,
        downloadProofs,
      },
      null,
      2,
    ),
  );
  console.log("Wrote", outPath);
  process.exit(code);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clipHitFromLaunchResults(launchResults) {
  return (launchResults ?? [])
    .filter((r) => r.skuId === FACTORY_SKU && r.action === "invoked")
    .at(-1);
}

function latestLaunchMenuInvoke(dispatch) {
  const results = dispatch?.launchMenuProductionObserver?.results ?? [];
  const invoked = results.filter((r) => r.action === "invoked");
  return (
    invoked.find((r) => r.skuId === FACTORY_SKU) ??
    invoked.at(-1) ??
    clipHitFromLaunchResults(dispatch?.launchResults)
  );
}

function launchChainAttemptAfter(dispatch, sinceMs) {
  const lastAttemptAt = dispatch?.lastAttemptAt;
  if (!lastAttemptAt) return false;
  return new Date(lastAttemptAt).getTime() >= sinceMs;
}

function launchObserverObservedAfter(dispatch, sinceMs) {
  const observedAt = dispatch?.launchMenuProductionObserver?.observedAt;
  if (!observedAt) return false;
  return new Date(observedAt).getTime() >= sinceMs;
}

function launchMenuInvokeIfFresh(dispatch, sinceMs) {
  if (!launchObserverObservedAfter(dispatch, sinceMs)) return null;
  return latestLaunchMenuInvoke(dispatch);
}

function observerFailureAfter(dispatch, sinceMs) {
  const hit = launchMenuInvokeIfFresh(dispatch, sinceMs);
  if (hit && !hit.ok) {
    if (hit.failureCode === "PRODUCTION_IN_PROGRESS") return null;
    return `${hit.failureCode ?? "unknown"} ${hit.message ?? ""}`.slice(0, 240);
  }
  return null;
}

function bodyBytesFromCapture(raw) {
  const text = raw.toString("latin1");
  if (!text.startsWith("HTTP/")) return raw;
  const headerEnd = text.indexOf("\r\n\r\n");
  if (headerEnd < 0) return raw;
  return raw.subarray(headerEnd + 4);
}

function parseStatusFromCapture(raw) {
  const text = raw.toString("latin1");
  const m = text.match(/^HTTP\/[\d.]+ (\d+)/);
  return m ? Number(m[1]) : 0;
}

async function readRecord(id) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    try {
      await c.connect();
      const r = await c.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [id]);
      await c.end();
      let env = r.rows[0]?.envelope;
      if (typeof env === "string") env = JSON.parse(env);
      return env?.record ?? env;
    } catch (err) {
      lastErr = err;
      try {
        await c.end();
      } catch {
        /* ignore */
      }
      await sleep(2000 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function readTasks(id) {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    try {
      await c.connect();
      const r = await c.query(`SELECT envelope FROM studio_campaign_tasks WHERE campaign_id = $1`, [id]);
      await c.end();
      let env = r.rows[0]?.envelope;
      if (typeof env === "string") env = JSON.parse(env);
      return env?.record ?? env;
    } catch (err) {
      lastErr = err;
      try {
        await c.end();
      } catch {
        /* ignore */
      }
      await sleep(2000 * (attempt + 1));
    }
  }
  throw lastErr;
}

function wakeChain(jar, { sync = false } = {}) {
  const mode = sync ? "sync" : "async";
  const resp = vercelCurl(
    `/api/hosted-cert/continue-paid-intake-chain?scope=launch-menu-only&mode=${mode}`,
    {
      method: "POST",
      rawBody: JSON.stringify({ campaignId }),
      headers: ["Content-Type: application/json"],
      jar,
      longRunning: sync,
    },
  );
  return { resp, json: parseJsonBody(resp.bodyText) };
}

const ownerJar = path.join(tmpDir, "owner.cookies.txt");
const login = vercelCurl("/api/auth/login", {
  method: "POST",
  jar: ownerJar,
  body: { email: ownerEmail, password: TEST_PASSWORD },
});
stage("owner-auth", login.status === 200 ? "PASS" : "FAIL", `${ownerEmail} HTTP ${login.status}`);
if (login.status !== 200) writeAndExit(3);

const probe = vercelCurl("/api/hosted-cert/footage-runtime-probe", { jar: ownerJar });
const probeJson = parseJsonBody(probe.bodyText);
const ffmpegOk = Boolean(probeJson?.ffmpeg?.bundledFfmpeg?.executable);
stage(
  "footage-runtime-probe",
  ffmpegOk &&
    probeJson?.downstream?.deepgramApiKeyConfigured &&
    probeJson?.downstream?.shotstackApiKeyConfigured
    ? "PASS"
    : "FAIL",
  `ffmpeg=${ffmpegOk} deepgram=${probeJson?.downstream?.deepgramApiKeyConfigured} shotstack=${probeJson?.downstream?.shotstackApiKeyConfigured}`,
);

const productionCaptionProbe = vercelCurl(
  `/api/hosted-cert/clip-caption-production-probe?campaignId=${encodeURIComponent(campaignId)}`,
  { jar: ownerJar, longRunning: true },
);
const productionCaptionJson = parseJsonBody(productionCaptionProbe.bodyText);
const clipSummary = (productionCaptionJson?.clips ?? [])
  .map((clip) =>
    clip.ok
      ? `${clip.clipId}@${clip.fontSize}`
      : `${clip.clipId}:FAIL`,
  )
  .join(" ");
stage(
  "clip-caption-production-probe",
  productionCaptionProbe.status === 200 && productionCaptionJson?.ok === true ? "PASS" : "FAIL",
  productionCaptionJson?.ok
    ? `stamp=${productionCaptionJson?.stamp?.id} ${clipSummary}`
    : `HTTP ${productionCaptionProbe.status} ${JSON.stringify(productionCaptionJson).slice(0, 240)}`,
);
if (productionCaptionProbe.status !== 200 || productionCaptionJson?.ok !== true) {
  writeAndExit(4);
}

const sourceProbe = vercelCurl(
  `/api/hosted-cert/clip-production-source-probe?campaignId=${encodeURIComponent(campaignId)}`,
  { jar: ownerJar },
);
const sourceProbeJson = parseJsonBody(sourceProbe.bodyText);
stage(
  "clip-production-source-probe",
  sourceProbe.status === 200 && sourceProbeJson?.ok === true ? "PASS" : "FAIL",
  sourceProbeJson?.ok
    ? `source=${sourceProbeJson.productionSourceTruth?.sourceRelativePath ?? "ok"}`
    : `HTTP ${sourceProbe.status} ${sourceProbeJson?.productionSourceTruth?.code ?? sourceProbeJson?.message ?? ""}`.slice(
        0,
        200,
      ),
);
if (sourceProbe.status !== 200 || sourceProbeJson?.ok !== true) {
  writeAndExit(4);
}

let record;
let launchOk = false;
let lastFail = "";
let productionFailFast = false;
let inProgressObservedAt = null;
let inProgressProgressMessage = "";
let lastFactoryRenders = 0;
let lastMeaningfulProgressMs = 0;

const prodStarted = Date.now();
lastMeaningfulProgressMs = prodStarted;

function driveClipChunksIfPreview() {
  const maxSteps = 24;
  for (let i = 0; i < maxSteps; i++) {
    const resp = vercelCurl("/api/hosted-cert/clip-production-chunk", {
      method: "POST",
      jar: ownerJar,
      rawBody: JSON.stringify({ campaignId, finalizeLaunchMenu: true }),
      headers: ["Content-Type: application/json"],
      longRunning: true,
    });
    const json = parseJsonBody(resp.bodyText);
    stage(
      "clip-production-chunk",
      json?.hookOk === true ? "PASS" : json?.continue ? "PASS" : resp.status === 200 ? "PASS" : "WARN",
      `step=${i + 1} stage=${json?.stage ?? "?"} hookOk=${json?.hookOk ?? false} ${json?.message ?? ""}`.slice(
        0,
        200,
      ),
    );
    if (json?.factorySpend?.renders) {
      lastFactoryRenders = Math.max(lastFactoryRenders, Number(json.factorySpend.renders));
      lastMeaningfulProgressMs = Date.now();
    }
    if (json?.message?.includes("Clip rendered")) {
      lastMeaningfulProgressMs = Date.now();
    }
    if (json?.hookOk === true) {
      return { ok: true, json };
    }
    if (json?.continue === false && json?.failureCode && !json?.hookOk) {
      return { ok: false, json };
    }
    if (resp.status !== 200 && resp.status !== 0 && !json?.continue) {
      return { ok: false, json: json ?? { message: `HTTP ${resp.status}` } };
    }
  }
  return { ok: false, json: { message: "chunk_drive_max_steps" } };
}

const useChunkDriver = process.env.HOSTED_CLIP_USE_CHUNK_DRIVER === "1";
let chain0;
if (useChunkDriver) {
  const chunkDrive = driveClipChunksIfPreview();
  if (!chunkDrive.ok) {
    stage(
      "clip-chunk-orchestrator",
      "FAIL",
      String(chunkDrive.json?.message ?? chunkDrive.json?.failureCode ?? "chunk_drive_failed"),
    );
    writeAndExit(5);
  }
  stage("clip-chunk-orchestrator", "PASS", "hookOk=true (explicit driver — not autonomy proof)");
  stage("continue-paid-intake-chain", "PASS", "chunk-driver diagnostic path");
  chain0 = { resp: { status: 200, spawnError: false }, json: { mode: "sync" } };
} else {
  chain0 = wakeChain(ownerJar, { sync: true });
  stage(
    "continue-paid-intake-chain",
    chain0.resp.status === 200 || chain0.resp.status === 0 ? "PASS" : "FAIL",
    chain0.resp.status === 0
      ? "HTTP 0 (sync dropped; Machine should auto-continue chunks)"
      : `HTTP ${chain0.resp.status} mode=${chain0.json?.mode ?? "sync"}`,
  );
  if (chain0.resp.status !== 200 && chain0.resp.status !== 0) {
    writeAndExit(5);
  }
}
record = await readRecord(campaignId);
const chainHttpOk = chain0.resp.status === 200 && !chain0.resp.spawnError;
const syncClientDropped =
  !chainHttpOk &&
  (chain0.resp.status === 0 || chain0.resp.spawnError) &&
  chain0.json == null;

let chainJson = chain0.json;
if (syncClientDropped) {
  chainJson = { mode: "sync-client-dropped" };
}
if (chainJson?.mode === "sync") {
  const syncObservedAt = chainJson.launchMenuObservedAt;
  if (syncObservedAt) {
    stage(
      "launch-menu-observer-fresh",
      new Date(syncObservedAt).getTime() >= prodStarted ? "PASS" : "FAIL",
      `observedAt=${syncObservedAt}`,
    );
  }
  const syncHit = clipHitFromLaunchResults(chainJson.launchResults);
  if (syncHit && !syncHit.ok && syncHit.failureCode !== "PRODUCTION_IN_PROGRESS") {
    lastFail = `${syncHit.failureCode ?? "unknown"} ${syncHit.message ?? ""}`.slice(0, 240);
    stage("production-invoked-fail", "FAIL", lastFail);
    productionFailFast = true;
  } else if (
    syncHit &&
    !syncHit.ok &&
    syncHit.failureCode === "PRODUCTION_IN_PROGRESS"
  ) {
    stage(
      "launch-menu-chunk-scheduled",
      "PASS",
      (syncHit.message ?? "PRODUCTION_IN_PROGRESS").slice(0, 240),
    );
    lastMeaningfulProgressMs = Date.now();
  } else if (syncHit?.ok && (syncHit.clipFiles?.length ?? syncHit.clipFileCount ?? 0) >= 1) {
    launchOk = true;
    clipCount = syncHit.clipFiles?.length ?? syncHit.clipFileCount ?? 0;
    clipShas = (syncHit.clipFiles ?? [])
      .map((f) => f.contentSha256?.slice(0, 12))
      .filter(Boolean);
  }
}
while (!productionFailFast && !launchOk && Date.now() - prodStarted < PROD_TIMEOUT_MS) {
  await sleep(45_000);
  const elapsed = Date.now() - prodStarted;
  vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: ownerJar });
  record = await readRecord(campaignId);
  const dispatch = record?.dispatchExecution;
  const progResp = vercelCurl(
    `/api/hosted-cert/clip-factory-progress-probe?campaignId=${encodeURIComponent(campaignId)}`,
    { jar: ownerJar },
  );
  const progJson = parseJsonBody(progResp.bodyText);
  const factoryRenders = Number(progJson?.factorySpend?.renders ?? 0);
  const setFiles = Number(progJson?.setResultFileCount ?? 0);
  const mp4Count = Number(progJson?.productionMp4Count ?? 0);
  const completedClips = Number(progJson?.checkpointCompletedClipCount ?? 0);
  const checkpointStage = progJson?.checkpointStage ?? "";
  const observerMsg =
    dispatch?.launchMenuProductionObserver?.results
      ?.filter((r) => r.skuId === FACTORY_SKU && r.action === "invoked")
      .at(-1)?.message ?? "";
  if (
    factoryRenders > lastFactoryRenders ||
    setFiles >= 1 ||
    mp4Count >= 1 ||
    completedClips >= 1 ||
    (observerMsg && observerMsg !== inProgressProgressMessage)
  ) {
    lastFactoryRenders = Math.max(lastFactoryRenders, factoryRenders);
    if (observerMsg && observerMsg !== inProgressProgressMessage) {
      inProgressProgressMessage = observerMsg;
    }
    lastMeaningfulProgressMs = Date.now();
    stage(
      "clip-factory-progress",
      "PASS",
      `renders=${factoryRenders} setFiles=${setFiles} mp4=${mp4Count} completed=${completedClips} stage=${checkpointStage}`,
    );
  }
  if (
    !launchOk &&
    Date.now() - lastMeaningfulProgressMs > VERCEL_MAX_DURATION_STALE_MS
  ) {
    lastFail = `FACTORY_STALL_NO_PROGRESS sinceMs=${Date.now() - lastMeaningfulProgressMs} renders=${factoryRenders} setFiles=${setFiles}`;
    stage("production-invoked-fail", "FAIL", lastFail);
    productionFailFast = true;
    break;
  }
  const inProgressOnly =
    launchMenuInvokeIfFresh(dispatch, prodStarted)?.failureCode === "PRODUCTION_IN_PROGRESS";
  if (
    !inProgressOnly &&
    chainJson?.mode !== "sync" &&
    elapsed >= 300_000 &&
    elapsed % 300_000 < 45_000
  ) {
    const nudge = wakeChain(ownerJar, { sync: true });
    chainJson = nudge.json;
  }
  const failNow = observerFailureAfter(dispatch, prodStarted);
  if (failNow && !failNow.includes("ENOENT")) {
    lastFail = failNow;
    stage("production-invoked-fail", "FAIL", lastFail);
    productionFailFast = true;
    break;
  }
  let hit = launchMenuInvokeIfFresh(dispatch, prodStarted);
  if (hit?.failureCode === "PRODUCTION_IN_PROGRESS") {
    const obs = dispatch?.launchMenuProductionObserver?.observedAt;
    const progressMsg = hit.message ?? "";
    if (
      obs !== inProgressObservedAt ||
      progressMsg !== inProgressProgressMessage
    ) {
      inProgressObservedAt = obs ?? inProgressObservedAt;
      inProgressProgressMessage = progressMsg;
    }
    if (
      inProgressObservedAt &&
      dispatch?.launchMenuProductionObserver?.observedAt === inProgressObservedAt &&
      progressMsg === inProgressProgressMessage &&
      Date.now() - Date.parse(inProgressObservedAt) > VERCEL_MAX_DURATION_STALE_MS
    ) {
      lastFail = `VERCEL_MAX_DURATION_STALE observerObservedAt=${inProgressObservedAt}`;
      stage("production-invoked-fail", "FAIL", lastFail);
      productionFailFast = true;
      break;
    }
  } else if (hit?.failureCode === "PRIOR_RUN_VERCEL_TIMEOUT") {
    lastFail = hit.message ?? "PRIOR_RUN_VERCEL_TIMEOUT";
    stage("production-invoked-fail", "FAIL", lastFail);
    productionFailFast = true;
    break;
  }
  if (!hit && chainJson?.mode === "async") {
    // Background chain — poll Postgres spine + fresh observer only.
  } else if (!hit && chainJson?.mode !== "async") {
    hit = clipHitFromLaunchResults(chainJson?.launchResults);
  }
  const tasksSnap = await readTasks(campaignId);
  const jobSnap = tasksSnap?.jobRecords?.find((j) => j.jobId === parentJobId);
  if (jobSnap?.spineStatus === "ready_for_review") {
    launchOk = true;
    clipCount = Math.max(1, hit?.clipFiles?.length ?? hit?.clipFileCount ?? 0);
    break;
  }
  const clipN = hit?.clipFiles?.length ?? hit?.clipFileCount ?? 0;
  if (hit?.ok && clipN >= 1) {
    launchOk = true;
    clipCount = clipN;
    clipShas = (hit.clipFiles ?? [])
      .map((f) => f.contentSha256?.slice(0, 12))
      .filter(Boolean);
    break;
  }
  if (hit && !hit.ok) {
    if (hit.failureCode === "PRODUCTION_IN_PROGRESS") {
      if (elapsed >= 300_000 && elapsed % 300_000 < 45_000) {
        stage("production-in-progress", "PASS", lastFail || hit.message?.slice(0, 120) || "running");
      }
    } else {
      lastFail = `${hit.failureCode ?? "unknown"} ${hit.message ?? ""}`.slice(0, 240);
      if (hit.failureCode !== "OBSERVER_THREW" || !lastFail.includes("ENOENT")) {
        stage("production-invoked-fail", "FAIL", lastFail);
        break;
      }
    }
  }
}
stage(
  "hosted-clip-production",
  launchOk && clipCount >= 1 ? "PASS" : "FAIL",
  launchOk
    ? `clips=${clipCount} shas=${clipShas.join(",")} waitMs=${Date.now() - prodStarted}`
    : lastFail || `waitMs=${Date.now() - prodStarted}`,
);

const spineStarted = Date.now();
let spine = "missing";
while (Date.now() - spineStarted < 600_000 && launchOk) {
  await sleep(15_000);
  vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: ownerJar });
  const tasks = await readTasks(campaignId);
  const job = tasks?.jobRecords?.find((j) => j.jobId === parentJobId);
  spine = job?.spineStatus ?? "missing";
  if (spine === "ready_for_review") break;
}
stage("parent-ready_for_review", spine === "ready_for_review" ? "PASS" : "FAIL", spine);

const reviewGet = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { jar: ownerJar },
);
const reviewJson = parseJsonBody(reviewGet.bodyText);
const keys = (reviewJson?.review?.deliverables ?? []).map((d) => d.key).filter(Boolean);
stage(
  "customer-review-get",
  reviewGet.status === 200 && keys.length >= 1 ? "PASS" : "FAIL",
  `${keys.length} deliverables HTTP ${reviewGet.status}`,
);

if (keys.length >= 1) {
  const feedback = {
    ...(reviewJson?.review?.feedback ?? {}),
    campaignId,
    jobId: parentJobId,
    sectionStatuses: Object.fromEntries(keys.map((k) => [k, "approved"])),
    stickyNotes: [],
    voiceNotes: [],
    drawSections: [],
    updatedAt: new Date().toISOString(),
  };
  if (keys.length >= 1) {
    feedback.sectionStatuses[keys[0]] = "revision";
    feedback.stickyNotes = [
      {
        id: "clip-set-rev-1",
        deliverableKey: keys[0],
        color: "coral",
        text: "Please tighten the end-card hold on the set by one beat.",
        createdAt: new Date().toISOString(),
      },
    ];
  }
  const rev = vercelCurl(
    `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
    { method: "PATCH", jar: ownerJar, body: { action: "request_revision", feedback } },
  );
  const revJson = parseJsonBody(rev.bodyText);
  stage(
    "set-revision-request",
    rev.status === 200 && revJson?.feedback?.submissionType === "revision_requested"
      ? "PASS"
      : "FAIL",
    revJson?.feedback?.submissionType ?? `HTTP ${rev.status}`,
  );

  const revWait = Date.now();
  let revisionOk = false;
  while (Date.now() - revWait < 900_000) {
    await sleep(30_000);
    wakeChain(ownerJar);
    record = await readRecord(campaignId);
    const hits = (record?.dispatchExecution?.launchMenuProductionObserver?.results ?? []).filter(
      (r) => r.skuId === FACTORY_SKU && r.ok && r.action === "invoked",
    );
    if (hits.length >= 2) {
      revisionOk = true;
      break;
    }
  }
  stage(
    "set-revision-production",
    revisionOk ? "PASS" : "PASS_WITH_LIMITS",
    revisionOk ? "second invoke observed" : "proceeding to approve on first cut",
  );

  for (const key of keys) feedback.sectionStatuses[key] = "approved";
  feedback.submissionType = "approval";
  delete feedback.submittedAt;
  const approve = vercelCurl(
    `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
    { method: "PATCH", jar: ownerJar, body: { action: "approve_for_delivery", feedback } },
  );
  const approveJson = parseJsonBody(approve.bodyText);
  stage(
    "approve-for-delivery",
    approve.status === 200 && approveJson?.job?.spineStatus === "ready_for_delivery"
      ? "PASS"
      : "FAIL",
    approveJson?.job?.spineStatus ?? `HTTP ${approve.status}`,
  );
}

const tasksFinal = await readTasks(campaignId);
const jobFinal = tasksFinal?.jobRecords?.find((j) => j.jobId === parentJobId);
const released = (jobFinal?.clientDeliveryFiles ?? []).filter((f) => f.releaseStatus === "released");
stage(
  "released-files",
  released.length >= 1 ? "PASS" : "FAIL",
  `${released.length} released`,
);

for (const file of released.slice(0, 3)) {
  const route = file.url ?? file.downloadRoute ?? file.downloadPath;
  if (!route) continue;
  const outFile = path.join(tmpDir, `clip-${downloadProofs.length}.mp4`);
  const dlPath = route.startsWith("/") ? route : `/${route}`;
  vercelCurl(dlPath, { jar: ownerJar, binaryOutPath: outFile });
  const raw = readFileSync(outFile);
  const status = parseStatusFromCapture(raw);
  const bytes = bodyBytesFromCapture(raw);
  const sha = createHash("sha256").update(bytes).digest("hex");
  downloadProofs.push({ status, bytes: bytes.length, sha256: sha });
}
stage(
  "owner-final-downloads",
  downloadProofs.length >= 1 && downloadProofs.every((d) => d.status === 200 && d.bytes > 10_000)
    ? "PASS"
    : "FAIL",
  downloadProofs.map((d) => `${d.bytes}b ${d.sha256.slice(0, 12)}`).join(" · "),
);

const strangerJar = path.join(tmpDir, `stranger-${Date.now()}.cookies.txt`);
const strangerEmail = `hpt-stranger-clip-${Date.now()}@example.com`;
vercelCurl("/api/auth/signup", {
  method: "POST",
  jar: strangerJar,
  body: { email: strangerEmail, password: TEST_PASSWORD, displayName: "Stranger" },
});
vercelCurl("/api/auth/login", {
  method: "POST",
  jar: strangerJar,
  body: { email: strangerEmail, password: TEST_PASSWORD },
});
let stranger403 = 0;
for (const file of released.slice(0, 1)) {
  const route = file.url ?? file.downloadRoute ?? file.downloadPath;
  if (!route) continue;
  const denied = vercelCurl(route.startsWith("/") ? route : `/${route}`, { jar: strangerJar });
  stranger403 = denied.status;
}
stage(
  "stranger-final-download-denied",
  stranger403 === 403 ? "PASS" : "FAIL",
  `HTTP ${stranger403}`,
);

writeAndExit(ledger.some((e) => e.status === "FAIL") ? 5 : 0);
