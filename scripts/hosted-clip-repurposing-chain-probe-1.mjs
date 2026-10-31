/**
 * One-shot continue-paid-intake-chain probe (returns launchResults in body).
 * Usage: node scripts/hosted-clip-repurposing-chain-probe-1.mjs <dpl_...> [campaignId]
 */
import { mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";

import { createHostedVercelCurl, parseJsonBody } from "./lib/hosted-preview-vercel-curl.mjs";
import { loadEnvLocal, requireHostedCertTestPassword } from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const campaignId =
  process.argv[3]?.trim() ?? "disposable-hpt-cert-clip_repurposing-6a31a13c";
const ownerEmail = "hpt-cert-clip_repurposing-2d52e67f@example.com";

if (!deploymentId?.startsWith("dpl_")) {
  console.error("Usage: node scripts/hosted-clip-repurposing-chain-probe-1.mjs <dpl_...>");
  process.exit(2);
}

loadEnvLocal(repoRoot);
const tmpDir = path.join(tmpdir(), "hosted-clip-chain-probe");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl } = createHostedVercelCurl({ repoRoot, deploymentId, tmpDir });
const jar = path.join(tmpDir, "owner.cookies.txt");
vercelCurl("/api/auth/login", {
  method: "POST",
  jar,
  body: { email: ownerEmail, password: requireHostedCertTestPassword() },
});
const started = Date.now();
const resp = vercelCurl(
  "/api/hosted-cert/continue-paid-intake-chain?scope=launch-menu-only&mode=sync",
  {
  method: "POST",
  jar,
  rawBody: JSON.stringify({ campaignId }),
  headers: ["Content-Type: application/json"],
  longRunning: true,
  },
);
const json = parseJsonBody(resp.bodyText);
const out = {
  elapsedMs: Date.now() - started,
  httpStatus: resp.status,
  ...json,
};
const outPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-CLIP-REPURPOSING-CHAIN-PROBE-1-RUN.json",
);
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(resp.status === 200 && out.launchResults?.some((r) => r.ok) ? 0 : 3);
