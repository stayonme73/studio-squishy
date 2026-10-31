import pg from "pg";
import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";
import path from "path";
import { fileURLToPath } from "url";

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
const hits = (env?.record?.dispatchExecution?.launchMenuProductionObserver?.results ?? [])
  .filter((x) => x.skuId === "v2-rtu-clip-repurposing")
  .slice(-12);
console.log(JSON.stringify(hits, null, 2));
