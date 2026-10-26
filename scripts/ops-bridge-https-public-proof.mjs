/**
 * Prove the public HTTPS ops-bridge. Reads the host token from the gitignored
 * file and never prints it.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL_FILE = path.join(ROOT, ".ops-bridge-public-url");
const TOKEN_FILE = path.join(ROOT, ".ops-bridge-local-token");
const RESULT_FILE = path.join(
  ROOT,
  "docs/launch/studio-operating-chatgpt-scout-ops-bridge-1/TRANSPORT-HTTPS-PUBLIC-PROOF.json",
);

function readToken() {
  if (process.env.OPS_BRIDGE_SHARED_TOKEN) return process.env.OPS_BRIDGE_SHARED_TOKEN.trim();
  if (!existsSync(TOKEN_FILE)) throw new Error("host token file missing");
  const token = readFileSync(TOKEN_FILE, "utf8").trim();
  if (!token) throw new Error("host token file empty");
  return token;
}

function stripSecrets(text) {
  return String(text)
    .replace(/\bsk_(?:live|test)_[A-Za-z0-9]+\b/g, "[REDACTED]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]");
}

async function request(base, method, route, { token, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${route}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = { raw: stripSecrets(raw).slice(0, 200) };
  }
  return { status: res.status, json };
}

function containsSecret(value, token) {
  const text = JSON.stringify(value ?? "");
  if (token && text.includes(token)) return true;
  return /\bsk_(?:live|test)_|\bwhsec_|\bBearer\s+\S+/i.test(text);
}

const base = (process.env.OPS_BRIDGE_PUBLIC_URL || (existsSync(URL_FILE) ? readFileSync(URL_FILE, "utf8") : "")).trim().replace(/\/$/, "");
if (!base.startsWith("https://")) throw new Error("public HTTPS base URL is missing");
const token = readToken();

const snapshotUnauth = await request(base, "GET", "/v1/snapshot");
const snapshotWrong = await request(base, "GET", "/v1/snapshot", { token: "wrong-token-value" });
const snapshot = await request(base, "GET", "/v1/snapshot", { token });
const missingRoute = await request(base, "GET", "/v1/not-a-route", { token });
const fileProbe = await request(base, "GET", "/v1/snapshot?file=.env", { token });
const decision = {
  decisionId: `public-https-${Date.now()}`,
  authorizer: "OWNER_TAGIA",
  authorized: true,
  at: new Date().toISOString(),
  packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
  action: "accept_proof",
  permittedAction: "Acknowledge public HTTPS ops-bridge proof. Do not merge. Do not push.",
  protectedAction: false,
  mergeAuthorized: false,
  pushAuthorized: false,
};
const inbound = await request(base, "POST", "/v1/inbound", { token, body: decision });
const acknowledgement = await request(
  base,
  "GET",
  `/v1/acknowledgement?decisionId=${decision.decisionId}`,
  { token },
);

const results = {
  baseUrl: base,
  host: "Cloudflare Quick Tunnel in front of local 127.0.0.1:4178 origin",
  tokenStoredOnlyAsHostSecret: true,
  tokenPrinted: false,
  routes: ["GET /v1/snapshot", "POST /v1/inbound", "GET /v1/acknowledgement"],
  checks: {
    unauthenticatedSnapshot401: snapshotUnauth.status === 401,
    wrongToken401: snapshotWrong.status === 401,
    authenticatedSnapshot200: snapshot.status === 200 && snapshot.json?.kind === "chatgpt_scout_ops_snapshot",
    authenticatedInbound200: inbound.status === 200 && inbound.json?.ok === true,
    acknowledgement200:
      acknowledgement.status === 200 && acknowledgement.json?.acknowledgement?.decisionId === decision.decisionId,
    unsupportedRoute404: missingRoute.status === 404,
    arbitraryFilePathRejected: fileProbe.status === 400 && fileProbe.json?.error === "arbitrary_file_path",
    secretsNeverReturned: ![snapshot, inbound, acknowledgement].some((item) => containsSecret(item.json, token)),
  },
};

const passed = Object.values(results.checks).every(Boolean);
results.ok = passed;
writeFileSync(RESULT_FILE, `${JSON.stringify(results, null, 2)}\n`, "utf8");
process.stdout.write(`ops-bridge public proof ${passed ? "PASS" : "FAIL"} ${base}\n`);
process.exit(passed ? 0 : 2);
