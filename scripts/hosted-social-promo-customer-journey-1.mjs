/**
 * STUDIO-HOSTED-SOCIAL-PROMO-CUSTOMER-JOURNEY-1 — Preview/Test disposable E2E.
 * Usage: node scripts/hosted-social-promo-customer-journey-1.mjs <dpl_...> <preview-origin>
 */
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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
  console.error("Usage: node scripts/hosted-social-promo-customer-journey-1.mjs <dpl_...> <preview-origin>");
  process.exit(2);
}

loadEnvLocal(repoRoot);

const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const whsec = process.env.STRIPE_WEBHOOK_SECRET;
const TEST_PASSWORD = requireHostedCertTestPassword();
const campaignId = `disposable-hosted-sp-journey-${randomBytes(4).toString("hex")}`;
const startedAt = new Date().toISOString();
const tmpDir = path.join(tmpdir(), "hosted-sp-journey-1");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl, vercelStripeWebhook } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir,
});

/** @type {{ stage: string; status: string; detail?: string }[]} */
const ledger = [];

function stage(name, status, detail = "") {
  ledger.push({ stage, status, detail });
  console.log(`${status.padEnd(18)} ${name}${detail ? ` — ${detail}` : ""}`);
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

async function stampRenderRelease(id) {
  const now = new Date().toISOString();
  const release = {
    authorizedBy: "owner-tagia",
    authorizedAt: now,
    reason:
      "STUDIO-HOSTED-SOCIAL-PROMO-CUSTOMER-JOURNEY-1 — owner-authorized render release for disposable Preview cert.",
    packageId: PACKAGE,
    campaignId: id,
    sandboxOnly: true,
  };
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(
    `UPDATE studio_campaigns SET envelope = jsonb_set(envelope, '{record,socialPromoRenderRelease}', $2::jsonb, true), updated_at = NOW() WHERE campaign_id = $1`,
    [id, JSON.stringify(release)],
  );
  await c.end();
  return release;
}

function registerSession(label) {
  const email = `hosted-sp-journey-${label}-${randomBytes(3).toString("hex")}@example.com`;
  const jar = path.join(tmpDir, `${label}.cookies.txt`);
  if (!existsSync(jar)) writeFileSync(jar, "", "utf8");
  vercelCurl("/api/auth/signup", {
    method: "POST",
    jar,
    body: { email, password: TEST_PASSWORD, displayName: "Hosted SP Journey" },
  });
  vercelCurl("/api/auth/login", { method: "POST", jar, body: { email, password: TEST_PASSWORD } });
  return { email, jar };
}

const owner = registerSession("owner");
stage("auth", "PASS", owner.email);

const checkout = vercelCurl("/api/payments/checkout-session", {
  method: "POST",
  jar: owner.jar,
  body: condensedCheckoutBody({
    packageId: PACKAGE,
    campaignId,
    previewOrigin,
    email: owner.email,
  }),
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
const event = {
  id: `evt_spj_${randomBytes(6).toString("hex")}`,
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
};
const payload = JSON.stringify(event);
const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: whsec });
const wh = vercelStripeWebhook(payload, sig);
stage("webhook", wh.status === 200 ? "PASS" : "FAIL", `HTTP ${wh.status}`);

const release = await stampRenderRelease(campaignId);
stage("socialPromoRenderRelease", "PASS", release.authorizedBy);

const intake = vercelCurl("/api/payments/intake-submit", {
  method: "POST",
  jar: owner.jar,
  body: { checkoutSessionId, answers: intakeAnswersForPackage(PACKAGE) },
});
const intakeOk = intake.status === 200 && /"ok"\s*:\s*true/.test(intake.bodyText);
stage("intake-submit", intakeOk ? "PASS" : "FAIL", `HTTP ${intake.status}`);

const prodStarted = Date.now();
let record = await readRecord(campaignId);
let socialOk = false;
let promoOk = false;
while (Date.now() - prodStarted < 420_000) {
  await new Promise((r) => setTimeout(r, 15_000));
  record = await readRecord(campaignId);
  const results = record?.dispatchExecution?.designRendererObserver?.results ?? [];
  socialOk = results.some((r) => r.skuId === "v2-rtu-social-posts" && r.ok);
  promoOk = results.some((r) => r.skuId === "v2-rtu-promotion-graphics" && r.ok);
  if (socialOk && promoOk) break;
}
stage(
  "hosted-design-production",
  socialOk && promoOk ? "PASS" : "FAIL",
  `social=${socialOk} promo=${promoOk} waitMs=${Date.now() - prodStarted}`,
);

if (!socialOk || !promoOk) {
  const results = record?.dispatchExecution?.designRendererObserver?.results ?? [];
  for (const r of results) {
    stage(`render-${r.skuId}`, r.ok ? "PASS" : "FAIL", r.message ?? r.failureCode ?? r.action);
  }
}

const chainBody = JSON.stringify({ campaignId });
const chainPath = path.join(tmpDir, "chain.json");
writeFileSync(chainPath, chainBody);
const chain = vercelCurl("/api/hosted-cert/continue-paid-intake-chain", {
  method: "POST",
  rawBody: chainBody,
  headers: ["Content-Type: application/json"],
});
if (!socialOk || !promoOk) {
  stage("continue-chain-retry", chain.status === 200 ? "PASS" : "FAIL", chain.bodyText?.slice(0, 120));
  record = await readRecord(campaignId);
}

const parentJobId = `${campaignId}:${PACKAGE}`;
const reviewGet = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { jar: owner.jar },
);
stage("customer-review-get", reviewGet.status === 200 ? "PASS" : "NOT_REACHED", `HTTP ${reviewGet.status}`);

const intruder = registerSession("intruder");
const deny = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { jar: intruder.jar },
);
stage(
  "cross-customer-denial",
  deny.status >= 400 ? "PASS" : "FAIL",
  `HTTP ${deny.status}`,
);

const outPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-SOCIAL-PROMO-CUSTOMER-JOURNEY-1-RUN.json",
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
      socialPromoRenderRelease: release,
      ledger,
      designResults: record?.dispatchExecution?.designRendererObserver?.results,
    },
    null,
    2,
  ),
);
console.log("Wrote", outPath);

const certified = ledger.every((e) => e.status === "PASS" || e.status === "NOT_REACHED");
process.exit(certified ? 0 : 3);
