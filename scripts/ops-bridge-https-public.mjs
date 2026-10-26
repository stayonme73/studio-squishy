/**
 * Put the local ops-bridge origin behind a public HTTPS Cloudflare quick tunnel.
 * Token stays in the gitignored host file. Never printed.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OPS_BRIDGE_HTTPS_HOST, OPS_BRIDGE_HTTPS_PORT } from "./ops-bridge-https-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN_FILE = path.join(ROOT, ".ops-bridge-local-token");
const URL_FILE = path.join(ROOT, ".ops-bridge-public-url");
const ORIGIN_PID = path.join(ROOT, "docs/launch/ops-bridge-https-origin.pid");
const TUNNEL_PID = path.join(ROOT, "docs/launch/ops-bridge-https-tunnel.pid");
const TUNNEL_LOG = path.join(ROOT, "docs/launch/ops-bridge-https-tunnel.log");
const CLOUDFLARED = path.join(ROOT, "tmp/cloudflared.exe");
const CLOUDFLARED_URL =
  "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";

function ensureToken() {
  if (process.env.OPS_BRIDGE_SHARED_TOKEN) return;
  if (existsSync(TOKEN_FILE) && readFileSync(TOKEN_FILE, "utf8").trim()) return;
  writeFileSync(TOKEN_FILE, `${randomBytes(32).toString("hex")}\n`, "utf8");
}

function originReady() {
  return new Promise((resolve) => {
    const req = http.get(
      `http://${OPS_BRIDGE_HTTPS_HOST}:${OPS_BRIDGE_HTTPS_PORT}/v1/snapshot`,
      (res) => {
        res.resume();
        resolve(res.statusCode === 401 || res.statusCode === 200);
      },
    );
    req.on("error", () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startOrigin() {
  if (await originReady()) return;
  const child = spawn(process.execPath, [path.join(ROOT, "scripts/ops-bridge-https.mjs")], {
    cwd: ROOT,
    env: { ...process.env, OPS_BRIDGE_ORIGIN: "http" },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  if (child.pid) writeFileSync(ORIGIN_PID, `${child.pid}\n`, "utf8");
  child.unref();
  for (let i = 0; i < 25; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (await originReady()) return;
  }
  throw new Error("ops-bridge origin did not start on 127.0.0.1:4178");
}

async function ensureCloudflared() {
  if (existsSync(CLOUDFLARED)) return;
  mkdirSync(path.dirname(CLOUDFLARED), { recursive: true });
  const res = await fetch(CLOUDFLARED_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`cloudflared download failed: ${res.status}`);
  writeFileSync(CLOUDFLARED, Buffer.from(await res.arrayBuffer()));
}

function startTunnel() {
  return new Promise((resolve, reject) => {
    mkdirSync(path.dirname(TUNNEL_LOG), { recursive: true });
    const log = createWriteStream(TUNNEL_LOG, { flags: "a" });
    const child = spawn(
      CLOUDFLARED,
      ["tunnel", "--url", `http://${OPS_BRIDGE_HTTPS_HOST}:${OPS_BRIDGE_HTTPS_PORT}`, "--no-autoupdate"],
      {
        cwd: ROOT,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    if (child.pid) writeFileSync(TUNNEL_PID, `${child.pid}\n`, "utf8");
    let found = "";
    const consider = (chunk) => {
      const text = String(chunk);
      log.write(text.replace(/trycloudflare\.com[^\s]*/g, (url) => url));
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !found) {
        found = match[0];
        writeFileSync(URL_FILE, `${found}\n`, "utf8");
        resolve(found);
      }
    };
    child.stdout.on("data", consider);
    child.stderr.on("data", consider);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!found) reject(new Error(`cloudflared exited before publishing a URL (${code})`));
    });
    setTimeout(() => {
      if (!found) reject(new Error("cloudflared did not publish a public URL in 45s"));
    }, 45_000);
    child.unref();
  });
}

ensureToken();
await startOrigin();
await ensureCloudflared();
const publicUrl = await startTunnel();
process.stdout.write(`ops-bridge public HTTPS ready: ${publicUrl}\n`);
