import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

/** Load `.env.local` without overwriting keys already set in the process environment. */
export function loadEnvLocal(repoRoot) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    process.env[key] ??= t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

/** Preview disposable cert accounts — must be set in `.env.local`, never committed. */
export function requireHostedCertTestPassword() {
  const password = process.env.STUDIO_HOSTED_CERT_TEST_PASSWORD?.trim();
  if (!password) {
    console.error(
      "Missing STUDIO_HOSTED_CERT_TEST_PASSWORD in environment or .env.local (Preview cert harness only).",
    );
    process.exit(2);
  }
  return password;
}

export function defaultRepoRootFromImportMeta(importMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "../..");
}
