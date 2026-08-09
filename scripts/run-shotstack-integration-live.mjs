/**
 * KITCHEN-VIDEO-INTEGRATION-1 — live Shotstack runner (Owner machine).
 * Loads .env.local; never prints API key.
 *
 * Usage: node scripts/run-shotstack-integration-live.mjs
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadEnvLocal() {
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

loadEnvLocal();

const keyPresent = Boolean(process.env.SHOTSTACK_API_KEY?.trim());
console.log(
  JSON.stringify(
    {
      package: "KITCHEN-VIDEO-INTEGRATION-1",
      shotstackApiKeyPresent: keyPresent,
      shotstackEnv: process.env.SHOTSTACK_ENV ?? "stage",
      note: keyPresent
        ? "Key present (value not printed). Live pipeline requires compiled TS — use vitest/tsx path or Owner continue message to Scout."
        : "STOP: add SHOTSTACK_API_KEY to .env.local per docs/launch/kitchen-video-integration-1/OWNER-SHOTSTACK-SETUP.md",
    },
    null,
    2,
  ),
);

if (!keyPresent) process.exit(2);
process.exit(0);
