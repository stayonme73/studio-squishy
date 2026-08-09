/**
 * KITCHEN-VIDEO-INTEGRATION-1 — live Shotstack V1 (+ V2 if credits allow).
 * Loads .env.local. Never prints API key values.
 *
 *   npx tsx scripts/run-shotstack-live.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

import {
  assertV1Preserved,
  loadShotstackWorkPacketV1,
  loadShotstackWorkPacketV2,
  runShotstackWorkPacketPipeline,
  shotstackCredentialPresence,
} from "../src/lib/studio-kitchen-production/video-integration";

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

const presence = shotstackCredentialPresence();
const evidenceDir = path.join(
  repoRoot,
  "docs/launch/kitchen-video-integration-1/artifacts",
);
mkdirSync(evidenceDir, { recursive: true });

const summary: Record<string, unknown> = {
  package: "KITCHEN-VIDEO-INTEGRATION-1",
  startedAt: new Date().toISOString(),
  shotstackApiKeyPresent: presence.apiKeyPresent,
  shotstackEnv: presence.shotstackEnv,
  // never include key
};

if (!presence.apiKeyPresent) {
  summary.verdict = "SHOTSTACK INTEGRATION: BLOCKED — OWNER API SETUP REQUIRED";
  writeFileSync(
    path.join(evidenceDir, "live-run-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  process.exit(2);
}

async function main() {
  const v1Packet = loadShotstackWorkPacketV1(repoRoot);
  console.log(
    JSON.stringify(
      {
        step: "v1_start",
        workPacketVersion: v1Packet.workPacketVersion,
        scenes: v1Packet.scenes.length,
        env: presence.shotstackEnv,
      },
      null,
      2,
    ),
  );

  const v1 = await runShotstackWorkPacketPipeline({
    repoRoot,
    packet: v1Packet,
    envName: presence.shotstackEnv,
    pollMaxAttempts: 90,
    pollDelayMs: 3000,
  });

  summary.v1 = v1.ok
    ? {
        ok: true,
        providerRenderId: v1.job.providerRenderId,
        status: v1.job.status,
        credits: v1.job.credits,
        outputUrlPresent: Boolean(v1.job.outputUrl),
        artifactPath: v1.artifact.relativePath,
        sha256: v1.artifact.sha256,
        byteLength: v1.artifact.byteLength,
        width: v1.artifact.width,
        height: v1.artifact.height,
        durationSeconds: v1.artifact.durationSeconds,
        frameRate: v1.artifact.frameRate,
        codec: v1.artifact.codec,
        qaState: v1.artifact.qaState,
        customerReady: v1.artifact.customerReady,
        certified: v1.artifact.certified,
        submittedAt: v1.job.submittedAt,
        completedAt: v1.job.completedAt,
      }
    : {
        ok: false,
        verdict: v1.verdict,
        message: v1.message,
        providerRenderId: v1.job?.providerRenderId,
        status: v1.job?.status,
      };

  writeFileSync(
    path.join(evidenceDir, "live-run-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify({ step: "v1_result", v1: summary.v1 }, null, 2));

  if (!v1.ok) {
    summary.verdict = "SHOTSTACK INTEGRATION: NOT PROVEN";
    summary.finishedAt = new Date().toISOString();
    writeFileSync(
      path.join(evidenceDir, "live-run-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    process.exit(1);
  }

  const v2Packet = loadShotstackWorkPacketV2(repoRoot);
  const preserved = assertV1Preserved(repoRoot, v2Packet);
  summary.v1Preserved = preserved;

  console.log(
    JSON.stringify(
      {
        step: "v2_start",
        workPacketVersion: v2Packet.workPacketVersion,
        correctionReason: v2Packet.correctionReason,
        v1Preserved: preserved,
      },
      null,
      2,
    ),
  );

  const v2 = await runShotstackWorkPacketPipeline({
    repoRoot,
    packet: v2Packet,
    envName: presence.shotstackEnv,
    pollMaxAttempts: 90,
    pollDelayMs: 3000,
  });

  summary.v2 = v2.ok
    ? {
        ok: true,
        providerRenderId: v2.job.providerRenderId,
        status: v2.job.status,
        credits: v2.job.credits,
        artifactPath: v2.artifact.relativePath,
        sha256: v2.artifact.sha256,
        byteLength: v2.artifact.byteLength,
        width: v2.artifact.width,
        height: v2.artifact.height,
        durationSeconds: v2.artifact.durationSeconds,
        frameRate: v2.artifact.frameRate,
        codec: v2.artifact.codec,
        qaState: v2.artifact.qaState,
        customerReady: v2.artifact.customerReady,
        differentHashFromV1:
          v2.artifact.sha256 !== (summary.v1 as { sha256?: string }).sha256,
      }
    : {
        ok: false,
        verdict: v2.verdict,
        message: v2.message,
        providerRenderId: v2.job?.providerRenderId,
        note:
          "If credits exhausted, V1 alone may still prove integration — report honestly.",
      };

  const v1Ok = true;
  const v2Ok = v2.ok;
  summary.verdict = v1Ok
    ? "SHOTSTACK INTEGRATION: PROVEN"
    : "SHOTSTACK INTEGRATION: NOT PROVEN";
  summary.readiness = v1Ok
    ? "INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED"
    : "INTEGRATION REQUIRED / NOT CUSTOMER READY / NOT CERTIFIED";
  summary.v2Completed = v2Ok;
  summary.finishedAt = new Date().toISOString();

  writeFileSync(
    path.join(evidenceDir, "live-run-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  process.exit(v1Ok ? 0 : 1);
}

main().catch((err) => {
  summary.verdict = "SHOTSTACK INTEGRATION: NOT PROVEN";
  summary.error = err instanceof Error ? err.message : String(err);
  summary.finishedAt = new Date().toISOString();
  writeFileSync(
    path.join(evidenceDir, "live-run-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.error(summary.error);
  process.exit(1);
});
