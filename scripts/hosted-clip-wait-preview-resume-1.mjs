/**
 * Poll Vercel deployment until Ready, then run hosted-clip-repurposing-production-resume-1.
 * Usage: node scripts/hosted-clip-wait-preview-resume-1.mjs <dpl_...> <preview-origin>
 */
import { execFileSync, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import { createHostedVercelCurl, parseJsonBody } from "./lib/hosted-preview-vercel-curl.mjs";
import { loadEnvLocal, requireHostedCertTestPassword } from "./lib/hosted-cert-env.mjs";

const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-clip-wait-preview-resume-1.mjs <dpl_...> <preview-origin>",
  );
  process.exit(2);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function deploymentStatus() {
  let out = "";
  try {
    out = execSync(`npx vercel inspect ${deploymentId} --no-wait 2>&1`, {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      shell: true,
    });
  } catch (err) {
    out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  if (/\bReady\b/i.test(out)) return "Ready";
  if (/\bError\b/i.test(out) && /status/i.test(out)) return "Error";
  if (/\bBuilding\b/i.test(out)) return "Building";
  const m = out.match(/status[\s\t]+.\s+(\S+)/i);
  return m?.[1] ?? "unknown";
}

for (let i = 0; i < 50; i += 1) {
  const status = deploymentStatus();
  console.log(`poll ${i} status=${status}`);
  if (status === "Ready") break;
  if (status === "Error") {
    console.error("Deployment failed");
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 60_000));
}

if (deploymentStatus() !== "Ready") {
  console.error("Timed out waiting for Ready");
  process.exit(2);
}

console.log("DEPLOY_READY — local caption regression");
execSync("npx vitest run src/lib/studio-short-form-video-editing/caption-burn.test.ts", {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true,
});

loadEnvLocal(repoRoot);
requireHostedCertTestPassword();
const tmpDir = path.join(repoRoot, ".tmp-clip-wait-probe");
const { vercelCurl } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir,
});
const probeJar = path.join(tmpDir, "probe.cookies.txt");
const campaignId = "disposable-hpt-cert-clip_repurposing-6a31a13c";
const productionCaptionProbe = vercelCurl(
  `/api/hosted-cert/clip-caption-production-probe?campaignId=${encodeURIComponent(campaignId)}`,
  { jar: probeJar },
);
const productionCaptionJson = parseJsonBody(productionCaptionProbe.bodyText);
if (productionCaptionProbe.status !== 200 || productionCaptionJson?.ok !== true) {
  console.error(
    "clip-caption-production-probe FAIL",
    productionCaptionProbe.status,
    JSON.stringify(productionCaptionJson, null, 2),
  );
  process.exit(3);
}
console.log(
  `clip-caption-production-probe PASS stamp=${productionCaptionJson.stamp?.id} clips=${(productionCaptionJson.clips ?? []).length}`,
);

console.log("starting clip resume");
execFileSync(
  "node",
  [
    path.join(repoRoot, "scripts/hosted-clip-repurposing-production-resume-1.mjs"),
    deploymentId,
    previewOrigin,
  ],
  { cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32" },
);
