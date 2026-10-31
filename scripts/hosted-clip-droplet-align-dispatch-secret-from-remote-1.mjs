/**
 * Align desk `.env.local` with DO Test worker dispatch auth (no secret output).
 *
 * Pulls allowlisted keys from remote worker.env when missing or mismatched locally.
 * Preferred when the worker already holds HOSTED_CERT_INTERNAL_CHUNK_KEY (proof session).
 *
 * Usage:
 *   node scripts/hosted-clip-droplet-align-dispatch-secret-from-remote-1.mjs [remoteHost] [remoteEnvPath]
 */
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

import {
  assertRemoteHostAllowed,
  dropletSshBaseArgs,
  dropletSshTarget,
  DROPLET_EXPECTED,
} from "./lib/droplet-ssh.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");
const remoteHost = process.argv[2]?.trim() || dropletSshTarget();
const remotePath =
  process.argv[3]?.trim() ?? "/home/studioadmin/studio/worker.env";

const PULL_KEYS = new Set([
  "HOSTED_CERT_INTERNAL_CHUNK_KEY",
  "HOSTED_CLIP_WORKER_URL",
]);

assertRemoteHostAllowed(remoteHost);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseEnvLines(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    const value = t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    map.set(key, value);
  }
  return map;
}

function readLocalEnvRaw() {
  if (!existsSync(envPath)) return { raw: "", map: new Map() };
  const raw = readFileSync(envPath, "utf8");
  return { raw, map: parseEnvLines(raw) };
}

function upsertKeyInEnvRaw(raw, key, value) {
  const lines = raw.split(/\r?\n/);
  let replaced = false;
  const out = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!replaced) {
    if (out.length && out[out.length - 1] !== "") out.push("");
    out.push(`${key}=${value}`);
  }
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

const verifyCmd = `set -e; id=$(curl -fsS --max-time 5 http://169.254.169.254/metadata/v1/id); test "$id" = "${DROPLET_EXPECTED.digitalOceanId}"; test -r ${remotePath}; grep -E '^(HOSTED_CERT_INTERNAL_CHUNK_KEY|HOSTED_CLIP_WORKER_URL)=' ${remotePath} || true`;

const ssh = spawnSync("ssh", [...dropletSshBaseArgs(), remoteHost, verifyCmd], {
  encoding: "utf8",
});
if (ssh.status !== 0) {
  console.error(
    JSON.stringify({
      ok: false,
      stage: "ssh_read",
      status: ssh.status,
      stderr: ssh.stderr?.slice(0, 400),
    }),
  );
  process.exit(ssh.status ?? 5);
}

const remoteMap = parseEnvLines(ssh.stdout || "");
const { raw, map: localMap } = readLocalEnvRaw();

const report = {
  ok: true,
  remoteHost,
  remotePath,
  keys: {},
  updated: [],
};

let nextRaw = raw;
for (const key of PULL_KEYS) {
  const remoteVal = remoteMap.get(key)?.trim() ?? "";
  const localVal = localMap.get(key)?.trim() ?? "";
  const remotePresent = remoteVal.length > 0;
  const localPresent = localVal.length > 0;
  const hashMatch =
    remotePresent && localPresent && sha256(remoteVal) === sha256(localVal);

  if (remotePresent && !hashMatch) {
    nextRaw = upsertKeyInEnvRaw(nextRaw, key, remoteVal);
    report.updated.push(key);
  }

  report.keys[key] = {
    remotePresent,
    localPresentBefore: localPresent,
    aligned: remotePresent && (hashMatch || report.updated.includes(key)),
    valueLength: remotePresent ? remoteVal.length : 0,
  };
}

if (report.updated.length > 0) {
  if (!existsSync(envPath)) {
    writeFileSync(envPath, nextRaw, { mode: 0o600 });
  } else {
    writeFileSync(envPath, nextRaw);
  }
}

report.ok = report.keys.HOSTED_CERT_INTERNAL_CHUNK_KEY?.aligned === true;
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 4);
