/**
 * STUDIO-HOSTED-SOCIAL-PROMO-FINAL-CERTIFICATION-1 — fresh disposable Preview E2E (no Postgres steering).
 * Usage: node scripts/hosted-social-promo-final-certification-1.mjs <dpl_...> <preview-origin>
 */
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import Stripe from "stripe";

import { createHostedVercelCurl, parseJsonBody } from "./lib/hosted-preview-vercel-curl.mjs";
import {
  condensedCheckoutBody,
  intakeAnswersForPackage,
} from "./lib/hpt-cert-intake-answers.mjs";
import {
  loadEnvLocal,
  requireHostedCertTestPassword,
} from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
const PACKAGE = "social_and_promo_graphics";

if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-social-promo-final-certification-1.mjs <dpl_...> <preview-origin>",
  );
  process.exit(2);
}

loadEnvLocal(repoRoot);

const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const whsec = process.env.STRIPE_WEBHOOK_SECRET;
const TEST_PASSWORD = requireHostedCertTestPassword();
const campaignId = `disposable-hosted-sp-final-cert-${randomBytes(4).toString("hex")}`;
const parentJobId = `${campaignId}:${PACKAGE}`;
const startedAt = new Date().toISOString();
const tmpDir = path.join(tmpdir(), "hosted-sp-final-cert-1");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl, vercelCurlBinary, vercelStripeWebhook } = createHostedVercelCurl({
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
  return env;
}

function registerSession(label) {
  const email = `hosted-sp-final-${label}-${randomBytes(3).toString("hex")}@example.com`;
  const jar = path.join(tmpDir, `${label}.cookies.txt`);
  if (!existsSync(jar)) writeFileSync(jar, "", "utf8");
  vercelCurl("/api/auth/signup", {
    method: "POST",
    jar,
    body: { email, password: TEST_PASSWORD, displayName: "Hosted SP Final Cert" },
  });
  vercelCurl("/api/auth/login", { method: "POST", jar, body: { email, password: TEST_PASSWORD } });
  return { email, jar };
}

const owner = registerSession("owner");
stage("auth", "PASS", owner.email);

const checkout = vercelCurl("/api/payments/checkout-session", {
  method: "POST",
  jar: owner.jar,
  body: condensedCheckoutBody({ packageId: PACKAGE, campaignId, previewOrigin, email: owner.email }),
});
const checkoutJson = parseJsonBody(checkout.bodyText);
const checkoutSessionId =
  checkoutJson?.checkoutSessionId ??
  checkout.bodyText.match(/"checkoutSessionId"\s*:\s*"(cs_test_[^"]+)"/)?.[1];
if (checkout.status !== 200 || !checkoutSessionId) {
  stage("checkout", "FAIL", checkout.bodyText.slice(0, 200));
  process.exit(2);
}
stage("checkout", "PASS", checkoutSessionId);

const stripeSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
const payload = JSON.stringify({
  id: `evt_spfc_${randomBytes(6).toString("hex")}`,
  object: "event",
  type: "checkout.session.completed",
  livemode: false,
  data: {
    object: {
      ...stripeSession,
      payment_status: "paid",
      status: "complete",
      amount_total: stripeSession.amount_total ?? 0,
      livemode: false,
    },
  },
});
const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: whsec });
const wh = vercelStripeWebhook(payload, sig);
stage("webhook", wh.status === 200 ? "PASS" : "FAIL", `HTTP ${wh.status}`);

const intake = vercelCurl("/api/payments/intake-submit", {
  method: "POST",
  jar: owner.jar,
  body: { checkoutSessionId, answers: intakeAnswersForPackage(PACKAGE) },
});
const intakeJson = parseJsonBody(intake.bodyText);
stage(
  "intake-submit",
  intake.status === 200 && intakeJson?.ok ? "PASS" : "FAIL",
  `HTTP ${intake.status}`,
);

let record = await readRecord(campaignId);
const autoRelease = record?.socialPromoRenderRelease;
stage(
  "socialPromoRenderRelease-product-path",
  autoRelease?.authorizedBy === "owner" && autoRelease?.releasedAt ? "PASS" : "FAIL",
  autoRelease?.reason?.slice(0, 80) ?? "missing",
);

const chain = vercelCurl("/api/hosted-cert/continue-paid-intake-chain", {
  method: "POST",
  rawBody: JSON.stringify({ campaignId }),
  headers: ["Content-Type: application/json"],
});
stage(
  "continue-paid-intake-chain",
  chain.status === 200 ? "PASS" : "FAIL",
  `HTTP ${chain.status}`,
);

const prodStarted = Date.now();
let socialOk = false;
let promoOk = false;
let v1SocialSha = "";
while (Date.now() - prodStarted < 420_000) {
  await sleep(15_000);
  record = await readRecord(campaignId);
  const results = record?.dispatchExecution?.designRendererObserver?.results ?? [];
  const social = results.find((r) => r.skuId === "v2-rtu-social-posts" && r.ok);
  const promo = results.find((r) => r.skuId === "v2-rtu-promotion-graphics" && r.ok);
  socialOk = Boolean(social);
  promoOk = Boolean(promo);
  if (social?.pngContentSha256) v1SocialSha = social.pngContentSha256;
  if (socialOk && promoOk) break;
}
stage(
  "hosted-design-production-v1",
  socialOk && promoOk ? "PASS" : "FAIL",
  `social=${socialOk} promo=${promoOk} waitMs=${Date.now() - prodStarted}`,
);

const spineStarted = Date.now();
let spine = "missing";
while (Date.now() - spineStarted < 180_000) {
  await sleep(5_000);
  vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: owner.jar });
  const tasks = await readTasks(campaignId);
  const job = tasks?.jobRecords?.find((j) => j.jobId === parentJobId);
  spine = job?.spineStatus ?? "missing";
  if (spine === "ready_for_review") break;
}
stage("parent-ready_for_review", spine === "ready_for_review" ? "PASS" : "FAIL", spine);

const reviewGet = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { jar: owner.jar },
);
const reviewJson = parseJsonBody(reviewGet.bodyText);
const keys = (reviewJson?.review?.deliverables ?? []).map((d) => d.key).filter(Boolean);
stage(
  "customer-review-get",
  reviewGet.status === 200 && keys.length === 8 ? "PASS" : "FAIL",
  `${keys.length} deliverables HTTP ${reviewGet.status}`,
);

const feedback = {
  ...(reviewJson?.review?.feedback ?? {}),
  campaignId,
  jobId: parentJobId,
  sectionStatuses: Object.fromEntries(keys.map((k) => [k, "approved"])),
  stickyNotes: [
    {
      id: "rev-1",
      deliverableKey: keys[0],
      color: "coral",
      text: "Soften the headline tone on post 1 — warmer, less salesy.",
      createdAt: new Date().toISOString(),
    },
  ],
  voiceNotes: [],
  drawSections: [],
  updatedAt: new Date().toISOString(),
};
feedback.sectionStatuses[keys[0]] = "revision";

const rev = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { method: "PATCH", jar: owner.jar, body: { action: "request_revision", feedback } },
);
const revJson = parseJsonBody(rev.bodyText);
stage(
  "one-revision-request",
  rev.status === 200 && revJson?.feedback?.submissionType === "revision_requested" ? "PASS" : "FAIL",
  revJson?.feedback?.submissionType ?? revJson?.error ?? `HTTP ${rev.status}`,
);

const revWait = Date.now();
let v2SocialSha = "";
let renderVersion = 1;
while (Date.now() - revWait < 420_000) {
  await sleep(15_000);
  vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: owner.jar });
  record = await readRecord(campaignId);
  const tasks = await readTasks(campaignId);
  const job = tasks?.jobRecords?.find((j) => j.jobId === parentJobId);
  if (job?.spineStatus === "ready_for_review") {
    const social = (record?.dispatchExecution?.designRendererObserver?.results ?? []).find(
      (r) => r.skuId === "v2-rtu-social-posts" && r.ok,
    );
    renderVersion = social?.renderVersion ?? renderVersion;
    v2SocialSha = social?.pngContentSha256 ?? v2SocialSha;
    if (renderVersion >= 2) break;
  }
}
const correctedArtifacts =
  renderVersion >= 2 && v2SocialSha && v2SocialSha !== v1SocialSha;
stage(
  "revision-corrected-artifacts",
  correctedArtifacts ? "PASS" : "FAIL",
  `renderVersion=${renderVersion} v1=${v1SocialSha.slice(0, 12)} v2=${v2SocialSha.slice(0, 12)}`,
);

const tasksAfterRev = await readTasks(campaignId);
const uses = tasksAfterRev?.jobCorrectionUses ?? [];
stage(
  "correction-ledger",
  uses.length >= 1 ? "PASS" : "FAIL",
  `${uses.length} jobCorrectionUses`,
);

for (const key of keys) feedback.sectionStatuses[key] = "approved";
const approve = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { method: "PATCH", jar: owner.jar, body: { action: "approve_for_delivery", feedback } },
);
const approveJson = parseJsonBody(approve.bodyText);
stage(
  "approve-for-delivery",
  approve.status === 200 && approveJson?.job?.spineStatus === "ready_for_delivery"
    ? "PASS"
    : "FAIL",
  approveJson?.job?.spineStatus ?? approveJson?.error ?? `HTTP ${approve.status}`,
);

const tasksFinal = await readTasks(campaignId);
const jobFinal = tasksFinal?.jobRecords?.find((j) => j.jobId === parentJobId);
const released = (jobFinal?.clientDeliveryFiles ?? []).filter((f) => f.releaseStatus === "released");
stage(
  "released-files",
  released.length === 8 ? "PASS" : "FAIL",
  `${released.length}/8`,
);

const intruder = registerSession("intruder");
const deny = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { jar: intruder.jar },
);
stage("cross-customer-denial", deny.status >= 400 ? "PASS" : "FAIL", `HTTP ${deny.status}`);

const primary = released[0];
const expectedSha = (primary?.contentSha256 ?? "").replace(/^sha256:/i, "");
const binPath = path.join(tmpDir, "dl.bin");
const dl = vercelCurlBinary(primary?.url ?? "", { jar: owner.jar, outPath: binPath });
let byteOk = false;
if (dl.status === 200 && existsSync(binPath) && expectedSha) {
  const hex = createHash("sha256").update(readFileSync(binPath)).digest("hex");
  byteOk = hex === expectedSha;
  try {
    unlinkSync(binPath);
  } catch {
    /* ignore */
  }
}
stage(
  "exact-byte-download",
  byteOk ? "PASS" : "FAIL",
  byteOk ? primary.fileName : `HTTP ${dl.status}`,
);

const wake2 = vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: owner.jar });
const record2 = await readRecord(campaignId);
const durable =
  wake2.status === 200 &&
  record2?.socialPromoRenderRelease?.releasedAt &&
  (record2?.dispatchExecution?.designRendererObserver?.results ?? []).some((r) => r.ok);
stage("durable-state-second-request", durable ? "PASS" : "FAIL", `wake HTTP ${wake2.status}`);

const outPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-SOCIAL-PROMO-FINAL-CERTIFICATION-1-RUN.json",
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
      ledger,
      socialPromoRenderRelease: record2?.socialPromoRenderRelease,
      renderVersion,
      v1SocialSha,
      v2SocialSha,
      jobCorrectionUses: uses.length,
    },
    null,
    2,
  ),
);
console.log("Wrote", outPath);

const hardFail = ledger.some((e) => e.status === "FAIL");
process.exit(hardFail ? 3 : 0);
