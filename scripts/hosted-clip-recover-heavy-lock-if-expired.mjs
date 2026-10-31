/**
 * Preview cert only — release orphaned heavy lock when worker window likely ended.
 * Default: claim older than 14 minutes with no spine movement.
 */
import pg from "pg";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  process.env[t.slice(0, eq).trim()] ??= t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
}

const campaignId =
  process.argv[2]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const minAgeMs = Number(process.argv[3] ?? 14 * 60_000);

const c = new pg.Client({
  connectionString: process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const claim = await c.query(
  `SELECT claim_id, job_id, campaign_id, heartbeat_at FROM studio_lane_claims WHERE lane = 'heavy' LIMIT 1`,
);
const row = claim.rows[0];
if (!row) {
  console.log(JSON.stringify({ action: "none", reason: "no_heavy_claim" }));
  await c.end();
  process.exit(0);
}
if (row.campaign_id !== campaignId) {
  console.log(
    JSON.stringify({ action: "refused", reason: "campaign_mismatch", heldBy: row.campaign_id }),
  );
  await c.end();
  process.exit(2);
}
const beat = new Date(row.heartbeat_at).getTime();
const ageMs = Date.now() - beat;
if (ageMs < minAgeMs) {
  console.log(JSON.stringify({ action: "wait", ageMs, minAgeMs, jobId: row.job_id }));
  await c.end();
  process.exit(0);
}
const tasks = await c.query(`SELECT envelope FROM studio_campaign_tasks WHERE campaign_id = $1`, [
  campaignId,
]);
let env = tasks.rows[0]?.envelope;
if (typeof env === "string") env = JSON.parse(env);
const job = (env?.record?.jobRecords ?? env?.jobRecords ?? []).find((j) =>
  j.jobId?.includes("clip-repurposing"),
);
if (job?.spineStatus && job.spineStatus !== "ready_for_queue") {
  console.log(JSON.stringify({ action: "refused", reason: "spine_moved", spine: job.spineStatus }));
  await c.end();
  process.exit(2);
}
await c.query(`DELETE FROM studio_lane_claims WHERE claim_id = $1`, [row.claim_id]);
await c.end();
console.log(JSON.stringify({ action: "released", jobId: row.job_id, ageMs }));
