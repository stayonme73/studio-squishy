import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  process.env[t.slice(0, eq).trim()] = v;
}

const checkoutSessionId = process.argv[2];
const client = new pg.Client({
  connectionString: process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL,
});
await client.connect();
const sess = await client.query(
  `SELECT campaign_id FROM studio_payment_sessions WHERE checkout_session_id = $1`,
  [checkoutSessionId],
);
const campaignId = sess.rows[0]?.campaign_id;
const camp = await client.query(
  `SELECT (envelope->'record'->>'paymentReceivedAt') IS NOT NULL AS paid FROM studio_campaigns WHERE campaign_id = $1`,
  [campaignId],
);
const ev = await client.query(
  `SELECT COUNT(*)::int AS n FROM studio_payment_events WHERE campaign_id = $1`,
  [campaignId],
);
await client.end();
console.log(JSON.stringify({ campaignId, paid: camp.rows[0]?.paid, paymentEvents: ev.rows[0]?.n }));
