/**
 * Re-run V1 only (restore after accidental overwrite). Never prints API key.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

import {
  loadShotstackWorkPacketV1,
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
if (!presence.apiKeyPresent) {
  console.log(JSON.stringify({ ok: false, reason: "credentials_absent" }));
  process.exit(2);
}

async function main() {
  const packet = loadShotstackWorkPacketV1(repoRoot);
  const v1 = await runShotstackWorkPacketPipeline({
    repoRoot,
    packet,
    envName: presence.shotstackEnv,
    pollMaxAttempts: 90,
    pollDelayMs: 3000,
  });
  const out = path.join(
    repoRoot,
    "docs/launch/kitchen-video-integration-1/artifacts/v1-restore-summary.json",
  );
  mkdirSync(path.dirname(out), { recursive: true });
  const summary = v1.ok
    ? {
        ok: true,
        providerRenderId: v1.job.providerRenderId,
        sha256: v1.artifact.sha256,
        byteLength: v1.artifact.byteLength,
        durationSeconds: v1.artifact.durationSeconds,
        path: v1.artifact.relativePath,
        note: "V1 restored; hash may differ from first live render if Shotstack non-bit-identical",
      }
    : { ok: false, verdict: v1.verdict, message: v1.message };
  writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(v1.ok ? 0 : 1);
}

main();
