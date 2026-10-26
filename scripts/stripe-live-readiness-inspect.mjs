/**
 * Stripe live readiness inspector.
 * Prints prefixes and presence only. Never prints secret values.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function classifyPrefix(value) {
  const v = String(value ?? "").trim();
  if (!v) return "missing";
  if (v.startsWith("sk_live_")) return "sk_live";
  if (v.startsWith("sk_test_")) return "sk_test";
  if (v.startsWith("pk_live_")) return "pk_live";
  if (v.startsWith("pk_test_")) return "pk_test";
  if (v.startsWith("whsec_")) return "whsec_present";
  if (v.startsWith("mk_")) return "invalid_mk_prefix";
  return "present_nonstandard_prefix";
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return null;
  const out = {};
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function siteHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "unparseable";
  }
}

function classifyMode(value) {
  if (!value) return "unset";
  const trimmed = String(value).trim().toLowerCase();
  if (trimmed === "live" || trimmed === "test") return trimmed;
  return "present_nonstandard";
}

const files = [".env.local", ".env", ".env.production", ".env.production.local"];
const report = { files: {}, process: {} };

for (const name of files) {
  const parsed = parseEnvFile(resolve(process.cwd(), name));
  if (!parsed) {
    report.files[name] = { exists: false };
    continue;
  }
  report.files[name] = {
    exists: true,
    STRIPE_SECRET_KEY: classifyPrefix(parsed.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: classifyPrefix(parsed.STRIPE_WEBHOOK_SECRET),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: classifyPrefix(
      parsed.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    ),
    STRIPE_MODE: classifyMode(parsed.STRIPE_MODE),
    NEXT_PUBLIC_SITE_URL_HOST: parsed.NEXT_PUBLIC_SITE_URL
      ? siteHost(parsed.NEXT_PUBLIC_SITE_URL)
      : "unset",
    NEXT_PUBLIC_SITE_URL_IS_LOCAL: parsed.NEXT_PUBLIC_SITE_URL
      ? /localhost|127\.0\.0\.1/.test(parsed.NEXT_PUBLIC_SITE_URL)
      : null,
  };
}

report.process = {
  STRIPE_SECRET_KEY: classifyPrefix(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: classifyPrefix(process.env.STRIPE_WEBHOOK_SECRET),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: classifyPrefix(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  ),
  STRIPE_MODE: classifyMode(process.env.STRIPE_MODE),
  NEXT_PUBLIC_SITE_URL_HOST: process.env.NEXT_PUBLIC_SITE_URL
    ? siteHost(process.env.NEXT_PUBLIC_SITE_URL)
    : "unset",
};

console.log(JSON.stringify(report, null, 2));
