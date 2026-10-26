import { createHash, randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

process.env.OPS_BRIDGE_ACTIVE_TASK = path.join(os.tmpdir(), "studio-ops-bridge-suite-lock-mcp.json");
process.env.OPS_BRIDGE_WORKER_RESULT = path.join(os.tmpdir(), "studio-ops-bridge-suite-result-mcp.json");

import { OPS_BRIDGE_DRY_RUN_PACKAGE_ID } from "@/config/studio-chatgpt-scout-ops-bridge-v1";

import { writeOutboundSnapshot } from "../../../scripts/ops-bridge-lib.mjs";
import {
  createMemoryRequest,
  createMemoryResponse,
  handleOpsBridgeHttpsRequest,
} from "../../../scripts/ops-bridge-https-lib.mjs";
import { OPS_BRIDGE_MCP_TOOLS } from "../../../scripts/ops-bridge-mcp.mjs";
import { OPS_BRIDGE_SCOPES } from "../../../scripts/ops-bridge-oauth.mjs";

const INTERNAL = "ops-bridge-internal-only-not-for-chatgpt";
const ORIGIN = "https://ops-bridge.test";
const PIN = "246801";

async function handle(
  method: string,
  url: string,
  extras: { token?: string; body?: unknown; form?: boolean } = {},
) {
  const req = createMemoryRequest({
    method,
    url,
    token: extras.token,
    body:
      extras.body == null
        ? undefined
        : extras.form || typeof extras.body === "string"
          ? extras.body
          : extras.body,
    headers: { accept: "application/json, text/event-stream" },
  });
  const res = createMemoryResponse();
  const result = await handleOpsBridgeHttpsRequest(req, res, {
    token: INTERNAL,
    ownerPin: PIN,
    publicOrigin: ORIGIN,
    expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
  });
  return {
    ...result,
    statusCode: res.statusCode,
    json: res.body ? JSON.parse(res.body) : null,
    headers: res.headers,
  };
}

async function mintAccessToken() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const registered = await handle("POST", "/oauth/register", {
    body: { redirect_uris: ["http://127.0.0.1/callback"], token_endpoint_auth_method: "none" },
  });
  const approved = await handle("POST", "/oauth/authorize", {
    form: true,
    body: new URLSearchParams({
      response_type: "code",
      client_id: registered.json.client_id,
      redirect_uri: "http://127.0.0.1/callback",
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: OPS_BRIDGE_SCOPES.join(" "),
      resource: `${ORIGIN}/mcp`,
      pin: PIN,
    }).toString(),
  });
  const location = new URL(approved.headers.Location);
  const token = await handle("POST", "/oauth/token", {
    form: true,
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: location.searchParams.get("code") ?? "",
      redirect_uri: "http://127.0.0.1/callback",
      client_id: registered.json.client_id,
      code_verifier: verifier,
      resource: `${ORIGIN}/mcp`,
    }).toString(),
  });
  return token.json.access_token as string;
}

async function mcp(method: string, extras: { token?: string; body?: unknown; id?: number } = {}) {
  return handle(method, "/mcp", extras);
}

let accessToken = "";

function callTool(name: string, args: Record<string, unknown> = {}, id = 3) {
  return mcp("POST", {
    token: accessToken,
    body: {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    },
  });
}

function parseTool(json: { result?: { content?: { text?: string }[] } }) {
  const text = json.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

describe("ops-bridge Streamable HTTP MCP wrapper", () => {
  it("exposes the bridge tools and completes the authenticated loop", async () => {
    writeOutboundSnapshot({
      testsResults: "mcp wrapper local proof",
      nextDecisionRequired: "Do not claim zero-courier until ChatGPT uses /mcp independently.",
    });

    const missing = await mcp("POST", {
      token: "",
      body: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    });
    expect(missing.statusCode).toBe(401);

    const wrong = await mcp("POST", {
      token: "wrong-token-value",
      body: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    });
    expect(wrong.statusCode).toBe(401);

    accessToken = await mintAccessToken();
    const init = await mcp("POST", {
      token: accessToken,
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "ops-bridge-test", version: "1" },
        },
      },
    });
    expect(init.statusCode).toBe(200);
    expect(init.json.result.serverInfo.name).toBe("studio-ops-bridge");
    expect(init.headers["Mcp-Session-Id"]).toBeTruthy();

    const listed = await mcp("POST", {
      token: accessToken,
      body: { jsonrpc: "2.0", id: 2, method: "tools/list" },
    });
    expect(listed.json.result.tools.map((tool: { name: string }) => tool.name)).toEqual(OPS_BRIDGE_MCP_TOOLS);
    expect(listed.json.result.tools).toHaveLength(5);

    const snapshot = await callTool("studio_snapshot");
    expect(snapshot.statusCode).toBe(200);
    const snapshotBody = parseTool(snapshot.json);
    expect(snapshotBody.kind).toBe("chatgpt_scout_ops_snapshot");
    expect(JSON.stringify(snapshot.json)).not.toContain(INTERNAL);

    const decision = {
      decisionId: `mcp-${Date.now()}`,
      authorizer: "OWNER_TAGIA",
      authorized: true,
      at: new Date().toISOString(),
      packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
      action: "accept_proof",
      permittedAction: "Acknowledge the MCP wrapper. Do not merge. Do not push.",
      protectedAction: false,
      mergeAuthorized: false,
      pushAuthorized: false,
    };
    const inbound = await callTool("studio_inbound", decision);
    const inboundBody = parseTool(inbound.json);
    expect(inboundBody.ok).toBe(true);
    expect(inboundBody.acknowledgement.scoutActed).toBe(true);

    const inboundTool = listed.json.result.tools.find(
      (tool: { name: string }) => tool.name === "studio_inbound",
    );
    expect(inboundTool.inputSchema.required).toContain("taskId");
    expect(inboundTool.inputSchema.properties.taskId.enum).toEqual([
      "local_test_readiness",
      "synthetic_machine_quality_status",
      "synthetic_assignment_receipt",
    ]);
    expect(inboundTool.inputSchema.properties.assignmentTitle.maxLength).toBe(120);

    const taskLine = {
      authorizer: "OWNER_TAGIA",
      authorized: true,
      at: new Date().toISOString(),
      packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
      action: "run_readonly_task",
      permittedAction:
        "Inspect local test readiness only. Do not change files. Do not merge. Do not push.",
      protectedAction: false,
      mergeAuthorized: false,
      pushAuthorized: false,
    };
    const missingTask = parseTool(
      (
        await callTool("studio_inbound", {
          ...taskLine,
          decisionId: `mcp-task-missing-${Date.now()}`,
        })
      ).json,
    );
    expect(missingTask.ok).toBe(false);
    expect(missingTask.reason).toBe("scope_expansion");
    expect(missingTask.detail).toBe("Unknown task: missing");
    expect(missingTask.acknowledgement.scoutActed).toBe(false);

    const unsupportedTask = parseTool(
      (
        await callTool("studio_inbound", {
          ...taskLine,
          decisionId: `mcp-task-unsupported-${Date.now()}`,
          taskId: "run_shell",
        })
      ).json,
    );
    expect(unsupportedTask.ok).toBe(false);
    expect(unsupportedTask.reason).toBe("scope_expansion");
    expect(unsupportedTask.detail).toBe("Unknown task: run_shell");
    expect(unsupportedTask.acknowledgement.scoutActed).toBe(false);

    const readyTask = parseTool(
      (
        await callTool("studio_inbound", {
          ...taskLine,
          decisionId: `mcp-task-ready-${Date.now()}`,
          taskId: "local_test_readiness",
        })
      ).json,
    );
    expect(readyTask.ok).toBe(true);
    expect(readyTask.acknowledgement.state).toBe("completed");
    expect(readyTask.acknowledgement.scoutActed).toBe(true);
    expect(readyTask.acknowledgement.taskId).toBe("local_test_readiness");
    expect(readyTask.acknowledgement.evidence.kind).toBe("local_test_readiness");
    expect(readyTask.acknowledgement.evidence.source).toBe("ops-bridge-readonly-worker");
    expect(readyTask.acknowledgement.evidence.workerPid).not.toBe(process.pid);
    expect(readyTask.acknowledgement.evidence.filesChangedByTask).toBe(false);

    const ack = await callTool("studio_acknowledgement", { decisionId: decision.decisionId });
    const ackBody = parseTool(ack.json);
    expect(ackBody.acknowledgement.decisionId).toBe(decision.decisionId);
    expect(ackBody.acknowledgement.ok).toBe(true);
    expect(JSON.stringify(ack.json)).not.toMatch(/sk_live_|sk_test_|Bearer /);
  }, 20_000);

  it("rejects unknown tools, generic fetch, file paths, and shell/repo names", async () => {
    accessToken = await mintAccessToken();
    const unknown = await callTool("http_fetch", { url: "https://example.com" });
    expect(unknown.json.error.code).toBe(-32601);

    const fetchTool = await callTool("fetch", { url: "https://example.com" });
    expect(fetchTool.json.error.message).toMatch(/Unknown tool/);

    const shell = await callTool("shell", { command: "git status" });
    expect(shell.json.error.message).toMatch(/Unknown tool/);

    const repo = await callTool("git_read", { repo: "." });
    expect(repo.json.error.message).toMatch(/Unknown tool/);

    const filePath = await callTool("studio_snapshot", { path: ".env" });
    expect(parseTool(filePath.json).error).toBe("arbitrary_file_path");
    expect(filePath.json.result.isError).toBe(true);

    const urlArg = await callTool("studio_acknowledgement", { url: "https://example.com" });
    expect(parseTool(urlArg.json).error).toBe("arbitrary_file_path");

    const restUnchanged = await handleOpsBridgeHttpsRequest(
      createMemoryRequest({ method: "GET", url: "/v1/snapshot", token: INTERNAL }),
      createMemoryResponse(),
      { token: INTERNAL },
    );
    expect(restUnchanged.status).toBe(200);
  });
});
