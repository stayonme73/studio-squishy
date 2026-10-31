/**
 * Push clip-worker Preview env vars from .env.local (no stdout secrets).
 */
import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");

const VARS = [
  "HOSTED_CLIP_COMPUTE_PROVIDER",
  "HOSTED_CLIP_WORKER_URL",
  "HOSTED_CERT_INTERNAL_CHUNK_KEY",
];

function readEnv(key) {
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (!t.startsWith(`${key}=`)) continue;
    return t.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const results = [];
for (const name of VARS) {
  let value = readEnv(name);
  if (name === "HOSTED_CLIP_COMPUTE_PROVIDER" && !value) value = "droplet";
  if (!value) {
    results.push({ name, ok: false, reason: "missing_in_env_local" });
    continue;
  }
  const run = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "preview", "--force", "--yes", "--sensitive", "--value", value],
    { cwd: repoRoot, encoding: "utf8", shell: true },
  );
  results.push({
    name,
    ok: run.status === 0,
    exitCode: run.status,
    stderrTail: (run.stderr || "").slice(-180),
  });
}
console.log(JSON.stringify({ synced: results }, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 5);
