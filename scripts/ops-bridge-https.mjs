/**
 * Authenticated ops-bridge listener.
 * Public TLS is terminated by the HTTPS front. Loopback HTTP origin is allowed
 * only on 127.0.0.1. Not the Owner Desk. Does not print the bearer token.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startInboxNotice } from "./ops-bridge-messages.mjs";
import {
  OPS_BRIDGE_HTTPS_HOST,
  OPS_BRIDGE_HTTPS_PORT,
  handleOpsBridgeHttpsRequest,
} from "./ops-bridge-https-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TLS_DIR = path.join(ROOT, ".ops-bridge-tls");
const TOKEN_FILE = path.join(ROOT, ".ops-bridge-local-token");
const GIT_OPENSSL = "C:\\Program Files\\Git\\usr\\bin\\openssl.exe";

function resolveToken() {
  if (process.env.OPS_BRIDGE_SHARED_TOKEN) return process.env.OPS_BRIDGE_SHARED_TOKEN;
  if (existsSync(TOKEN_FILE)) return readFileSync(TOKEN_FILE, "utf8").trim();
  const token = randomBytes(32).toString("hex");
  writeFileSync(TOKEN_FILE, `${token}\n`, "utf8");
  return token;
}

function opensslBin() {
  if (process.env.OPS_BRIDGE_OPENSSL && existsSync(process.env.OPS_BRIDGE_OPENSSL)) {
    return process.env.OPS_BRIDGE_OPENSSL;
  }
  if (existsSync(GIT_OPENSSL)) return GIT_OPENSSL;
  return "openssl";
}

function ensureLocalTls() {
  if (process.env.OPS_BRIDGE_TLS_CERT && process.env.OPS_BRIDGE_TLS_KEY) {
    return {
      cert: readFileSync(process.env.OPS_BRIDGE_TLS_CERT),
      key: readFileSync(process.env.OPS_BRIDGE_TLS_KEY),
    };
  }
  mkdirSync(TLS_DIR, { recursive: true });
  const certPath = path.join(TLS_DIR, "localhost.crt");
  const keyPath = path.join(TLS_DIR, "localhost.key");
  if (!existsSync(certPath) || !existsSync(keyPath)) {
    execFileSync(
      opensslBin(),
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "7",
        "-nodes",
        "-subj",
        "/CN=127.0.0.1",
      ],
      { stdio: "ignore" },
    );
  }
  return { cert: readFileSync(certPath), key: readFileSync(keyPath) };
}

const host = process.env.OPS_BRIDGE_HTTPS_HOST || OPS_BRIDGE_HTTPS_HOST;
const port = Number(process.env.OPS_BRIDGE_HTTPS_PORT || OPS_BRIDGE_HTTPS_PORT);
if (host !== "127.0.0.1" && host !== "localhost" && process.env.OPS_BRIDGE_ALLOW_PUBLIC_BIND !== "1") {
  process.stderr.write("Refusing public bind. Local HTTPS bridge stays on 127.0.0.1 until Owner authorizes hosting.\n");
  process.exit(2);
}

const token = resolveToken();
if (!token) {
  process.stderr.write("OPS_BRIDGE_SHARED_TOKEN is required.\n");
  process.exit(2);
}

const originHttp = process.env.OPS_BRIDGE_ORIGIN === "http";
if (originHttp && host !== "127.0.0.1" && host !== "localhost") {
  process.stderr.write("HTTP origin is loopback-only. Public traffic must arrive through HTTPS.\n");
  process.exit(2);
}

function onRequest(req, res) {
  handleOpsBridgeHttpsRequest(req, res, { token }).catch(() => {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(`${JSON.stringify({ ok: false, error: "bridge_error" })}\n`);
  });
}

const server = originHttp ? http.createServer(onRequest) : https.createServer(ensureLocalTls(), onRequest);

server.listen(port, host, () => {
  const scheme = originHttp ? "http" : "https";
  process.stdout.write(
    `ops-bridge origin listening on ${scheme}://${host}:${port} (token not printed)\n`,
  );
  startInboxNotice();
});
