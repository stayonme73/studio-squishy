import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { OPS_BRIDGE_DRY_RUN_PACKAGE_ID } from "@/config/studio-chatgpt-scout-ops-bridge-v1";

import { writeOutboundSnapshot } from "../../../scripts/ops-bridge-lib.mjs";
import {
  createMemoryRequest,
  createMemoryResponse,
  handleOpsBridgeHttpsRequest,
} from "../../../scripts/ops-bridge-https-lib.mjs";
import { OPS_BRIDGE_SCOPES } from "../../../scripts/ops-bridge-oauth.mjs";

const ORIGIN = "https://ops-bridge.test";
const PIN = "246801";
const INTERNAL = "internal-static-token-not-for-chatgpt";

async function call(
  method: string,
  url: string,
  extras: {
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
    form?: boolean;
    expiresInSec?: number;
  } = {},
) {
  const body =
    extras.body == null
      ? undefined
      : extras.form || typeof extras.body === "string"
        ? extras.body
        : JSON.stringify(extras.body);
  const req = createMemoryRequest({
    method,
    url,
    token: extras.token,
    body,
    headers: extras.headers ?? {},
  });
  const res = createMemoryResponse();
  const result = await handleOpsBridgeHttpsRequest(req, res, {
    token: INTERNAL,
    ownerPin: PIN,
    publicOrigin: ORIGIN,
    expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    expiresInSec: extras.expiresInSec,
  });
  return {
    ...result,
    statusCode: res.statusCode,
    headers: res.headers,
    json: res.body ? safeJson(res.body) : null,
    body: res.body,
  };
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function mintAccessToken(expiresInSec?: number) {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const registered = await call("POST", "/oauth/register", {
    body: {
      redirect_uris: ["http://127.0.0.1/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
    },
  });
  const clientId = registered.json.client_id;
  const approved = await call("POST", "/oauth/authorize", {
    form: true,
    body: new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "http://127.0.0.1/callback",
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: OPS_BRIDGE_SCOPES.join(" "),
      state: "st1",
      resource: `${ORIGIN}/mcp`,
      pin: PIN,
    }).toString(),
    expiresInSec,
  });
  const location = new URL(approved.headers.Location);
  const token = await call("POST", "/oauth/token", {
    form: true,
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: location.searchParams.get("code") ?? "",
      redirect_uri: "http://127.0.0.1/callback",
      client_id: clientId,
      code_verifier: verifier,
      resource: `${ORIGIN}/mcp`,
    }).toString(),
    expiresInSec,
  });
  return token.json.access_token as string;
}

describe("MCP OAuth 2.1 PKCE", () => {
  it("challenges unauthenticated /mcp and publishes discovery metadata", async () => {
    const challenge = await call("POST", "/mcp", {
      body: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    });
    expect(challenge.statusCode).toBe(401);
    expect(challenge.headers["WWW-Authenticate"]).toContain(
      `${ORIGIN}/.well-known/oauth-protected-resource`,
    );
    expect(challenge.headers["WWW-Authenticate"]).toContain("studio.snapshot.read");

    const resource = await call("GET", "/.well-known/oauth-protected-resource");
    expect(resource.json.resource).toBe(`${ORIGIN}/mcp`);
    expect(resource.json.authorization_servers).toEqual([ORIGIN]);

    const as = await call("GET", "/.well-known/oauth-authorization-server");
    expect(as.json.authorization_endpoint).toBe(`${ORIGIN}/oauth/authorize`);
    expect(as.json.token_endpoint).toBe(`${ORIGIN}/oauth/token`);
    expect(as.json.code_challenge_methods_supported).toEqual(["S256"]);
    expect(as.json.authorization_response_iss_parameter_supported).toBe(true);
  });

  it("completes authorization-code + PKCE S256 and keeps Owner protocol", async () => {
    writeOutboundSnapshot({ testsResults: "mcp oauth local proof" });
    const access = await mintAccessToken();
    expect(typeof access).toBe("string");
    expect(access.length).toBeGreaterThan(20);
    expect(access).not.toBe("[REDACTED]");

    const snapshot = await call("POST", "/mcp", {
      token: access,
      body: {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "studio_snapshot", arguments: {} },
      },
    });
    const snapshotText = JSON.parse(snapshot.json.result.content[0].text);
    expect(snapshotText.kind).toBe("chatgpt_scout_ops_snapshot");

    const decisionId = `oauth-${Date.now()}`;
    const inbound = await call("POST", "/mcp", {
      token: access,
      body: {
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
            packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
            action: "accept_proof",
            permittedAction: "Acknowledge MCP OAuth. Do not merge. Do not push.",
            protectedAction: false,
            mergeAuthorized: false,
            pushAuthorized: false,
          },
        },
      },
    });
    expect(JSON.parse(inbound.json.result.content[0].text).ok).toBe(true);

    const unsigned = await call("POST", "/mcp", {
      token: access,
      body: {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "studio_inbound",
          arguments: {
            decisionId: `unsigned-${Date.now()}`,
            authorizer: "OWNER_TAGIA",
            authorized: false,
            at: new Date().toISOString(),
            packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
            action: "accept_proof",
            permittedAction: "Should fail",
          },
        },
      },
    });
    expect(JSON.parse(unsigned.json.result.content[0].text).reason).toBe("unsigned_or_unapproved");

    const ack = await call("POST", "/mcp", {
      token: access,
      body: {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "studio_acknowledgement", arguments: { decisionId } },
      },
    });
    expect(JSON.parse(ack.json.result.content[0].text).acknowledgement.decisionId).toBe(decisionId);

    const unknown = await call("POST", "/mcp", {
      token: access,
      body: {
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "http_fetch", arguments: { url: "https://example.com" } },
      },
    });
    expect(unknown.json.error.code).toBe(-32601);

    const expired = await mintAccessToken(0);
    const rejected = await call("POST", "/mcp", {
      token: expired,
      body: { jsonrpc: "2.0", id: 8, method: "tools/list" },
    });
    expect(rejected.statusCode).toBe(401);

    const staticRejected = await call("POST", "/mcp", {
      token: INTERNAL,
      body: { jsonrpc: "2.0", id: 9, method: "tools/list" },
    });
    expect(staticRejected.statusCode).toBe(401);
    expect(JSON.stringify(snapshot.json)).not.toContain(INTERNAL);
    expect(JSON.stringify(snapshot.json)).not.toContain(PIN);
  });

  it("accepts the exact ChatGPT CIMD redirect and RFC 8252 loopback callback", async () => {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const official = "https://chatgpt.com/connector_platform_oauth_redirect";
    const approved = await call("POST", "/oauth/authorize", {
      form: true,
      body: new URLSearchParams({
        response_type: "code",
        client_id: "https://chatgpt.com/oauth/client.json",
        redirect_uri: official,
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: OPS_BRIDGE_SCOPES.join(" "),
        state: "desktop",
        resource: `${ORIGIN}/mcp`,
        pin: PIN,
      }).toString(),
    });
    expect(approved.statusCode).toBe(302);
    const location = new URL(approved.headers.Location);
    expect(`${location.origin}${location.pathname}`).toBe(official);
    expect(location.searchParams.get("iss")).toBe(ORIGIN);
    expect(location.searchParams.get("code")).toBeTruthy();

    const loopback = await call("POST", "/oauth/authorize", {
      form: true,
      body: new URLSearchParams({
        response_type: "code",
        client_id: "https://chatgpt.com/oauth/client.json",
        redirect_uri: "http://127.0.0.1:54321/callback",
        code_challenge: challenge,
        code_challenge_method: "S256",
        scope: OPS_BRIDGE_SCOPES.join(" "),
        resource: `${ORIGIN}/mcp`,
        pin: PIN,
      }).toString(),
    });
    expect(loopback.statusCode).toBe(302);
    expect(loopback.headers.Location.startsWith("http://127.0.0.1:54321/callback?")).toBe(true);
  });
});
