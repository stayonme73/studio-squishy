/**
 * STUDIO-NEW-SITE-PREVIEW-DEPLOY-1 — set Preview-scoped Vercel env from .env.local (no stdout secrets).
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const envPath = path.join(repoRoot, ".env.local");

const TEST_REF = "tzyglhypseyokhbeozjw";
const PROD_REF = "txgzguzlojlhndkbncc";

function parseEnvFile(filePath) {
  const out = {};
  if (!existsSync(filePath)) return out;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function assertTestOnly(key, value) {
  if (!value) throw new Error(`${key} missing`);
  if (value.includes(PROD_REF)) {
    throw new Error(`STOP: ${key} references Production ref ${PROD_REF}`);
  }
  if (key === "STRIPE_SECRET_KEY" && !value.startsWith("sk_test_")) {
    throw new Error("STOP: STRIPE_SECRET_KEY is not sk_test_");
  }
  if (key === "DATABASE_URL" && !value.includes(TEST_REF)) {
    throw new Error(`STOP: DATABASE_URL must target Persistence Test ref ${TEST_REF}`);
  }
  if (key === "NEXT_PUBLIC_SUPABASE_URL" && !value.includes(TEST_REF)) {
    throw new Error("STOP: NEXT_PUBLIC_SUPABASE_URL must be Test project");
  }
}

function vercelEnvAdd(name, value, previewOnly = true) {
  const args = ["vercel", "env", "add", name, previewOnly ? "preview" : "development", "--force"];
  const r = spawnSync("npx", args, {
    cwd: repoRoot,
    input: value,
    encoding: "utf8",
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    console.error(`Failed to set ${name}: ${r.stderr?.slice(0, 200) || r.stdout?.slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`Set Preview env: ${name}`);
}

const local = parseEnvFile(envPath);
const sessionSecret = randomBytes(48).toString("base64url");

const databaseUrl = local.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const supabaseUrl = local.STUDIO_PERSISTENCE_TEST_SUPABASE_URL;
const serviceRole = local.STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY;
const bucket = local.STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET || "studio-files-test";
const stripeSecret = local.STRIPE_SECRET_KEY;
const stripePk = local.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripeWh = local.STRIPE_WEBHOOK_SECRET;

assertTestOnly("DATABASE_URL", databaseUrl);
assertTestOnly("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
assertTestOnly("STRIPE_SECRET_KEY", stripeSecret);

const pairs = [
  ["SESSION_SECRET", sessionSecret],
  ["STUDIO_PERSISTENCE_BACKEND", "postgres"],
  ["DATABASE_URL", databaseUrl],
  ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
  ["SUPABASE_SERVICE_ROLE_KEY", serviceRole],
  ["SUPABASE_STORAGE_BUCKET", bucket],
  ["TRANSACTIONAL_EMAIL_PROVIDER", "none"],
  ["NEXT_PUBLIC_PAYMENT_SANDBOX", "1"],
  ["STRIPE_SECRET_KEY", stripeSecret],
  ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", stripePk],
  ["STRIPE_MODE", "test"],
  ["STRIPE_WEBHOOK_SECRET", stripeWh],
  ["STUDIO_PERSISTENCE_PRODUCTION_PROJECT_REF", PROD_REF],
];

for (const [k, v] of pairs) {
  if (!v?.trim()) {
    console.error(`Missing value for ${k} in .env.local`);
    process.exit(2);
  }
  vercelEnvAdd(k, v.trim());
}

console.log("Preview env configured (SESSION_SECRET is new; NEXT_PUBLIC_SITE_URL set after first deploy URL).");
