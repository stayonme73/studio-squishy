/**
 * Gate C — push Test worker env to droplet without printing secret values.
 *
 * Usage (Owner desk, SSH key already on droplet):
 *   node scripts/hosted-clip-droplet-install-remote-env-1.mjs studioadmin@68.183.142.179
 *
 * Reads `.env.local`, copies allowlisted keys to remote worker.env (mode 600).
 * If the key exists only on the droplet, run `hosted-clip-droplet-align-dispatch-secret-from-remote-1.mjs` first (no secret output).
 */
import { existsSync, readFileSync } from "fs";
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
const remoteHost = process.argv[2]?.trim() || dropletSshTarget();
const remotePath = process.argv[3]?.trim() ?? "/home/studioadmin/studio/worker.env";
const TEST_DB_REF = "tzyglhypseyokhbeozjw";

const ALLOWED = new Set([
  "STUDIO_PERSISTENCE_BACKEND",
  "STUDIO_PERSISTENCE_TEST_DATABASE_URL",
  "STUDIO_PERSISTENCE_TEST_PROJECT_REF",
  "DATABASE_URL",
  "STUDIO_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "HOSTED_CERT_INTERNAL_CHUNK_KEY",
  "SHOTSTACK_API_KEY",
  "SHOTSTACK_OWNER_ID",
  "SHOTSTACK_ENV",
  "DEEPGRAM_API_KEY",
  "STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE",
  "STUDIO_HOSTED_CLIP_WORKER",
  "STUDIO_PERSISTENCE_TEST_SUPABASE_URL",
  "STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY",
  "STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET",
]);

const PRODUCTION_REF = "txgzguzlojlhndkbncc";

assertRemoteHostAllowed(remoteHost);

const envPath = path.join(repoRoot, ".env.local");
if (!existsSync(envPath)) {
  console.error("Missing .env.local on desk.");
  process.exit(2);
}

const lineMap = new Map();
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  const key = t.slice(0, eq).trim();
  if (!ALLOWED.has(key)) continue;
  const value = t
    .slice(eq + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
  if (value.includes(PRODUCTION_REF)) {
    console.error(`Refusing Production ref in ${key}`);
    process.exit(3);
  }
  if (
    (key === "STUDIO_PERSISTENCE_TEST_DATABASE_URL" || key === "DATABASE_URL") &&
    !value.includes(TEST_DB_REF)
  ) {
    console.error(`Refusing non-Test Supabase host in ${key}`);
    process.exit(3);
  }
  lineMap.set(key, value);
}

lineMap.set("STUDIO_HOSTED_CLIP_WORKER", "1");
lineMap.set("STUDIO_CAMPAIGN_DESIGN_ARTIFACTS_DURABLE", "1");
lineMap.set("STUDIO_PERSISTENCE_BACKEND", "postgres");
if (!lineMap.has("DATABASE_URL") && lineMap.has("STUDIO_PERSISTENCE_TEST_DATABASE_URL")) {
  lineMap.set("DATABASE_URL", lineMap.get("STUDIO_PERSISTENCE_TEST_DATABASE_URL"));
}
if (!lineMap.has("NEXT_PUBLIC_SUPABASE_URL") && lineMap.has("STUDIO_PERSISTENCE_TEST_SUPABASE_URL")) {
  lineMap.set("NEXT_PUBLIC_SUPABASE_URL", lineMap.get("STUDIO_PERSISTENCE_TEST_SUPABASE_URL"));
}
if (
  !lineMap.has("SUPABASE_SERVICE_ROLE_KEY") &&
  lineMap.has("STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY")
) {
  lineMap.set(
    "SUPABASE_SERVICE_ROLE_KEY",
    lineMap.get("STUDIO_PERSISTENCE_TEST_SUPABASE_SERVICE_ROLE_KEY"),
  );
}
if (!lineMap.has("SUPABASE_STORAGE_BUCKET")) {
  lineMap.set(
    "SUPABASE_STORAGE_BUCKET",
    lineMap.get("STUDIO_PERSISTENCE_TEST_STORAGE_BUCKET") ?? "studio-files-test",
  );
}

const lines = [...lineMap.entries()].map(([key, value]) => `${key}=${value}`);

const payload = `${lines.join("\n")}\n`;
const sshArgs = [
  ...dropletSshBaseArgs(),
  remoteHost,
  `set -e; id=$(curl -fsS --max-time 5 http://169.254.169.254/metadata/v1/id); test "$id" = "${DROPLET_EXPECTED.digitalOceanId}"; mkdir -p $(dirname ${remotePath}); tee ${remotePath} > /dev/null; chmod 600 ${remotePath}`,
];
const ssh = spawnSync("ssh", sshArgs, { input: payload, encoding: "utf8" });
if (ssh.status !== 0) {
  console.error(JSON.stringify({ ok: false, stage: "ssh", status: ssh.status, stderr: ssh.stderr?.slice(0, 500) }));
  process.exit(ssh.status ?? 5);
}
const keyNames = lines.map((l) => l.split("=")[0]).sort();
console.log(
  JSON.stringify(
    {
      ok: true,
      remoteHost,
      remotePath,
      dropletId: DROPLET_EXPECTED.digitalOceanId,
      keysInstalled: lines.length,
      keyNames,
    },
    null,
    2,
  ),
);
