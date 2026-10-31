/**
 * Single POST /run-chunk (authenticated). For dispatch latency / hook verification.
 * Usage: STUDIO_HOSTED_CLIP_WORKER_ENV=... node scripts/hosted-clip-droplet-run-chunk-once-1.mjs [baseUrl] [campaignId]
 */
import { existsSync, readFileSync } from "fs";

const workerBase = (process.argv[2]?.trim() ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const finalizeLaunchMenu = process.argv[4] !== "false";

function loadEnvFile(envPath) {
  if (!envPath || !existsSync(envPath)) return;
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

loadEnvFile(
  process.env.STUDIO_HOSTED_CLIP_WORKER_ENV?.trim() ?? "/home/studioadmin/studio/worker.env",
);

const internal = process.env.HOSTED_CERT_INTERNAL_CHUNK_KEY?.trim();
if (!internal) {
  console.error("missing HOSTED_CERT_INTERNAL_CHUNK_KEY");
  process.exit(2);
}

const started = Date.now();
const res = await fetch(`${workerBase}/run-chunk`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-hosted-cert-internal": internal,
  },
  body: JSON.stringify({
    campaignId,
    scheduleContinuation: false,
    finalizeLaunchMenu,
  }),
  signal: AbortSignal.timeout(900_000),
});
const text = await res.text();
let json = {};
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text.slice(0, 500) };
}
console.log(
  JSON.stringify(
    {
      httpStatus: res.status,
      elapsedMs: Date.now() - started,
      finalizeLaunchMenu,
      ...json,
    },
    null,
    2,
  ),
);
process.exit(res.ok && json.hookOk === true ? 0 : 5);
