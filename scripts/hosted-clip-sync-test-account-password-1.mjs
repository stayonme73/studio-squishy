/**
 * Sync Test Postgres password for the Clip Repurposing cert account to match
 * STUDIO_HOSTED_CERT_TEST_PASSWORD in .env.local (Preview harness only).
 *
 * Usage: node scripts/hosted-clip-sync-test-account-password-1.mjs [email]
 *
 * Does not print the password. Requires Test DATABASE_URL guard.
 */
import path from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

import { loadEnvLocal, requireHostedCertTestPassword } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CLIP_CERT_EMAIL = "hpt-cert-clip_repurposing-2d52e67f@example.com";
const TEST_PROJECT_REF = "tzyglhypseyokhbeozjw";
const PRODUCTION_PROJECT_REF = "txgzguzlojlhndkbncc";
const email = process.argv[2]?.trim() ?? DEFAULT_CLIP_CERT_EMAIL;

loadEnvLocal(repoRoot);
process.env.NODE_ENV ??= "development";
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL?.trim();
if (!databaseUrl?.includes(TEST_PROJECT_REF)) {
  console.error(JSON.stringify({ ok: false, code: "TEST_DATABASE_URL_REQUIRED" }));
  process.exit(2);
}
if (databaseUrl.includes(PRODUCTION_PROJECT_REF)) {
  console.error(JSON.stringify({ ok: false, code: "PRODUCTION_DATABASE_REF_REJECTED" }));
  process.exit(2);
}
/** Never read Production DATABASE_URL — auth writes go only to Test Postgres. */
process.env.STUDIO_PERSISTENCE_BACKEND = "postgres";
process.env.DATABASE_URL = databaseUrl;

const password = requireHostedCertTestPassword();

const { findUserByEmail, updatePasswordAfterReset } = await import(
  "../src/lib/auth/users.ts"
);

const user = await findUserByEmail(email);
if (!user) {
  console.error(JSON.stringify({ ok: false, code: "USER_NOT_FOUND", email }));
  process.exit(3);
}

const updated = await updatePasswordAfterReset(user.id, password);
const report = {
  ok: updated.ok,
  email,
  userId: user.id,
  code: updated.ok ? null : updated.code,
  syncedAt: new Date().toISOString(),
  scope: {
    persistenceBackend: "postgres",
    databaseProjectRef: TEST_PROJECT_REF,
    productionRefBlocked: PRODUCTION_PROJECT_REF,
    defaultCertEmailOnly: email === DEFAULT_CLIP_CERT_EMAIL,
  },
};

const out = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-TEST-PASSWORD-SYNC-LATEST.json",
);
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(updated.ok ? 0 : 4);
