/**
 * Streamable HTTP MCP wrapper for the ops-bridge.
 * Bridge tools only. No generic HTTP, files, shell, or repo.
 * Message tools store text. They do not execute work.
 */
import { randomBytes } from "node:crypto";
import {
  payloadContainsSecrets,
  performAcknowledgement,
  performInbound,
  performSnapshot,
  redactSecrets,
} from "./ops-bridge-lib.mjs";
import { listBridgeMessages, postChatgptMessage } from "./ops-bridge-messages.mjs";
import { TOOL_SCOPES, wwwAuthenticate } from "./ops-bridge-oauth.mjs";

export const OPS_BRIDGE_MCP_PROTOCOL = "2025-03-26";
export const OPS_BRIDGE_MCP_TOOLS = [
  "studio_snapshot",
  "studio_inbound",
  "studio_acknowledgement",
  "studio_message_send",
  "studio_message_read",
];

const FORBIDDEN_ARG_KEYS = new Set([
  "path",
  "file",
  "filepath",
  "filename",
  "url",
  "uri",
  "command",
  "cmd",
  "shell",
  "cwd",
  "repo",
  "repository",
]);

export const MCP_TOOL_CONTRACTS = [
  {
    name: "studio_snapshot",
    description: "Read the redacted ChatGPT ↔ Scout outbound snapshot. Wraps GET /v1/snapshot.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "studio_inbound",
    description:
      "Submit one Owner-authorized inbound decision. Wraps POST /v1/inbound. Requires OWNER_TAGIA and authorized true. taskId is required. Read-only values are local_test_readiness and synthetic_machine_quality_status. The one engineering value is synthetic_assignment_receipt, and it requires assignmentTitle. The server does not accept a prompt or a shell command.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: [
        "decisionId",
        "authorizer",
        "authorized",
        "at",
        "packageId",
        "action",
        "permittedAction",
        "taskId",
      ],
      properties: {
        decisionId: { type: "string" },
        authorizer: { type: "string" },
        authorized: { type: "boolean" },
        at: { type: "string" },
        expiresAt: { type: "string" },
        packageId: { type: "string" },
        action: { type: "string" },
        permittedAction: { type: "string" },
        scope: { type: "string" },
        protectedAction: { type: "boolean" },
        mergeAuthorized: { type: "boolean" },
        pushAuthorized: { type: "boolean" },
        taskId: {
          type: "string",
          enum: [
            "local_test_readiness",
            "synthetic_machine_quality_status",
            "synthetic_assignment_receipt",
          ],
          description:
            "Required. Read-only values are local_test_readiness and synthetic_machine_quality_status. synthetic_assignment_receipt is the only engineering assignment, used with action run_synthetic_engineering_handoff.",
        },
        assignmentTitle: {
          type: "string",
          maxLength: 120,
          description:
            "Required for synthetic_assignment_receipt. One plain line naming the assignment. It is recorded and checked. It is not executed.",
        },
      },
    },
  },
  {
    name: "studio_acknowledgement",
    description: "Read Scout acknowledgement/result. Wraps GET /v1/acknowledgement.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        decisionId: { type: "string" },
      },
    },
  },
  {
    name: "studio_message_send",
    description:
      "Store one ChatGPT message for Scout. Sender is CHATGPT and recipient is SCOUT. Requires OWNER_TAGIA and authorized true. This records bridge receipt only. It does not execute work, and cursorScoutConsumed stays false until a local Cursor Scout session reads it.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["messageId", "authorizer", "authorized", "packageId", "kind", "body"],
      properties: {
        messageId: { type: "string", maxLength: 80 },
        authorizer: { type: "string" },
        authorized: { type: "boolean" },
        packageId: { type: "string", maxLength: 120 },
        assignmentId: { type: "string", maxLength: 120 },
        kind: {
          type: "string",
          enum: ["message", "acknowledgement", "reply", "progress", "review", "clarification"],
        },
        body: { type: "string", maxLength: 2000 },
        inReplyTo: { type: "string", maxLength: 80 },
      },
    },
  },
  {
    name: "studio_message_read",
    description:
      "Read the ChatGPT ↔ Scout inbox in order. Messages addressed to ChatGPT are marked retrieved. cursorScoutConsumed is true only after a local Cursor Scout session consumes a message addressed to Scout.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
];

function sendJson(res, status, payload, extraHeaders = {}) {
  const safe = redactSecrets(payload);
  if (payloadContainsSecrets(safe)) {
    res.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    });
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

function mcpResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function mcpError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolText(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(redactSecrets(payload)) }],
    isError: payload?.ok === false && payload?.error != null,
  };
}

function hasForbiddenArgs(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  return Object.keys(args).some((key) => FORBIDDEN_ARG_KEYS.has(key.toLowerCase()));
}


async function readBody(req) {
  if (req.method !== "POST") return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) {
      const error = new Error("body_too_large");
      error.code = "body_too_large";
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function handleJsonRpc(message, options) {
  if (!message || message.jsonrpc !== "2.0") {
    return { status: 400, payload: mcpError(message?.id ?? null, -32600, "Invalid Request") };
  }
  if (Array.isArray(message)) {
    return { status: 400, payload: mcpError(null, -32600, "Batch requests are not supported") };
  }
  if (message.method && message.id == null) {
    return { status: 202, payload: null, notification: true };
  }

  if (message.method === "initialize") {
    return {
      status: 200,
      payload: mcpResult(message.id, {
        protocolVersion: OPS_BRIDGE_MCP_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "studio-ops-bridge", version: "1" },
        instructions:
          "Bridge tools: studio_snapshot, studio_inbound, studio_acknowledgement, studio_message_send, studio_message_read. Messages are stored text. They do not execute work. No generic HTTP, files, shell, or repository.",
      }),
      newSession: true,
    };
  }

  if (message.method === "ping" || message.method === "tools/list") {
    if (message.method === "ping") {
      return { status: 200, payload: mcpResult(message.id, {}) };
    }
    return { status: 200, payload: mcpResult(message.id, { tools: MCP_TOOL_CONTRACTS }) };
  }

  if (message.method === "tools/call") {
    const name = message.params?.name;
    const args = message.params?.arguments ?? {};
    if (!OPS_BRIDGE_MCP_TOOLS.includes(name)) {
      return { status: 200, payload: mcpError(message.id, -32601, `Unknown tool: ${name ?? "missing"}`) };
    }
    if (hasForbiddenArgs(args)) {
      return {
        status: 200,
        payload: mcpResult(message.id, {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: "arbitrary_file_path" }) }],
          isError: true,
        }),
      };
    }
    const requiredScope = TOOL_SCOPES[name];
    if (requiredScope && options.scopes && !options.scopes.includes(requiredScope)) {
      return {
        status: 200,
        payload: {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32000,
            message: "insufficient_scope",
            data: {
              _meta: {
                "mcp/www_authenticate": wwwAuthenticate(options.origin ?? "", {
                  error: "insufficient_scope",
                  error_description: `Missing ${requiredScope}`,
                }),
              },
            },
          },
        },
      };
    }
    if (name === "studio_snapshot") {
      const result = performSnapshot();
      return { status: 200, payload: mcpResult(message.id, toolText(result.payload)) };
    }
    if (name === "studio_acknowledgement") {
      const result = performAcknowledgement(typeof args.decisionId === "string" ? args.decisionId : null);
      return { status: 200, payload: mcpResult(message.id, toolText(result.payload)) };
    }
    if (name === "studio_message_send") {
      const result = postChatgptMessage(args);
      return { status: 200, payload: mcpResult(message.id, toolText(result)) };
    }
    if (name === "studio_message_read") {
      const result = listBridgeMessages();
      return { status: 200, payload: mcpResult(message.id, toolText(result)) };
    }
    const result = performInbound(args, options.expectedPackageId ?? null);
    return { status: 200, payload: mcpResult(message.id, toolText(result.payload)) };
  }

  return { status: 200, payload: mcpError(message.id ?? null, -32601, `Unknown method: ${message.method}`) };
}

export async function handleMcpRequest(req, res, options = {}) {
  const sessionId = req.headers?.["mcp-session-id"] || randomBytes(16).toString("hex");
  const headers = { "Mcp-Session-Id": sessionId };

  if (req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      ...headers,
    });
    res.end(": studio-ops-bridge\n\n");
    return { status: 200, reason: "mcp_sse" };
  }

  if (req.method === "DELETE") {
    res.writeHead(204, { "Cache-Control": "no-store", ...headers });
    res.end();
    return { status: 204, reason: "mcp_session_closed" };
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" }, headers);
    return { status: 405, reason: "method_not_allowed" };
  }

  let message;
  try {
    message = await readBody(req);
  } catch (error) {
    sendJson(
      res,
      400,
      mcpError(null, -32700, error.code === "body_too_large" ? "Parse error" : "Parse error"),
      headers,
    );
    return { status: 400, reason: "invalid_json" };
  }

  const handled = handleJsonRpc(message, options);
  if (handled.notification) {
    res.writeHead(202, { "Cache-Control": "no-store", ...headers });
    res.end();
    return { status: 202, reason: "mcp_notification" };
  }
  sendJson(res, handled.status, handled.payload, headers);
  return { status: handled.status, reason: "mcp" };
}

export { handleJsonRpc };
