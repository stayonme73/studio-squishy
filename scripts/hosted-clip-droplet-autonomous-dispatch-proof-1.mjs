/**
 * After 3/3 render proof — prove unattended dispatch hits DO worker (not Vercel FFmpeg).
 *
 * Usage:
 *   node scripts/hosted-clip-droplet-autonomous-dispatch-proof-1.mjs <workerBaseUrl> [campaignId] [maxPolls]
 *
 * Requires HOSTED_CERT_INTERNAL_CHUNK_KEY in `.env.local`. Does not print secrets.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import { loadEnvLocal } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerBase = process.argv[2]?.trim()?.replace(/\/+$/, "");
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const maxPolls = Number(process.argv[4] ?? 40);

if (!workerBase?.startsWith("http")) {
  console.error(
    "Usage: node scripts/hosted-clip-droplet-autonomous-dispatch-proof-1.mjs <workerBaseUrl> [campaignId]",
  );
  process.exit(2);
}

loadEnvLocal(repoRoot);
const internal = process.env.HOSTED_CERT_INTERNAL_CHUNK_KEY?.trim();
if (!internal) {
  console.error("Missing HOSTED_CERT_INTERNAL_CHUNK_KEY in .env.local");
  process.exit(2);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function inventory() {
  const r = spawnSync("node", ["scripts/hosted-clip-durable-burn-inventory-1.mjs", campaignId], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  try {
    return JSON.parse(r.stdout);
  } catch {
    return { ok: false };
  }
}

const kick = await fetch(`${workerBase}/run-chunk`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-hosted-cert-internal": internal,
  },
  body: JSON.stringify({
    campaignId,
    scheduleContinuation: true,
    finalizeLaunchMenu: false,
  }),
});
const kickJson = await kick.json().catch(() => ({}));
if (!kick.ok) {
  console.log(JSON.stringify({ ok: false, stage: "kick", status: kick.status, body: kickJson }, null, 2));
  process.exit(5);
}

let last = inventory();
for (let i = 0; i < maxPolls; i++) {
  await sleep(15_000);
  last = inventory();
  if (last.hasProductionMp4 && Number(last.productionMp4Count ?? 0) >= 3) break;
}

const ok = Number(last.productionMp4Count ?? 0) >= 3;
console.log(
  JSON.stringify(
    {
      ok,
      stage: "autonomous_dispatch_proof",
      workerBase,
      campaignId,
      kick: kickJson,
      inventory: {
        productionMp4Count: last.productionMp4Count,
        hasProductionMp4: last.hasProductionMp4,
      },
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 5);
