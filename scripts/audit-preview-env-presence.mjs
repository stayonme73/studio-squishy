/** Prints presence/mode checks only — no secret values. */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const TEST = "tzyglhypseyokhbeozjw";
const PROD = "txgzguzlojlhndkbncc";

function parseEnv(filePath) {
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

const keys = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_MODE",
  "DATABASE_URL",
  "STUDIO_PERSISTENCE_TEST_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "STUDIO_PERSISTENCE_TEST_SUPABASE_URL",
  "SUPABASE_STORAGE_BUCKET",
  "STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET",
  "STUDIO_PERSISTENCE_BACKEND",
  "SESSION_SECRET",
];

const local = parseEnv(envPath);
for (const k of keys) {
  const v = local[k];
  if (!v) {
    console.log(`${k}: MISSING in .env.local`);
    continue;
  }
  let mode = "present";
  if (k === "STRIPE_SECRET_KEY") mode = v.startsWith("sk_test_") ? "sk_test_* OK" : "NOT sk_test_";
  else if (k === "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY")
    mode = v.startsWith("pk_test_") ? "pk_test_* OK" : "NOT pk_test_";
  else if (k === "STRIPE_WEBHOOK_SECRET")
    mode = v.startsWith("whsec_") ? "whsec_* OK" : "unexpected prefix";
  else if (k === "DATABASE_URL" || k === "STUDIO_PERSISTENCE_TEST_DATABASE_URL")
    mode = v.includes(TEST) && !v.includes(PROD) ? "Test ref OK" : "ref check FAIL";
  else if (k === "NEXT_PUBLIC_SUPABASE_URL" || k === "STUDIO_PERSISTENCE_TEST_SUPABASE_URL")
    mode = v.includes(TEST) ? "Test ref OK" : "ref check FAIL";
  else if (k === "SUPABASE_STORAGE_BUCKET" || k === "STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET")
    mode = v === "studio-files-test" ? "studio-files-test OK" : `bucket=${v}`;
  else if (k === "SESSION_SECRET") mode = v.length >= 32 ? "length OK" : "too short";
  else mode = v;
  console.log(`${k}: ${mode}`);
}
