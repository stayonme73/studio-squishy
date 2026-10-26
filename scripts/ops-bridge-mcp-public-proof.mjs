/**
 * Prove the public Streamable HTTP MCP wrapper. Never prints the bearer token.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL_FILE = path.join(ROOT, ".ops-bridge-public-url");
const TOKEN_FILE = path.join(ROOT, ".ops-bridge-local-token");
const RESULT_FILE = path.join(
  ROOT,
  "docs/launch/studio-operating-chatgpt-scout-ops-bridge-1/TRANSPORT-MCP-WRAPPER-PROOF.json",
);

function token() {
  const value = (process.env.OPS_BRIDGE_SHARED_TOKEN || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, "utf8") : "")).trim();
  if (!value) throw new Error("host token file missing");
  return value;
}

function parseTool(json) {
  const text = json?.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

async function mcp(base, body, { auth = true, headerToken } = {}) {
  const headers = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (auth) headers.authorization = `Bearer ${headerToken ?? token()}`;
  const res = await fetch(`${base}/mcp`, { method: "POST", headers, body: JSON.stringify(body) });
  const raw = await res.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const base = (process.env.OPS_BRIDGE_PUBLIC_URL || (existsSync(URL_FILE) ? readFileSync(URL_FILE, "utf8") : "")).trim().replace(/\/$/, "");
if (!base.startsWith("https://")) throw new Error("public HTTPS base URL is missing");

const unauth = await mcp(base, { jsonrpc: "2.0", id: 1, method: "initialize", params: {} }, { auth: false });
const wrong = await mcp(
  base,
  { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
  { headerToken: "wrong-token-value" },
);
const listed = await mcp(base, { jsonrpc: "2.0", id: 2, method: "tools/list" });
const snapshot = await mcp(base, {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "studio_snapshot", arguments: {} },
});
const decisionId = `mcp-public-${Date.now()}`;
const inbound = await mcp(base, {
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
      permittedAction: "Acknowledge the public MCP wrapper. Do not merge. Do not push.",
      protectedAction: false,
      mergeAuthorized: false,
      pushAuthorized: false,
    },
  },
});
const acknowledgement = await mcp(base, {
  jsonrpc: "2.0",
  id: 5,
  method: "tools/call",
  params: { name: "studio_acknowledgement", arguments: { decisionId } },
});
const unknown = await mcp(base, {
  jsonrpc: "2.0",
  id: 6,
  method: "tools/call",
  params: { name: "http_fetch", arguments: { url: "https://example.com" } },
});
const filePath = await mcp(base, {
  jsonrpc: "2.0",
  id: 7,
  method: "tools/call",
  params: { name: "studio_snapshot", arguments: { path: ".env" } },
});

const snapshotBody = parseTool(snapshot.json);
const inboundBody = parseTool(inbound.json);
const ackBody = parseTool(acknowledgement.json);
const toolNames = (listed.json?.result?.tools ?? []).map((tool) => tool.name);
const secretLeak = [snapshot.json, inbound.json, acknowledgement.json].some((item) =>
  /\bsk_(?:live|test)_|\bBearer\s+\S+/i.test(JSON.stringify(item ?? "")),
);

const checks = {
  unauthenticated401: unauth.status === 401,
  wrongToken401: wrong.status === 401,
  toolsListExact: JSON.stringify(toolNames) === JSON.stringify(["studio_snapshot", "studio_inbound", "studio_acknowledgement"]),
  snapshotOk: snapshotBody?.kind === "chatgpt_scout_ops_snapshot",
  inboundOk: inboundBody?.ok === true,
  acknowledgementOk: ackBody?.acknowledgement?.decisionId === decisionId && ackBody?.acknowledgement?.ok === true,
  unknownToolRejected: unknown.json?.error?.code === -32601,
  filePathRejected: parseTool(filePath.json)?.error === "arbitrary_file_path",
  secretsNeverReturned: !secretLeak,
};

const results = {
  mcpEndpoint: `${base}/mcp`,
  tools: toolNames,
  tokenPrinted: false,
  checks,
  ok: Object.values(checks).every(Boolean),
};
writeFileSync(RESULT_FILE, `${JSON.stringify(results, null, 2)}\n`, "utf8");
process.stdout.write(`ops-bridge MCP public proof ${results.ok ? "PASS" : "FAIL"} ${base}/mcp\n`);
process.exit(results.ok ? 0 : 2);
