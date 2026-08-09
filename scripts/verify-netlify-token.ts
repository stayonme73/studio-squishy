/**
 * Owner/local helper — verifies NETLIFY_AUTH_TOKEN against Netlify.
 * Prints only ok/fail + HTTP status. Never prints the token.
 *
 *   npx tsx scripts/verify-netlify-token.ts
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

function loadEnvLocal(repoRoot: string) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  loadEnvLocal(repoRoot);
  const token = process.env.NETLIFY_AUTH_TOKEN?.trim() ?? "";
  if (!token) {
    console.log("NETLIFY_AUTH_TOKEN: ABSENT");
    process.exit(1);
  }
  console.log(`NETLIFY_AUTH_TOKEN: PRESENT (len=${token.length})`);
  const res = await fetch("https://api.netlify.com/api/v1/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "StudioKitchenLanding (owner-local)",
    },
  });
  console.log(`GET /api/v1/user → HTTP ${res.status}`);
  if (!res.ok) {
    console.log(
      "FAIL — Netlify rejected this token. Recreate PAT at app.netlify.com/user/applications#personal-access-tokens",
    );
    process.exit(1);
  }
  console.log("OK — token accepted. Tell Scout: resume");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
