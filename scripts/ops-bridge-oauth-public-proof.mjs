/**
 * Prove public MCP OAuth 2.1. Never prints PIN, access tokens, or the internal static token.
 */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL_FILE = path.join(ROOT, ".ops-bridge-public-url");
const DESK_PIN = path.join(ROOT, "docs/launch/project-alpha-owner-desk-pin.json");
const RESULT_FILE = path.join(
  ROOT,
  "docs/launch/studio-operating-chatgpt-scout-ops-bridge-1/TRANSPORT-MCP-OAUTH-PROOF.json",
);

function pin() {
  if (process.env.OPS_BRIDGE_OAUTH_OWNER_PIN) return process.env.OPS_BRIDGE_OAUTH_OWNER_PIN;
  if (!existsSync(DESK_PIN)) throw new Error("Owner PIN store missing");
  return JSON.parse(readFileSync(DESK_PIN, "utf8")).pin;
}

function parseTool(json) {
  const text = json?.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

async function req(base, method, route, { token, json, form } = {}) {
  const headers = { accept: "application/json, text/event-stream" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (json) headers["content-type"] = "application/json";
  if (form) headers["content-type"] = "application/x-www-form-urlencoded";
  const res = await fetch(`${base}${route}`, {
    method,
    headers,
    body: json ? JSON.stringify(json) : form ? form : undefined,
    redirect: "manual",
  });
  const raw = await res.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  return { status: res.status, headers: res.headers, json: body, location: res.headers.get("location") };
}

const base = (process.env.OPS_BRIDGE_PUBLIC_URL || (existsSync(URL_FILE) ? readFileSync(URL_FILE, "utf8") : ""))
  .trim()
  .replace(/\/$/, "");
if (!base.startsWith("https://")) throw new Error("public HTTPS base URL is missing");

const challenge = await req(base, "POST", "/mcp", {
  json: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
});
const resource = await req(base, "GET", "/.well-known/oauth-protected-resource");
const as = await req(base, "GET", "/.well-known/oauth-authorization-server");
const verifier = randomBytes(32).toString("base64url");
const registered = await req(base, "POST", "/oauth/register", {
  json: { redirect_uris: ["http://127.0.0.1/callback"], token_endpoint_auth_method: "none" },
});
const approved = await req(base, "POST", "/oauth/authorize", {
  form: new URLSearchParams({
    response_type: "code",
    client_id: registered.json.client_id,
    redirect_uri: "http://127.0.0.1/callback",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    scope: "studio.snapshot.read studio.inbound.write studio.acknowledgement.read",
    resource: `${base}/mcp`,
    pin: pin(),
  }).toString(),
});
const code = approved.location ? new URL(approved.location).searchParams.get("code") : "";
const tokenRes = await req(base, "POST", "/oauth/token", {
  form: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: "http://127.0.0.1/callback",
    client_id: registered.json.client_id,
    code_verifier: verifier,
    resource: `${base}/mcp`,
  }).toString(),
});
const access = tokenRes.json?.access_token;
const snapshot = await req(base, "POST", "/mcp", {
  token: access,
  json: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "studio_snapshot", arguments: {} } },
});
const decisionId = `oauth-public-${Date.now()}`;
const inbound = await req(base, "POST", "/mcp", {
  token: access,
  json: {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "studio_inbound",
      arguments: {
        decisionId,
        authorizer: "OWNER_TAGIA",
        authorized: true,
        at: new Date().toISOString(),
        packageId: "STUDIO-OPERATING-CHATGPT-SCOUT-OPS-BRIDGE-1",
        action: "accept_proof",
        permittedAction: "Acknowledge public MCP OAuth. Do not merge. Do not push.",
        protectedAction: false,
        mergeAuthorized: false,
        pushAuthorized: false,
      },
    },
  },
});
const ack = await req(base, "POST", "/mcp", {
  token: access,
  json: {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "studio_acknowledgement", arguments: { decisionId } },
  },
});
const unknown = await req(base, "POST", "/mcp", {
  token: access,
  json: {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "http_fetch", arguments: { url: "https://example.com" } },
  },
});
const bad = await req(base, "POST", "/mcp", {
  token: "invalid-oauth-access-token",
  json: { jsonrpc: "2.0", id: 7, method: "tools/list" },
});

const checks = {
  unauthenticatedChallenge: challenge.status === 401 && String(challenge.headers.get("www-authenticate") || "").includes("oauth-protected-resource"),
  resourceMetadata: resource.json?.resource === `${base}/mcp`,
  authorizationServerMetadata:
    as.json?.code_challenge_methods_supported?.includes("S256") &&
    as.json?.authorization_endpoint === `${base}/oauth/authorize` &&
    as.json?.token_endpoint === `${base}/oauth/token`,
  pkceCompleted: Boolean(access) && tokenRes.status === 200,
  snapshotOk: parseTool(snapshot.json)?.kind === "chatgpt_scout_ops_snapshot",
  inboundOk: parseTool(inbound.json)?.ok === true,
  acknowledgementOk: parseTool(ack.json)?.acknowledgement?.decisionId === decisionId,
  invalidTokenRejected: bad.status === 401,
  unknownToolRejected: unknown.json?.error?.code === -32601,
};

const results = {
  mcpUrl: `${base}/mcp`,
  authorizationUrl: `${base}/oauth/authorize`,
  tokenUrl: `${base}/oauth/token`,
  protectedResourceMetadataUrl: `${base}/.well-known/oauth-protected-resource`,
  authorizationServerMetadataUrl: `${base}/.well-known/oauth-authorization-server`,
  scopes: [
    "studio.snapshot.read",
    "studio.inbound.write",
    "studio.acknowledgement.read",
  ],
  method: "OAuth 2.1 authorization-code + PKCE S256",
  tokenPrinted: false,
  pinPrinted: false,
  checks,
  ok: Object.values(checks).every(Boolean),
};
writeFileSync(RESULT_FILE, `${JSON.stringify(results, null, 2)}\n`, "utf8");
process.stdout.write(`ops-bridge MCP OAuth public proof ${results.ok ? "PASS" : "FAIL"}\n`);
process.exit(results.ok ? 0 : 2);
