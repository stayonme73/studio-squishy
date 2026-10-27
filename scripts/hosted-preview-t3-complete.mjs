/**
 * Complete hosted Preview T3: signed test webhook → reconcile verify → Postgres spot-check.
 * Usage: node scripts/hosted-preview-t3-complete.mjs <dpl_...> <preview-origin> [checkoutSessionId]
 */
import { spawnSync } from "child_process";
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
let checkoutSessionId = process.argv[4]?.trim();

if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-preview-t3-complete.mjs <dpl_...> <preview-origin> [checkoutSessionId]",
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

function vercelCurl(route, { method = "GET", body, rawBody, headers = [] } = {}) {
  const args = ["vercel", "curl", route, "--deployment", deploymentId, "-X", method, "-i"];
  for (const h of headers) args.push("-H", h);
  if (rawBody != null) {
    const bodyPath = path.join(repoRoot, "tmp-hosted-webhook-payload.json");
    mkdirSync(path.dirname(bodyPath), { recursive: true });
    writeFileSync(bodyPath, rawBody, "utf8");
    args.push("-H", "Content-Type: application/json", "--data-binary", `@${bodyPath}`);
  } else if (body != null) {
    args.push("-H", "Content-Type: application/json", "-d", JSON.stringify(body));
  }
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const r = spawnSync(npxCmd, args, { cwd: repoRoot, encoding: "utf8", shell: false });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const headerEnd = out.indexOf("\r\n\r\n");
  const bodyText = headerEnd >= 0 ? out.slice(headerEnd + 4).trim() : out.trim();
  const statusMatch = out.match(/^HTTP\/[\d.]+ (\d+)/m);
  return { status: statusMatch ? Number(statusMatch[1]) : 0, bodyText };
}

if (!checkoutSessionId) {
  console.log("Creating checkout via hosted smoke helper…");
  const smoke = spawnSync(
    "node",
    ["scripts/hosted-preview-payment-smoke.mjs", deploymentId, previewOrigin],
    { cwd: repoRoot, encoding: "utf8", shell: true },
  );
  const idMatch =
    smoke.stdout.match(/"checkoutSessionId":"(cs_test_[^"]+)"/) ??
    smoke.stdout.match(/checkout_session_id\s+(\S+)/);
  checkoutSessionId = idMatch?.[1];
  if (!checkoutSessionId) {
    console.error(smoke.stdout);
    console.error(smoke.stderr);
    throw new Error("Could not obtain checkoutSessionId");
  }
}

const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
const campaignId =
  session.metadata?.studio_campaign_id ??
  session.metadata?.campaign_id ??
  session.metadata?.campaignId;
console.log("checkout_session_id", checkoutSessionId);
console.log("campaign_id", campaignId);

const sessionForEvent = {
  ...session,
  payment_status: "paid",
  status: "complete",
  amount_total: session.amount_total ?? Number(session.metadata?.amount_cents ?? 0),
  livemode: false,
};

const event = {
  id: `evt_test_${randomBytes(8).toString("hex")}`,
  object: "event",
  type: "checkout.session.completed",
  livemode: false,
  data: { object: sessionForEvent },
};

const payload = JSON.stringify(event);
const signature = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: whsec,
});

const webhook = vercelCurl("/api/payments/webhook", {
  method: "POST",
  rawBody: payload,
  headers: [`Stripe-Signature: ${signature}`],
});
console.log("webhook_status", webhook.status);
console.log("webhook_body", webhook.bodyText.slice(0, 400));

const reconcile = vercelCurl(
  `/api/payments/reconcile?session_id=${encodeURIComponent(checkoutSessionId)}`,
);
console.log("reconcile_status", reconcile.status);
console.log("reconcile_body", reconcile.bodyText.slice(0, 400));

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
const camp = await client.query(
  `SELECT campaign_id, (envelope->'record'->>'paymentReceivedAt') IS NOT NULL AS paid
   FROM studio_campaigns WHERE campaign_id = $1`,
  [campaignId],
);
const payEvt = await client.query(
  `SELECT COUNT(*)::int AS n FROM studio_payment_events WHERE campaign_id = $1`,
  [campaignId],
);
await client.end();

console.log("postgres_campaign", camp.rows[0] ?? null);
console.log("postgres_payment_events", payEvt.rows[0]?.n ?? 0);
