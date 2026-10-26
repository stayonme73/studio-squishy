/**
 * ChatGPT-facing OAuth 2.1 for /mcp only.
 * Authorization code + PKCE S256. Static OPS_BRIDGE_SHARED_TOKEN stays internal.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { payloadContainsSecrets, redactSecrets } from "./ops-bridge-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT_STORE = path.join(ROOT, ".ops-bridge-oauth.json");
const DESK_PIN = path.join(ROOT, "docs/launch/project-alpha-owner-desk-pin.json");
const PUBLIC_URL_FILE = path.join(ROOT, ".ops-bridge-public-url");
const AUTHORIZE_AUDIT = path.join(ROOT, ".ops-bridge-oauth-authorize-audit.json");

const CHATGPT_CIMD_CLIENT_ID = "https://chatgpt.com/oauth/client.json";
const CHATGPT_EXACT_REDIRECTS = [
  "https://chatgpt.com/connector_platform_oauth_redirect",
  "http://127.0.0.1/callback",
];

export const OPS_BRIDGE_SCOPES = [
  "studio.snapshot.read",
  "studio.inbound.write",
  "studio.acknowledgement.read",
];

export const TOOL_SCOPES = {
  studio_snapshot: "studio.snapshot.read",
  studio_inbound: "studio.inbound.write",
  studio_acknowledgement: "studio.acknowledgement.read",
  studio_message_send: "studio.inbound.write",
  studio_message_read: "studio.acknowledgement.read",
};

const codes = new Map();
const tokens = new Map();
const CIMD_HOSTS = new Set(["chatgpt.com", "www.chatgpt.com"]);

function sendJson(res, status, payload, extraHeaders = {}) {
  const safe = redactSecrets(payload);
  if (payloadContainsSecrets(safe)) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(`${JSON.stringify({ ok: false, error: "payload_withheld" })}\n`);
    return;
  }
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(`${JSON.stringify(safe)}\n`);
}

export function resolvePublicOrigin(req, options = {}) {
  const explicit = options.publicOrigin || process.env.OPS_BRIDGE_PUBLIC_URL;
  if (explicit) return String(explicit).trim().replace(/\/$/, "");
  if (existsSync(PUBLIC_URL_FILE)) {
    const stored = readFileSync(PUBLIC_URL_FILE, "utf8").trim().replace(/\/$/, "");
    if (stored.startsWith("https://")) return stored;
  }
  const host = req.headers?.host;
  if (!host) return "https://127.0.0.1:4178";
  if (host.startsWith("127.0.0.1") || host.startsWith("localhost")) return `http://${host}`;
  return `https://${host}`;
}

export function wwwAuthenticate(origin, extra = {}) {
  const parts = [
    `Bearer FAKESECRET_g3h4i5j6k7l8m9n0o1p2="${origin}/.well-known/oauth-protected-resource"`,
    `scope="${OPS_BRIDGE_SCOPES.join(" ")}"`,
  ];
  if (extra.error) parts.push(`error="${extra.error}"`);
  if (extra.error_description) parts.push(`error_description="${extra.error_description}"`);
  return parts.join(", ");
}

export function protectedResourceMetadata(origin) {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: OPS_BRIDGE_SCOPES,
    bearer_methods_supported: ["header"],
    resource_documentation: `${origin}/oauth/authorize`,
  };
}

export function authorizationServerMetadata(origin) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: OPS_BRIDGE_SCOPES,
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true,
  };
}

function loadClients() {
  if (!existsSync(CLIENT_STORE)) return {};
  try {
    return JSON.parse(readFileSync(CLIENT_STORE, "utf8")).clients ?? {};
  } catch {
    return {};
  }
}

function saveClient(clientId, record) {
  const clients = loadClients();
  clients[clientId] = record;
  writeFileSync(CLIENT_STORE, `${JSON.stringify({ clients }, null, 2)}\n`, "utf8");
}

export function loadOwnerPin(options = {}) {
  if (options.ownerPin) return String(options.ownerPin);
  if (process.env.OPS_BRIDGE_OAUTH_OWNER_PIN) return process.env.OPS_BRIDGE_OAUTH_OWNER_PIN;
  if (existsSync(DESK_PIN)) {
    try {
      const saved = JSON.parse(readFileSync(DESK_PIN, "utf8"));
      if (saved.pin) return String(saved.pin);
    } catch {
      /* fall through */
    }
  }
  return null;
}

function pinsMatch(given, expected) {
  if (!given || !expected) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function s256(verifier) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function parseScopes(value) {
  const requested = String(value || "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!requested.length) return [...OPS_BRIDGE_SCOPES];
  const unknown = requested.filter((item) => !OPS_BRIDGE_SCOPES.includes(item));
  if (unknown.length) return null;
  return requested;
}

function allowedRedirect(uri) {
  try {
    const parsed = new URL(uri);
    if (CHATGPT_EXACT_REDIRECTS.includes(uri)) return true;
    if (parsed.protocol === "https:" && parsed.hostname === "chatgpt.com") {
      return parsed.pathname === "/connector_platform_oauth_redirect";
    }
    if (parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")) {
      return parsed.pathname === "/callback" && !parsed.search;
    }
    return false;
  } catch {
    return false;
  }
}

function redirectUriAccepted(requested, registered) {
  if (!requested || !Array.isArray(registered)) return false;
  if (registered.includes(requested)) return true;
  try {
    const url = new URL(requested);
    if (url.protocol !== "http:") return false;
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return false;
    if (url.pathname !== "/callback" || url.search) return false;
    return registered.includes("http://127.0.0.1/callback") || registered.includes("http://localhost/callback");
  } catch {
    return false;
  }
}

function writeAuthorizeAudit(entry) {
  writeFileSync(
    AUTHORIZE_AUDIT,
    `${JSON.stringify({ ...entry, at: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

async function resolveClient(clientId) {
  if (!clientId) return null;
  const stored = loadClients()[clientId];
  if (stored) {
    const redirectUris =
      clientId === CHATGPT_CIMD_CLIENT_ID
        ? [...new Set([...(stored.redirectUris ?? []), ...CHATGPT_EXACT_REDIRECTS])]
        : stored.redirectUris;
    return { clientId, ...stored, redirectUris };
  }
  if (!clientId.startsWith("https://")) return null;
  let parsed;
  try {
    parsed = new URL(clientId);
  } catch {
    return null;
  }
  if (!CIMD_HOSTS.has(parsed.hostname)) return null;
  const res = await fetch(clientId, { redirect: "error" });
  if (!res.ok) return null;
  const doc = await res.json();
  const published = Array.isArray(doc.redirect_uris) ? doc.redirect_uris.filter((uri) => typeof uri === "string") : [];
  const redirectUris = [...new Set([...published, ...CHATGPT_EXACT_REDIRECTS])];
  if (!redirectUris.length) return null;
  return {
    clientId,
    redirectUris,
    tokenEndpointAuthMethod: "none",
    cimd: true,
  };
}

export function verifyAccessToken(token, origin) {
  if (!token) {
    return { ok: false, error: "invalid_token", error_description: "Access token required" };
  }
  const record = tokens.get(token);
  if (!record) {
    return { ok: false, error: "invalid_token", error_description: "Access token is invalid" };
  }
  if (record.exp <= Date.now()) {
    tokens.delete(token);
    return { ok: false, error: "invalid_token", error_description: "Access token expired" };
  }
  const allowedAud = [`${origin}/mcp`, origin];
  if (!allowedAud.includes(record.aud)) {
    return { ok: false, error: "invalid_token", error_description: "Access token audience mismatch" };
  }
  return { ok: true, scopes: record.scopes, aud: record.aud };
}

export function issueAccessToken({ clientId, scopes, aud, expiresInSec = 28_800 }) {
  const accessToken = randomBytes(32).toString("hex");
  tokens.set(accessToken, {
    clientId,
    scopes,
    aud,
    exp: Date.now() + expiresInSec * 1000,
  });
  return { accessToken, expiresInSec, scopes };
}

function authorizePage(origin, query, error) {
  const scopes = parseScopes(query.scope)?.join(" ") ?? OPS_BRIDGE_SCOPES.join(" ");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Studio Ops Bridge — Owner approval</title></head>
<body>
<h1>Studio Ops Bridge</h1>
<p>ChatGPT is requesting access to the operations bridge only.</p>
<p>Scopes: ${scopes}</p>
${error ? `<p>${error}</p>` : ""}
<form method="post" action="/oauth/authorize">
<input type="hidden" name="response_type" value="code" />
<input type="hidden" name="client_id" value="${String(query.client_id ?? "")}" />
<input type="hidden" name="redirect_uri" value="${String(query.redirect_uri ?? "")}" />
<input type="hidden" name="code_challenge" value="${String(query.code_challenge ?? "")}" />
<input type="hidden" name="code_challenge_method" value="${String(query.code_challenge_method ?? "")}" />
<input type="hidden" name="scope" value="${scopes}" />
<input type="hidden" name="state" value="${String(query.state ?? "")}" />
<input type="hidden" name="resource" value="${String(query.resource ?? `${origin}/mcp`)}" />
<label>Owner PIN <input name="pin" type="password" autocomplete="one-time-code" required /></label>
<button type="submit">Approve</button>
</form>
<p>This is not the customer site. This is not the Owner Desk.</p>
</body></html>`;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function formToObject(raw, url) {
  const merged = Object.fromEntries(url.searchParams.entries());
  if (!raw) return merged;
  try {
    const parsed = raw.trim().startsWith("{") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
    return { ...merged, ...parsed };
  } catch {
    return { ...merged, ...Object.fromEntries(new URLSearchParams(raw)) };
  }
}

async function completeAuthorize(params, origin, options) {
  writeAuthorizeAudit({
    clientId: params.client_id ?? null,
    redirectUri: params.redirect_uri ?? null,
    responseType: params.response_type ?? null,
    codeChallengeMethod: params.code_challenge_method ?? null,
    scope: params.scope ?? null,
  });
  let client = await resolveClient(params.client_id);
  if (!client && params.client_id === CHATGPT_CIMD_CLIENT_ID) {
    client = {
      clientId: CHATGPT_CIMD_CLIENT_ID,
      redirectUris: [...CHATGPT_EXACT_REDIRECTS],
      tokenEndpointAuthMethod: "none",
      cimd: true,
    };
  }
  if (!client) return { status: 400, error: "Unknown client." };
  if (params.response_type !== "code") return { status: 400, error: "response_type must be code." };
  if (params.code_challenge_method !== "S256" || !params.code_challenge) {
    return { status: 400, error: "PKCE S256 is required." };
  }
  if (!redirectUriAccepted(params.redirect_uri, client.redirectUris)) {
    return { status: 400, error: "redirect_uri is not registered." };
  }
  const scopes = parseScopes(params.scope);
  if (!scopes) return { status: 400, error: "Unsupported scope." };
  if (!pinsMatch(params.pin, loadOwnerPin(options))) {
    return { status: 401, error: "Owner PIN did not match." };
  }
  const code = randomBytes(24).toString("hex");
  const resource = params.resource || `${origin}/mcp`;
  codes.set(code, {
    clientId: client.clientId,
    redirectUri: params.redirect_uri,
    challenge: params.code_challenge,
    scopes,
    aud: resource,
    exp: Date.now() + 5 * 60 * 1000,
  });
  const next = new URL(params.redirect_uri);
  next.searchParams.set("code", code);
  if (params.state) next.searchParams.set("state", params.state);
  next.searchParams.set("iss", origin);
  return { status: 302, location: next.toString() };
}

export async function handleOauthRequest(req, res, options = {}) {
  const origin = options.origin || resolvePublicOrigin(req, options);
  const pathname = options.pathname;

  if (pathname === "/.well-known/oauth-protected-resource" || pathname === "/.well-known/oauth-protected-resource/mcp") {
    sendJson(res, 200, protectedResourceMetadata(origin));
    return { status: 200, reason: "oauth_resource_metadata" };
  }
  if (pathname === "/.well-known/oauth-authorization-server") {
    sendJson(res, 200, authorizationServerMetadata(origin));
    return { status: 200, reason: "oauth_as_metadata" };
  }

  if (pathname === "/oauth/register" && req.method === "POST") {
    const raw = await readRawBody(req);
    const body = raw.trim().startsWith("{") ? JSON.parse(raw || "{}") : {};
    const redirectUris = (body.redirect_uris ?? []).filter(allowedRedirect);
    if (!redirectUris.length) {
      sendJson(res, 400, { error: "invalid_redirect_uri" });
      return { status: 400, reason: "oauth_register" };
    }
    const clientId = `dcr_${randomBytes(16).toString("hex")}`;
    saveClient(clientId, {
      redirectUris,
      tokenEndpointAuthMethod: "none",
      createdAt: new Date().toISOString(),
    });
    sendJson(res, 201, {
      client_id: clientId,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
    return { status: 201, reason: "oauth_register" };
  }

  if (pathname === "/oauth/authorize") {
    const raw = req.method === "POST" ? await readRawBody(req) : "";
    const params = formToObject(raw, options.url);
    if (req.method === "GET" && !params.pin) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(authorizePage(origin, params));
      return { status: 200, reason: "oauth_authorize_page" };
    }
    const result = await completeAuthorize(params, origin, options);
    if (result.location) {
      res.writeHead(302, { Location: result.location, "Cache-Control": "no-store" });
      res.end();
      return { status: 302, reason: "oauth_authorize" };
    }
    if (req.method === "GET") {
      res.writeHead(result.status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(authorizePage(origin, params, result.error));
      return { status: result.status, reason: "oauth_authorize" };
    }
    sendJson(res, result.status, { error: result.error });
    return { status: result.status, reason: "oauth_authorize" };
  }

  if (pathname === "/oauth/token" && req.method === "POST") {
    const raw = await readRawBody(req);
    const params = formToObject(raw, options.url);
    if (params.grant_type !== "authorization_code") {
      sendJson(res, 400, { error: "unsupported_grant_type" });
      return { status: 400, reason: "oauth_token" };
    }
    const record = codes.get(params.code);
    if (!record || record.exp <= Date.now()) {
      sendJson(res, 400, { error: "invalid_grant" });
      return { status: 400, reason: "oauth_token" };
    }
    if (record.clientId !== params.client_id || record.redirectUri !== params.redirect_uri) {
      sendJson(res, 400, { error: "invalid_grant" });
      return { status: 400, reason: "oauth_token" };
    }
    if (!params.code_verifier || record.challenge !== s256(params.code_verifier)) {
      sendJson(res, 400, { error: "invalid_grant" });
      return { status: 400, reason: "oauth_token" };
    }
    codes.delete(params.code);
    const issued = issueAccessToken({
      clientId: record.clientId,
      scopes: record.scopes,
      aud: params.resource || record.aud,
      expiresInSec: options.expiresInSec,
    });
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(
      `${JSON.stringify({
        access_token: issued.accessToken,
        token_type: "Bearer",
        expires_in: issued.expiresInSec,
        scope: issued.scopes.join(" "),
      })}\n`,
    );
    return { status: 200, reason: "oauth_token" };
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
  return { status: 404, reason: "oauth_not_found" };
}

export const OAUTH_PUBLIC_PATHS = new Set([
  "/.well-known/oauth-protected-resource",
  "/.well-known/oauth-protected-resource/mcp",
  "/.well-known/oauth-authorization-server",
  "/oauth/authorize",
  "/oauth/token",
  "/oauth/register",
]);
