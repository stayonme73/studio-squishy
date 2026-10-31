/**
 * Gates A–D automation (GO A–D). Uses October SSH key studio-do-ed25519 only.
 * No secrets printed. No commit/push/Production.
 */
import { existsSync } from "fs";
import { spawn, spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import {
  DROPLET_EXPECTED,
  dropletRepoRoot,
  dropletSshBaseArgs,
  dropletSshTarget,
} from "./lib/droplet-ssh.mjs";

const repoRoot = dropletRepoRoot;
const remoteRoot = "/var/studio/studio-squishy";
const campaignId = "disposable-hpt-cert-clip_repurposing-6a31a13c";
const outDir = path.join(repoRoot, "docs/launch/studio-hosted-production-team-readiness-1");

function sshExec(remoteCommand, options = {}) {
  const args = [...dropletSshBaseArgs(), dropletSshTarget(), remoteCommand];
  return spawnSync("ssh", args, {
    encoding: "utf8",
    cwd: repoRoot,
    ...options,
  });
}

function log(stage, payload) {
  console.log(JSON.stringify({ stage, ...payload, at: new Date().toISOString() }));
}

function gateA() {
  const id = sshExec(
    `curl -fsS --max-time 5 http://169.254.169.254/metadata/v1/id && echo && hostname && node -v && ffmpeg -version 2>&1 | head -1 && free -m | head -2 && df -h / | tail -1`,
  );
  if (id.status !== 0 || !id.stdout.includes(DROPLET_EXPECTED.digitalOceanId)) {
    return { ok: false, error: "droplet_identity_mismatch", stdout: id.stdout?.slice(0, 400), stderr: id.stderr?.slice(0, 400) };
  }
  return { ok: true, summary: id.stdout.split("\n").slice(0, 8) };
}

function gateCSyncEnv() {
  if (!existsSync(path.join(repoRoot, ".env.local"))) {
    return { ok: false, error: "missing_env_local" };
  }
  const r = spawnSync("node", ["scripts/hosted-clip-droplet-install-remote-env-1.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    return { ok: false, error: "install_remote_env_failed", stderr: r.stderr?.slice(0, 500) };
  }
  try {
    return { ok: true, ...JSON.parse(r.stdout) };
  } catch {
    return { ok: true, raw: r.stdout?.slice(0, 400) };
  }
}

function gateBSyncCode() {
  sshExec(`sudo mkdir -p ${remoteRoot} && sudo chown -R studioadmin:studioadmin ${path.dirname(remoteRoot)}`);
  const tar = spawnSync(
    "tar",
    [
      "-czf",
      "-",
      "--exclude=node_modules",
      "--exclude=.git",
      "--exclude=.next",
      "--exclude=.tmp-clip",
      "--exclude=.tmp-chunk",
      "-C",
      repoRoot,
      "scripts",
      "src",
      "public",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "next.config.ts",
      "postcss.config.mjs",
      "eslint.config.mjs",
    ],
    { encoding: "buffer", maxBuffer: 1024 * 1024 * 512 },
  );
  if (tar.status !== 0) {
    return { ok: false, error: "local_tar_failed", stderr: String(tar.stderr?.slice(0, 300)) };
  }
  const extract = spawnSync(
    "ssh",
    [...dropletSshBaseArgs(), dropletSshTarget(), `mkdir -p ${remoteRoot} && tar xzf - -C ${remoteRoot}`],
    { input: tar.stdout, maxBuffer: 1024 * 1024 * 512 },
  );
  if (extract.status !== 0) {
    return { ok: false, error: "remote_extract_failed", stderr: String(extract.stderr?.slice(0, 300)) };
  }
  const build = sshExec(
    `bash -lc 'cd ${remoteRoot} && npm ci && npm run build'`,
    { timeout: 45 * 60 * 1000 },
  );
  if (build.status !== 0) {
    return { ok: false, error: "remote_build_failed", stderr: build.stderr?.slice(-800) };
  }
  return { ok: true, remoteRoot };
}

function gateDDrive() {
  return new Promise((resolve) => {
    const cmd = `bash -lc 'cd ${remoteRoot} && STUDIO_HOSTED_CLIP_WORKER_ENV=/etc/studio/worker.env npx tsx scripts/hosted-clip-droplet-production-drive-1.ts ${campaignId}'`;
    const child = spawn("ssh", [...dropletSshBaseArgs(), dropletSshTarget(), cmd], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
      process.stderr.write(d);
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, exitCode: code ?? 1, stdoutTail: stdout.slice(-2000), stderrTail: stderr.slice(-2000) });
    });
  });
}

function deskProof() {
  const setProof = spawnSync("node", ["scripts/hosted-clip-set-mp4-proof-1.mjs", campaignId], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return {
    setProofExit: setProof.status,
    setProofStdout: setProof.stdout?.slice(0, 2000),
    setProofStderr: setProof.stderr?.slice(0, 500),
  };
}

async function main() {
  log("gate_a_start", {});
  const a = gateA();
  if (!a.ok) {
    log("blocked", a);
    process.exit(5);
  }
  log("gate_a_pass", a);

  log("gate_c_start", {});
  const c = gateCSyncEnv();
  if (!c.ok) {
    log("blocked", c);
    process.exit(5);
  }
  log("gate_c_pass", { keysInstalled: c.keysInstalled });

  log("gate_b_start", {});
  const b = gateBSyncCode();
  if (!b.ok) {
    log("blocked", b);
    process.exit(5);
  }
  log("gate_b_pass", b);

  log("gate_d_start", { campaignId });
  const d = await gateDDrive();
  if (!d.ok) {
    log("gate_d_failed_stop", d);
    process.exit(5);
  }
  log("gate_d_pass", d);

  const proof = deskProof();
  log("desk_proof", proof);
  process.exit(proof.setProofExit === 0 ? 0 : 5);
}

main().catch((error) => {
  log("fatal", { message: error instanceof Error ? error.message : String(error) });
  process.exit(5);
});
