/**
 * Resume Clip Repurposing on existing paid TEST campaign — upload long-form source + wake factory.
 * Usage: node scripts/hosted-clip-repurposing-footage-continue-1.mjs <dpl_...> <preview-origin> [campaignId] [ownerEmail]
 */
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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
const MATERIAL_SLOT = "condensed-clip-source";
/** Preview multipart route hits platform body limits (~4 MB); keep hosted upload aligned with SFV cert. */
const MAX_UPLOAD_BYTES = 3_800_000;
const HOSTED_CLIP_LONG_SOURCE = path.join(tmpdir(), "hosted-clip-long-source.mp4");
const LONG_SOURCE_ENCODE_FROM = path.join(
  repoRoot,
  "data/campaigns/camp-clip-live-unpublished-20260925/source-audio-preflight/light-cleanup-pass-1.mp4",
);

if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-clip-repurposing-footage-continue-1.mjs <dpl_...> <preview-origin> [campaignId] [ownerEmail]",
  );
  process.exit(2);
}

function ensureHostedClipLongSource(outPath) {
  if (
    existsSync(outPath) &&
    readFileSync(outPath).length > 500_000 &&
    readFileSync(outPath).length <= MAX_UPLOAD_BYTES
  ) {
    return outPath;
  }
  if (!existsSync(LONG_SOURCE_ENCODE_FROM)) {
    throw new Error(`Missing clip encode source: ${LONG_SOURCE_ENCODE_FROM}`);
  }
  const ff = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-stream_loop",
      "2",
      "-i",
      LONG_SOURCE_ENCODE_FROM,
      "-t",
      "901",
      "-vf",
      "scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2",
      "-c:v",
      "libx264",
      "-b:v",
      "5k",
      "-maxrate",
      "8k",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-b:a",
      "16k",
      "-ac",
      "1",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  if (ff.status !== 0 || !existsSync(outPath)) {
    throw new Error(ff.stderr?.slice(-400) || "ffmpeg hosted clip long source failed");
  }
  const size = readFileSync(outPath).length;
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(`Hosted clip long source still exceeds cap (${size} bytes).`);
  }
  return outPath;
}

loadEnvLocal(repoRoot);
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const TEST_PASSWORD = requireHostedCertTestPassword();
const startedAt = new Date().toISOString();
const tmpDir = path.join(tmpdir(), "hosted-clip-footage-continue-1");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl, vercelCurlMultipart } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir,
});

/** @type {{ stage: string; status: string; detail?: string }[]} */
const ledger = [];

function stage(name, status, detail = "") {
  ledger.push({ stage: name, status, detail });
  console.log(`${status.padEnd(18)} ${name}${detail ? ` — ${detail}` : ""}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readRecord(id) {
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [id]);
  await c.end();
  let env = r.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  return env?.record ?? env;
}

async function readTasks(id) {
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT envelope FROM studio_campaign_tasks WHERE campaign_id = $1`, [id]);
  await c.end();
  let env = r.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  return env?.record ?? env;
}

const ownerJar = path.join(tmpDir, "owner.cookies.txt");
const login = vercelCurl("/api/auth/login", {
  method: "POST",
  jar: ownerJar,
  body: { email: ownerEmail, password: TEST_PASSWORD },
});
stage("owner-auth", login.status === 200 ? "PASS" : "FAIL", `${ownerEmail} HTTP ${login.status}`);
if (login.status !== 200) process.exit(3);

const footageFile = ensureHostedClipLongSource(HOSTED_CLIP_LONG_SOURCE);
const bytes = readFileSync(footageFile).length;
stage("long-source-fixture", "PASS", `${path.basename(footageFile)} · ${bytes} bytes`);

const upload = vercelCurlMultipart(
  `/api/campaigns/${encodeURIComponent(campaignId)}/materials`,
  {
    jar: ownerJar,
    fields: {
      action: "client_submit",
      itemId: MATERIAL_SLOT,
      useAuthorizationBasis: "customer_owns",
      cropAdaptPermitted: "true",
      commercialUsePermitted: "true",
      recognizablePeoplePresent: "false",
      thirdPartyMaterialPresent: "false",
      attestationTextVersion: "gate-x-rights-attestation-v1-2026-08-22-honest-hold",
    },
    fileField: "file",
    filePath: footageFile,
  },
);
const uploadJson = parseJsonBody(upload.bodyText);
const uploadOk =
  upload.status === 200 &&
  !uploadJson?.error &&
  (uploadJson?.syncedAt || uploadJson?.receiptMessage || uploadJson?.materials?.items?.length);
stage(
  "long-source-upload",
  uploadOk ? "PASS" : "FAIL",
  `HTTP ${upload.status} ${uploadJson?.error ?? uploadJson?.receiptMessage ?? ""}`.slice(0, 160),
);
if (!uploadOk) {
  writeLedger("FAIL");
  process.exit(4);
}

const sourceAudioAck = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/materials`,
  {
    method: "PATCH",
    jar: ownerJar,
    body: {
      action: "acknowledge_source_audio_limitation",
      proceedWithThisSource: true,
    },
  },
);
const sourceAudioAckJson = parseJsonBody(sourceAudioAck.bodyText);
stage(
  "source-audio-acknowledgement",
  sourceAudioAck.status === 200 && sourceAudioAckJson?.ok === true
    ? "PASS"
    : sourceAudioAck.status === 409
      ? "SKIP"
      : "FAIL",
  sourceAudioAckJson?.error ??
    sourceAudioAckJson?.sourceAudioPreflight?.outcome ??
    `HTTP ${sourceAudioAck.status}`,
);

const chain = vercelCurl("/api/hosted-cert/continue-paid-intake-chain", {
  method: "POST",
  rawBody: JSON.stringify({ campaignId }),
  headers: ["Content-Type: application/json"],
  jar: ownerJar,
});
const chainJson = parseJsonBody(chain.bodyText);
stage(
  "continue-paid-intake-chain",
  chain.status === 200 ? "PASS" : "FAIL",
  `HTTP ${chain.status} ${JSON.stringify(chainJson?.launchResults ?? chainJson?.error ?? "").slice(0, 140)}`,
);

let record = await readRecord(campaignId);
const dr = record?.dispatchExecution?.records?.find((r) => r.skuId === FACTORY_SKU);
stage(
  "execution-identity-ready",
  dr?.executionIdentityReady === true ? "PASS" : "FAIL",
  `ready=${Boolean(dr?.executionIdentityReady)} dispatch=${dr?.status ?? "missing"}`,
);

const prodStarted = Date.now();
let launchOk = false;
let clipCount = 0;
let lastFail = "";
while (Date.now() - prodStarted < 900_000) {
  await sleep(25_000);
  vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: ownerJar });
  record = await readRecord(campaignId);
  const dispatch = record?.dispatchExecution;
  const hit = (dispatch?.launchMenuProductionObserver?.results ?? []).find(
    (r) => r.skuId === FACTORY_SKU && r.action === "invoked",
  );
  if (hit?.ok) {
    launchOk = true;
    clipCount = hit.clipFiles?.length ?? (hit.mp4ContentSha256 ? 1 : 0);
    break;
  }
  if (hit && !hit.ok) {
    lastFail = `${hit.failureCode ?? "unknown"} ${hit.message ?? ""}`.slice(0, 240);
    stage("production-invoked-fail", "FAIL", lastFail);
    break;
  }
}
stage(
  "hosted-clip-production",
  launchOk && clipCount >= 1 ? "PASS" : "FAIL",
  launchOk
    ? `clips=${clipCount} waitMs=${Date.now() - prodStarted}`
    : lastFail || `waitMs=${Date.now() - prodStarted}`,
);

const spineStarted = Date.now();
let spine = "missing";
while (Date.now() - spineStarted < 300_000 && launchOk) {
  await sleep(12_000);
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

function writeLedger(verdict) {
  const outPath = path.join(
    repoRoot,
    "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-REPURPOSING-FOOTAGE-CONTINUE-1-RUN.json",
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
        ownerEmail,
        factorySku: FACTORY_SKU,
        longSourceFile: path.basename(footageFile),
        ledger,
        verdict,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${outPath}`);
}

const allPass = ledger.every((e) => e.status === "PASS" || e.status === "SKIP");
writeLedger(allPass ? "PASS_WITH_EXPLICIT_LIMITS" : "FAIL");
process.exit(allPass ? 0 : 5);
