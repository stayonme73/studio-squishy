/**
 * Arm disposable clip-repurposing journey campaign (Test Stripe webhook — no live charge).
 * Stops after intake + dispatch; does not run production.
 *
 * Usage: node scripts/hosted-clip-factory-journey-arm-1.mjs <dpl_...> <preview-origin>
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
import { loadEnvLocal, requireHostedCertTestPassword } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
const packageId = "clip_repurposing";

if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error("Usage: node scripts/hosted-clip-factory-journey-arm-1.mjs <dpl_...> <preview-origin>");
  process.exit(2);
}

loadEnvLocal(repoRoot);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const whsec = process.env.STRIPE_WEBHOOK_SECRET;
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const TEST_PASSWORD = requireHostedCertTestPassword();
const campaignId = `disposable-hpt-cert-${packageId}-${randomBytes(4).toString("hex")}`;
const tmpDir = path.join(tmpdir(), "clip-factory-journey-arm");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl, vercelStripeWebhook } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir,
});

const email = `hpt-cert-${packageId}-${randomBytes(4).toString("hex")}@example.com`;
const jar = path.join(tmpDir, "session.cookies.txt");
for (const [url, body] of [
  ["/api/auth/signup", { email, password: TEST_PASSWORD, displayName: "Clip Factory Journey" }],
  ["/api/auth/login", { email, password: TEST_PASSWORD }],
]) {
  const r = vercelCurl(url, { method: "POST", jar, body });
  if (r.status !== 200) {
    console.error(JSON.stringify({ ok: false, stage: url, status: r.status }));
    process.exit(3);
  }
}

const checkout = vercelCurl("/api/payments/checkout-session", {
  method: "POST",
  jar,
  body: condensedCheckoutBody({ packageId, campaignId, previewOrigin, email }),
});
const checkoutJson = parseJsonBody(checkout.bodyText);
const checkoutSessionId = checkoutJson?.checkoutSessionId;
if (!checkoutSessionId) {
  console.error(JSON.stringify({ ok: false, stage: "checkout", status: checkout.status }));
  process.exit(4);
}

const stripeSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
const event = {
  id: `evt_journey_${randomBytes(8).toString("hex")}`,
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
const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: whsec });
const webhook = vercelStripeWebhook(payload, signature);
if (webhook.status !== 200) {
  console.error(JSON.stringify({ ok: false, stage: "webhook", status: webhook.status }));
  process.exit(5);
}

const intake = vercelCurl("/api/payments/intake-submit", {
  method: "POST",
  body: {
    checkoutSessionId,
    answers: intakeAnswersForPackage(packageId),
    submittedAt: new Date().toISOString(),
  },
});

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
const row = await client.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [
  campaignId,
]);
await client.end();
let env = row.rows[0]?.envelope;
if (typeof env === "string") env = JSON.parse(env);
const record = env?.record ?? env;

const out = {
  ok: true,
  campaignId,
  email,
  checkoutSessionId,
  intakeHttp: intake.status,
  paid: Boolean(record?.paymentReceivedAt),
  intakeSubmitted: Boolean(record?.routeMapIntakeSubmittedAt),
  dispatchReady: Boolean(record?.dispatchExecution?.records?.some((r) => r.executionIdentityReady)),
  productionMp4Count: 0,
  note: "Test-mode Stripe webhook only — no live customer charge.",
};
const outPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-FACTORY-JOURNEY-ARM-LATEST.json",
);
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ ...out, outPath }, null, 2));
