/**
 * Apply studio_lane_claims to Test Postgres only (tzyglhypseyokhbeozjw guard).
 */
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

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

const url = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
if (!url?.includes("tzyglhypseyokhbeozjw")) {
  throw new Error("Refusing: STUDIO_PERSISTENCE_TEST_DATABASE_URL must be Test project");
}

const sql = readFileSync(
  path.join(repoRoot, "supabase/migrations/20261027200000_studio_lane_claims.sql"),
  "utf8",
);

const pool = new pg.Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await pool.query(sql);
await pool.end();
console.log("OK studio_lane_claims migration applied on Test Postgres");
