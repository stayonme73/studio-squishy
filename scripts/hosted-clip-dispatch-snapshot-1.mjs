import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const campaignId =
  process.argv[2]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
loadEnvLocal(repoRoot);

const c = new pg.Client({
  connectionString: process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const r = await c.query(`SELECT envelope FROM studio_campaigns WHERE campaign_id = $1`, [
  campaignId,
]);
await c.end();

let env = r.rows[0]?.envelope;
if (typeof env === "string") env = JSON.parse(env);
const hit = (env?.record?.dispatchExecution?.launchMenuProductionObserver?.results ?? [])
  .filter((x) => x.skuId === "v2-rtu-clip-repurposing" && x.action === "invoked")
  .at(-1);
const rec = env?.record?.dispatchExecution?.records?.find(
  (x) => x.skuId === "v2-rtu-clip-repurposing",
);
console.log(
  JSON.stringify(
    {
      campaignId,
      observedAt: env?.record?.dispatchExecution?.launchMenuProductionObserver?.observedAt,
      observerMessage: hit?.message,
      observerOk: hit?.ok,
      failureCode: hit?.failureCode,
      executionIdentityReady: rec?.executionIdentityReady,
    },
    null,
    2,
  ),
);
