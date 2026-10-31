/**
 * Verify hosted launch-menu chain persists a fresh dispatch.lastAttemptAt (Preview cert).
 * Usage: node scripts/hosted-clip-launch-menu-write-probe-1.mjs <dpl_...> [campaignId]
 */
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
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const ownerEmail = "hpt-cert-clip_repurposing-2d52e67f@example.com";

if (!deploymentId?.startsWith("dpl_")) {
  console.error("Usage: node scripts/hosted-clip-launch-menu-write-probe-1.mjs <dpl_...> [campaignId]");
  process.exit(2);
}

loadEnvLocal(repoRoot);
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const { vercelCurl } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir: path.join(repoRoot, ".tmp-launch-write-probe"),
});
const jar = path.join(repoRoot, ".tmp-launch-write-probe", "owner.cookies.txt");

async function readLastAttempt() {
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [
    campaignId,
  ]);
  await c.end();
  let env = r.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  const rec = env?.record ?? env;
  return rec?.dispatchExecution?.lastAttemptAt ?? null;
}

const before = await readLastAttempt();
const prodStarted = Date.now();

vercelCurl("/api/auth/login", {
  method: "POST",
  jar,
  body: { email: ownerEmail, password: requireHostedCertTestPassword() },
});

const trigger = vercelCurl(
  "/api/hosted-cert/continue-paid-intake-chain?scope=launch-menu-only&mode=async",
  {
    method: "POST",
    jar,
    rawBody: JSON.stringify({ campaignId }),
    headers: ["Content-Type: application/json"],
  },
);
const triggerJson = parseJsonBody(trigger.bodyText);

let freshAttempt = false;
let observedFresh = false;
for (let i = 0; i < 24 && !freshAttempt; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const lastAttemptAt = await readLastAttempt();
  if (lastAttemptAt && new Date(lastAttemptAt).getTime() >= prodStarted) {
    freshAttempt = true;
  }
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [
    campaignId,
  ]);
  await c.end();
  let env = r.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  const rec = env?.record ?? env;
  const observedAt = rec?.dispatchExecution?.launchMenuProductionObserver?.observedAt;
  if (observedAt && new Date(observedAt).getTime() >= prodStarted) {
    observedFresh = true;
    break;
  }
}

console.log(
  JSON.stringify(
    {
      deploymentId,
      campaignId,
      triggerStatus: trigger.status,
      triggerMode: triggerJson?.mode,
      beforeLastAttemptAt: before,
      freshLastAttemptAt: freshAttempt,
      freshObserverObservedAt: observedFresh,
      pass: trigger.status === 200 && freshAttempt,
    },
    null,
    2,
  ),
);
process.exit(trigger.status === 200 && freshAttempt ? 0 : 1);
