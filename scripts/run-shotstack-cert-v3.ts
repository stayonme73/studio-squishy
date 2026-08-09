/**
 * KITCHEN-PRODUCTION-CERT-VIDEO-1 — Production V3 candidate.
 * Never prints API keys. No purchase. No cert grant.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

import {
  loadShotstackWorkPacket,
  readShotstackApiKey,
  runShotstackWorkPacketPipeline,
  shotstackCredentialPresence,
} from "../src/lib/studio-kitchen-production/video-integration";
import { runCertVideoMachineQa } from "../src/lib/studio-kitchen-production/video-cert/machine-qa";
import { assertV1Preserved } from "../src/lib/studio-kitchen-production/video-integration/bind";

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

const repoRoot = path.resolve(__dirname, "..");
loadEnvLocal(repoRoot);

const packetRel =
  "docs/launch/kitchen-production-cert-video-1/work-packet/work-packet-v3.json";
const evidenceDir = path.join(
  repoRoot,
  "docs/launch/kitchen-production-cert-video-1/artifacts",
);
mkdirSync(evidenceDir, { recursive: true });

async function main() {
  const packet = loadShotstackWorkPacket(repoRoot, packetRel);
  const prodKeyPresent = Boolean(
    readShotstackApiKey(process.env, "v1") ||
      process.env.SHOTSTACK_PRODUCTION_API_KEY?.trim(),
  );
  // If only stage key exists and SHOTSTACK_ENV=stage, we still require Production key for v1
  const v1Key = readShotstackApiKey(process.env, "v1");
  const stagePresence = shotstackCredentialPresence();

  const summary: Record<string, unknown> = {
    package: "KITCHEN-PRODUCTION-CERT-VIDEO-1",
    candidate: "V3",
    requiredEnv: "v1",
    productionKeyPresent: Boolean(v1Key),
    stageKeyPresent: stagePresence.apiKeyPresent,
    purchaseOccurred: false,
    tagiaEditing: false,
    startedAt: new Date().toISOString(),
  };

  if (!v1Key) {
    summary.verdict = "BLOCKED — OWNER PRODUCTION API KEY REQUIRED";
    summary.ownerSetup = {
      dashboardKeys: "https://dashboard.shotstack.io/",
      action: [
        "Open Shotstack dashboard → API Keys",
        "Copy the Production (v1) key — not the Sandbox/stage key",
        "Add to .env.local (gitignored):",
        "  SHOTSTACK_PRODUCTION_API_KEY=<production-key>",
        "  SHOTSTACK_ENV=v1",
        "Do not paste the key into chat",
        "Do not purchase a plan unless dashboard blocks free Production credits",
        "Tell Scout: Production key is in .env.local — continue V3",
      ],
      note: "Sandbox watermark on V2 is why Production is required. Keys are environment-specific.",
    };
    summary.readiness =
      "INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED";
    writeFileSync(
      path.join(evidenceDir, "v3-run-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log(JSON.stringify(summary, null, 2));
    process.exit(2);
  }

  const preservedV1 = assertV1Preserved(repoRoot, packet);
  const v2Path = packet.preserveV2RelativePath;
  const preservedV2 = {
    ok: Boolean(v2Path && existsSync(path.join(repoRoot, v2Path))),
    path: v2Path,
  };
  summary.preserved = { v1: preservedV1, v2: preservedV2 };

  const result = await runShotstackWorkPacketPipeline({
    repoRoot,
    packet,
    envName: "v1",
    pollMaxAttempts: 90,
    pollDelayMs: 3000,
  });

  if (!result.ok) {
    summary.verdict =
      result.verdict === "CREDENTIALS_BLOCKED"
        ? "BLOCKED — OWNER PRODUCTION API KEY / CREDENTIALS"
        : "V3 RENDER NOT PROVEN";
    summary.failure = {
      verdict: result.verdict,
      message: result.message,
    };
    // Detect payment/credit blockers without purchasing
    if (/credit|payment|billing|upgrade|plan/i.test(result.message)) {
      summary.ownerSetup = {
        action: "STOP — Production render appears to require payment/credits beyond free allowance. Do not purchase until Owner authorizes.",
        message: result.message,
      };
    }
    summary.readiness =
      "INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED";
    writeFileSync(
      path.join(evidenceDir, "v3-run-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  const qa = runCertVideoMachineQa({
    repoRoot,
    packet,
    artifactRelativePath: result.artifact.relativePath,
    expectedEnv: "v1",
    renderEnvUsed: "v1",
    obsoleteCtaForbidden: "Book a visit",
    primaryCta: "Book your visit today",
  });

  summary.v3 = {
    ok: true,
    providerRenderId: result.job.providerRenderId,
    status: result.job.status,
    path: result.artifact.relativePath,
    sha256: result.artifact.sha256,
    byteLength: result.artifact.byteLength,
    width: result.artifact.width,
    height: result.artifact.height,
    durationSeconds: result.artifact.durationSeconds,
    frameRate: result.artifact.frameRate,
    codec: result.artifact.codec,
    qaState: result.artifact.qaState,
    customerReady: false,
    certified: false,
    qaPass: false,
    credits: result.job.credits,
    submittedAt: result.job.submittedAt,
    completedAt: result.job.completedAt,
  };
  summary.machineQa = qa;
  summary.verdict = qa.ok
    ? "V3 CANDIDATE READY FOR OWNER VISUAL REVIEW — NOT CERTIFIED"
    : "V3 MACHINE QA FAILED — NOT CERTIFIED";
  summary.readiness =
    "INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED";
  summary.finishedAt = new Date().toISOString();

  writeFileSync(
    path.join(evidenceDir, "v3-run-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  writeFileSync(
    path.join(evidenceDir, "v3-machine-qa.json"),
    `${JSON.stringify(qa, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  process.exit(qa.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
