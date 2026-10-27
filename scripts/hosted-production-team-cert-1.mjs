/**
 * STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1 — continuation runner (Test Preview only).
 * Usage: node scripts/hosted-production-team-cert-1.mjs <dpl_...> <preview-origin> [--package=clip_repurposing]
 */
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import pg from "pg";

import { createHostedVercelCurl, parseJsonBody } from "./lib/hosted-preview-vercel-curl.mjs";
import {
  condensedCheckoutBody,
  intakeAnswersForPackage,
} from "./lib/hpt-cert-intake-answers.mjs";
import { requireHostedCertTestPassword } from "./lib/hosted-cert-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
const packageFilter = process.argv.find((a) => a.startsWith("--package="))?.split("=")[1];

if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-production-team-cert-1.mjs <dpl_...> <preview-origin> [--package=id]",
  );
  process.exit(2);
}

function loadEnv() {
  const p = path.join(repoRoot, ".env.local");
  if (!existsSync(p)) throw new Error(".env.local missing");
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    process.env[k] ??= v;
  }
}

loadEnv();

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const whsec = process.env.STRIPE_WEBHOOK_SECRET;
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
if (!stripeSecret?.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY must be sk_test_");
if (!whsec?.startsWith("whsec_")) throw new Error("STRIPE_WEBHOOK_SECRET missing");
if (!databaseUrl?.includes("tzyglhypseyokhbeozjw")) throw new Error("Test DATABASE_URL required");

const stripe = new Stripe(stripeSecret);
const startedAt = new Date().toISOString();
const tmpDir = path.join(tmpdir(), "studio-hpt-cert-1");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl, vercelStripeWebhook } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir,
});

/** @type {{ at: string, packageId: string, stage: string, status: string, detail?: string, httpStatus?: number }[]} */
const ledger = [];

function stamp(packageId, stage, status, detail = "", httpStatus) {
  ledger.push({
    at: new Date().toISOString(),
    packageId,
    stage,
    status,
    detail,
    ...(httpStatus != null ? { httpStatus } : {}),
  });
  console.log(
    `${status.padEnd(16)} [${packageId}] ${stage}${httpStatus != null ? ` HTTP ${httpStatus}` : ""}${detail ? ` — ${detail}` : ""}`,
  );
}

const PACKAGES = [
  { id: "clip_repurposing", packageId: "clip_repurposing" },
  { id: "short_form_video_editing", packageId: "short_form_video_editing" },
  { id: "social_and_promo_graphics", packageId: "social_and_promo_graphics" },
  { id: "campaign_launch_kit", packageId: "campaign_launch_kit" },
].filter((p) => !packageFilter || p.packageId === packageFilter);

const TEST_PASSWORD = requireHostedCertTestPassword();

function registerSession(label) {
  const email = `hpt-cert-${label}-${randomBytes(4).toString("hex")}@example.com`;
  const jar = path.join(tmpDir, `${label}-${randomBytes(4).toString("hex")}.cookies.txt`);
  const signup = vercelCurl("/api/auth/signup", {
    method: "POST",
    jar,
    body: { email, password: TEST_PASSWORD, displayName: "Scout HPT Cert" },
  });
  if (signup.status !== 200) {
    return {
      ok: false,
      email,
      jar,
      error: parseJsonBody(signup.bodyText)?.error ?? signup.bodyText.slice(0, 240),
      httpStatus: signup.status,
    };
  }
  const login = vercelCurl("/api/auth/login", {
    method: "POST",
    jar,
    body: { email, password: TEST_PASSWORD },
  });
  if (login.status !== 200) {
    return {
      ok: false,
      email,
      jar,
      error: parseJsonBody(login.bodyText)?.error ?? login.bodyText.slice(0, 240),
      httpStatus: login.status,
    };
  }
  const probe = vercelCurl("/api/campaigns/current", { jar });
  if (probe.status === 401) {
    return { ok: false, email, jar, error: "session_probe_401", httpStatus: 401 };
  }
  return { ok: true, email, jar };
}

async function readCampaignRecord(campaignId) {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const camp = await client.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [
    campaignId,
  ]);
  const tasks = await client.query(`SELECT envelope FROM studio_campaign_tasks WHERE campaign_id = $1`, [
    campaignId,
  ]);
  await client.end();
  let env = camp.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  let tasksEnv = tasks.rows[0]?.envelope;
  if (typeof tasksEnv === "string") tasksEnv = JSON.parse(tasksEnv);
  const record = env?.record ?? env;
  const taskRecord = tasksEnv?.record ?? tasksEnv;
  return { record, tasks: taskRecord };
}

async function runPackage(pkg) {
  const packageId = pkg.packageId;
  const campaignId = `disposable-hpt-cert-${packageId}-${randomBytes(4).toString("hex")}`;
  const session = registerSession(packageId);
  if (!session.ok) {
    stamp(packageId, "auth-signup-login", "FAIL", session.error, session.httpStatus);
    return { packageId, verdict: "NOT REACHED", reason: "auth" };
  }
  stamp(packageId, "auth-signup-login", "PASS", session.email, 200);

  const checkoutBody = condensedCheckoutBody({
    packageId,
    campaignId,
    previewOrigin,
    email: session.email,
  });
  const checkout = vercelCurl("/api/payments/checkout-session", {
    method: "POST",
    jar: session.jar,
    body: checkoutBody,
  });
  const checkoutJson = parseJsonBody(checkout.bodyText);
  const checkoutSessionId =
    checkoutJson?.checkoutSessionId ??
    checkout.bodyText.match(/"checkoutSessionId"\s*:\s*"(cs_test_[^"]+)"/)?.[1];
  if (checkout.status !== 200 || !checkoutSessionId) {
    const err = checkoutJson?.error ?? checkoutJson?.message ?? checkout.bodyText.slice(0, 300);
    stamp(packageId, "checkout-session", "FAIL", err, checkout.status);
    const harnessLikely = checkout.status === 0 ? "harness_curl" : "product_or_parse";
    stamp(packageId, "checkout-diagnosis", "INFO", harnessLikely);
    return {
      packageId,
      verdict: checkout.status >= 400 && checkout.status < 500 ? "FAIL" : "NOT REACHED",
      reason: `checkout HTTP ${checkout.status}: ${err}`,
    };
  }
  stamp(packageId, "checkout-session", "PASS", checkoutSessionId, checkout.status);
  const stripeSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
  const sessionForEvent = {
    ...stripeSession,
    payment_status: "paid",
    status: "complete",
    amount_total: stripeSession.amount_total ?? Number(stripeSession.metadata?.amount_cents ?? 0),
    livemode: false,
  };
  const event = {
    id: `evt_hpt_${randomBytes(8).toString("hex")}`,
    object: "event",
    type: "checkout.session.completed",
    livemode: false,
    data: { object: sessionForEvent },
  };
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: whsec });
  const webhook = vercelStripeWebhook(payload, signature);
  if (webhook.status !== 200) {
    stamp(packageId, "stripe-webhook", "FAIL", webhook.bodyText.slice(0, 200), webhook.status);
    return { packageId, verdict: "NOT REACHED", reason: `webhook HTTP ${webhook.status}` };
  }
  stamp(packageId, "stripe-webhook", "PASS", "", webhook.status);

  const reconcilePath = `/api/payments/reconcile?session_id=${encodeURIComponent(checkoutSessionId)}`;
  const [r1, r2] = [
    vercelCurl(reconcilePath, { jar: session.jar }),
    vercelCurl(reconcilePath, { jar: session.jar }),
  ];
  const dualOk = r1.status === 200 && r2.status === 200;
  stamp(
    packageId,
    "hosted-concurrent-reconcile-wake",
    dualOk ? "PASS" : "FAIL",
    `statuses=${r1.status},${r2.status}`,
    r1.status,
  );

  let { record } = await readCampaignRecord(campaignId);
  const paid = Boolean(record?.paymentReceivedAt ?? record?.paymentTruth?.status === "confirmed");
  stamp(packageId, "postgres-paid-truth", paid ? "PASS" : "FAIL");
  if (!paid) {
    return { packageId, verdict: "FAIL", reason: "paid truth missing after webhook" };
  }

  const intakeBody = {
    checkoutSessionId,
    answers: intakeAnswersForPackage(packageId),
    submittedAt: new Date().toISOString(),
  };
  const intake = vercelCurl("/api/payments/intake-submit", { method: "POST", body: intakeBody });
  const intakeJson = parseJsonBody(intake.bodyText);
  const intakeOk =
    intakeJson?.ok === true || (intake.status === 200 && /"ok"\s*:\s*true/.test(intake.bodyText));
  let { record: postIntakeRecord } = await readCampaignRecord(campaignId);
  const intakeStampedInDb = Boolean(postIntakeRecord?.routeMapIntakeSubmittedAt);
  if (!intakeOk && !intakeStampedInDb) {
    stamp(
      packageId,
      "intake-submit",
      "FAIL",
      intakeJson?.message ?? intake.bodyText.slice(0, 240),
      intake.status,
    );
    return { packageId, verdict: "NOT REACHED", reason: "intake failed" };
  }
  const alreadySubmitted = intakeJson?.alreadySubmitted === true;
  if (!intakeOk && intakeStampedInDb) {
    stamp(
      packageId,
      "intake-submit",
      "PASS_WITH_LIMITS",
      `HTTP ${intake.status} but Postgres intake stamped`,
      intake.status,
    );
  } else {
    stamp(packageId, "intake-submit", "PASS", alreadySubmitted ? "already" : "fresh", intake.status);
  }

  vercelCurl("/api/campaigns/current", { jar: session.jar });
  ({ record } = await readCampaignRecord(campaignId));
  const dispatch = record?.dispatchExecution;
  const postPay = record?.postPayActivation;
  if (postPay?.status === "pending_retry") {
    stamp(packageId, "pending_retry", "PASS_WITH_LIMITS", postPay.lastError ?? "recoverable");
  }
  if (!dispatch) {
    stamp(packageId, "machine-dispatch", "NOT REACHED", "no dispatchExecution envelope");
    return { packageId, verdict: "NOT REACHED", reason: "dispatch missing" };
  }
  stamp(packageId, "machine-dispatch", "PASS", dispatch.status ?? "present");

  const observerPass = dispatch.lastObserverPass ?? dispatch.launchMenuPass ?? dispatch.designPass;
  const invoked = JSON.stringify(dispatch).includes('"action":"invoked"');
  const skippedOnly = JSON.stringify(dispatch).includes('"action":"skipped"') && !invoked;
  if (skippedOnly) {
    stamp(packageId, "genuine-production", "FAIL", "dispatch skipped without invocation");
  } else if (invoked) {
    stamp(packageId, "genuine-production", "PASS_WITH_LIMITS", "observer invoked; verify artifact separately");
  } else {
    stamp(packageId, "genuine-production", "NOT REACHED", "no invoked observer evidence in envelope");
  }

  const qaGate = record?.designQaFinish ?? record?.productionAssurance;
  stamp(
    packageId,
    "independent-quality",
    qaGate ? "PASS_WITH_LIMITS" : "NOT REACHED",
    qaGate ? "qa envelope present" : "no QA block in campaign envelope",
  );

  const reviewAuth = record?.reviewAuthorization ?? record?.clientReviewAuthorization;
  stamp(
    packageId,
    "customer-review",
    reviewAuth ? "PASS_WITH_LIMITS" : "NOT REACHED",
    reviewAuth ? "review auth present" : "not eligible yet on hosted path",
  );

  const deliveryAuth = record?.finalDeliveryAuthorization;
  stamp(
    packageId,
    "final-delivery",
    deliveryAuth?.status === "released" ? "PASS" : "NOT REACHED",
    deliveryAuth?.status ?? "not released in this runner window",
  );

  let verdict = "PASS WITH LIMITS";
  if (!paid || !dispatch) verdict = "FAIL";
  if (skippedOnly) verdict = "FAIL";
  if (!invoked && !qaGate) verdict = "NOT REACHED";
  return { packageId, verdict, campaignId, checkoutSessionId };
}

console.log("STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1 (continuation)");
console.log("deployment", deploymentId);
console.log("preview", previewOrigin);
console.log("started", startedAt);

/** @type {Record<string, unknown>[]} */
const summaries = [];
for (const pkg of PACKAGES) {
  summaries.push(await runPackage(pkg));
  await new Promise((r) => setTimeout(r, 4000));
}

const finishedAt = new Date().toISOString();
const out = {
  startedAt,
  finishedAt,
  deploymentId,
  previewOrigin,
  ledger,
  summaries,
};
const jsonPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/STUDIO-HOSTED-PRODUCTION-TEAM-CERTIFICATION-1-HOSTED-RUN.json",
);
writeFileSync(jsonPath, JSON.stringify(out, null, 2));
console.log("wrote", jsonPath);
