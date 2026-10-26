/**
 * Authenticated ops-bridge surface.
 * Task endpoints plus the message inbox. Not the Owner Desk. No shell, no repo, no arbitrary files.
 */
import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  OPS_BRIDGE_PATHS,
  payloadContainsSecrets,
  performAcknowledgement,
  performInbound,
  performSnapshot,
  redactSecrets,
} from "./ops-bridge-lib.mjs";
import { listBridgeMessages, postChatgptMessage } from "./ops-bridge-messages.mjs";
import { handleMcpRequest } from "./ops-bridge-mcp.mjs";
import {
  OAUTH_PUBLIC_PATHS,
  handleOauthRequest,
  resolvePublicOrigin,
  verifyAccessToken,
  wwwAuthenticate,
} from "./ops-bridge-oauth.mjs";

export const OPS_BRIDGE_HTTPS_PORT = 4178;
export const OPS_BRIDGE_HTTPS_HOST = "127.0.0.1";
export const OPS_BRIDGE_MAX_BODY_BYTES = 64 * 1024;

const ALLOWED = new Map([
  ["GET /v1/snapshot", "snapshot"],
  ["POST /v1/inbound", "inbound"],
  ["GET /v1/acknowledgement", "acknowledgement"],
  ["POST /v1/messages", "message_send"],
  ["GET /v1/messages", "message_read"],
]);

const FILE_PATH_KEYS = new Set(["path", "file", "filepath", "filename"]);

export function normalizeBridgePath(rawPath) {
  const pathname = String(rawPath ?? "").split("?")[0].split("#")[0];
  if (!pathname.startsWith("/") || pathname.includes("\\") || pathname.includes("\0")) {
    return null;
  }
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes("..") || decoded.includes("\\")) return null;
  return decoded.replace(/\/{2,}/g, "/");
}

export function tokensMatch(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  if (!expected || !provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function readBearerToken(req) {
  const header = req.headers?.authorization;
  if (typeof header === "string") {
    const match = /^Bearer\s+(\S+)/i.exec(header.trim());
    if (match) return match[1];
  }
  const alt = req.headers?.["x-ops-bridge-token"];
  return typeof alt === "string" ? alt.trim() : "";
}

function hasFilePathProbe(searchParams, body) {
  for (const key of searchParams.keys()) {
    if (FILE_PATH_KEYS.has(key.toLowerCase())) return true;
  }
  if (body && typeof body === "object") {
    for (const key of Object.keys(body)) {
      if (FILE_PATH_KEYS.has(key.toLowerCase())) return true;
    }
  }
  return false;
}

function sendJson(res, status, payload) {
  const safe = redactSecrets(payload);
  if (payloadContainsSecrets(safe)) {
    const withheld = { ok: false, error: "payload_withheld" };
    res.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(`${JSON.stringify(withheld)}\n`);
    return;
  }
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(`${JSON.stringify(safe)}\n`);
}

function readHeartbeatPackageId() {
  try {
    const heartbeat = JSON.parse(
      readFileSync(path.join(OPS_BRIDGE_PATHS.ROOT, "docs/launch/project-alpha-work-heartbeat.json"), "utf8"),
    );
    return heartbeat.packageId ?? null;
  } catch {
    return null;
  }
}

export function parseRequestUrl(req) {
  const host = req.headers?.host || `${OPS_BRIDGE_HTTPS_HOST}:${OPS_BRIDGE_HTTPS_PORT}`;
  return new URL(req.url ?? "/", `https://${host}`);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > OPS_BRIDGE_MAX_BODY_BYTES) {
      const error = new Error("body_too_large");
      error.code = "body_too_large";
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendMcpUnauthorized(res, origin, extra = {}) {
  const challenge = wwwAuthenticate(origin, extra);
  res.writeHead(401, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "WWW-Authenticate": challenge,
  });
  res.end(
    `${JSON.stringify({
      error: extra.error ?? "unauthorized",
      error_description: extra.error_description ?? "OAuth access token required",
    })}\n`,
  );
  return { status: 401, reason: "mcp_oauth_challenge", challenge };
}

export async function handleOpsBridgeHttpsRequest(req, res, options = {}) {
  const expectedToken = options.token ?? process.env.OPS_BRIDGE_SHARED_TOKEN ?? "";
  const url = parseRequestUrl(req);
  const pathname = normalizeBridgePath(url.pathname);
  const origin = resolvePublicOrigin(req, options);
  const route = pathname ? ALLOWED.get(`${req.method} ${pathname}`) : null;

  if (pathname && OAUTH_PUBLIC_PATHS.has(pathname)) {
    return handleOauthRequest(req, res, {
      url,
      pathname,
      origin,
      ownerPin: options.ownerPin,
      expiresInSec: options.expiresInSec,
    });
  }

  if (pathname === "/mcp") {
    const access = verifyAccessToken(readBearerToken(req), origin);
    if (!access.ok) {
      return sendMcpUnauthorized(res, origin, access);
    }
    return handleMcpRequest(req, res, {
      expectedPackageId: options.expectedPackageId ?? readHeartbeatPackageId(),
      scopes: access.scopes,
      origin,
    });
  }

  if (!expectedToken) {
    sendJson(res, 503, { ok: false, error: "bridge_token_not_configured" });
    return { status: 503, reason: "bridge_token_not_configured" };
  }

  if (!tokensMatch(readBearerToken(req), expectedToken)) {
    sendJson(res, 401, { ok: false, error: "unauthorized" });
    return { status: 401, reason: "unauthorized" };
  }

  if (!route) {
    sendJson(res, 404, { ok: false, error: "not_found" });
    return { status: 404, reason: "not_found" };
  }

  let body = {};
  if (req.method === "POST") {
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error.code === "body_too_large" ? "body_too_large" : "invalid_json",
      });
      return { status: 400, reason: error.code === "body_too_large" ? "body_too_large" : "invalid_json" };
    }
  }

  if (hasFilePathProbe(url.searchParams, body)) {
    sendJson(res, 400, { ok: false, error: "arbitrary_file_path" });
    return { status: 400, reason: "arbitrary_file_path" };
  }

  if (route === "snapshot") {
    const result = performSnapshot();
    sendJson(res, result.status, result.payload);
    return { status: result.status, reason: result.payload.error ?? "snapshot" };
  }

  if (route === "acknowledgement") {
    const result = performAcknowledgement(url.searchParams.get("decisionId"));
    sendJson(res, result.status, result.payload);
    return { status: result.status, reason: "acknowledgement" };
  }

  if (route === "message_send") {
    const result = postChatgptMessage(body);
    sendJson(res, result.ok ? 200 : 400, result);
    return { status: result.ok ? 200 : 400, reason: result.reason ?? "message" };
  }

  if (route === "message_read") {
    const result = listBridgeMessages();
    sendJson(res, result.ok ? 200 : 400, result);
    return { status: result.ok ? 200 : 400, reason: "message_read" };
  }

  const expectedPackageId = options.expectedPackageId ?? readHeartbeatPackageId();
  const result = performInbound(body, expectedPackageId);
  sendJson(res, result.status, result.payload);
  return { status: result.status, reason: result.payload.reason ?? "accepted" };
}

export function createMemoryResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers ?? {};
    },
    end(chunk) {
      this.body = String(chunk ?? "");
    },
  };
}

export function createMemoryRequest({ method, url, token, body, headers = {} }) {
  const payload = body == null ? "" : typeof body === "string" ? body : JSON.stringify(body);
  return {
    method,
    url,
    headers: {
      host: `${OPS_BRIDGE_HTTPS_HOST}:${OPS_BRIDGE_HTTPS_PORT}`,
      authorization: token ? `Bearer ${token}` : "",
      ...headers,
    },
    async *[Symbol.asyncIterator]() {
      if (payload) yield Buffer.from(payload);
    },
  };
}
