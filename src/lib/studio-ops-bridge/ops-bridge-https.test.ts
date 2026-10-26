import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
  STUDIO_CHATGPT_SCOUT_OPS_BRIDGE_PACKAGE_ID,
} from "@/config/studio-chatgpt-scout-ops-bridge-v1";

import {
  payloadContainsSecrets,
  readLastAcknowledgement,
  writeOutboundSnapshot,
} from "../../../scripts/ops-bridge-lib.mjs";
import {
  createMemoryRequest,
  createMemoryResponse,
  handleOpsBridgeHttpsRequest,
  normalizeBridgePath,
} from "../../../scripts/ops-bridge-https-lib.mjs";

const TOKEN = "ops-bridge-local-test-token-not-a-secret-for-production";
const GIT_OPENSSL = "C:\\Program Files\\Git\\usr\\bin\\openssl.exe";

function authorizedLine(overrides: Record<string, unknown> = {}) {
  return {
    decisionId: `https-${Date.now()}-${overrides.decisionId ?? "ok"}`,
    authorizer: "OWNER_TAGIA",
    authorized: true,
    at: new Date().toISOString(),
    packageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
    action: "accept_proof",
    scope: "https-dry-run",
    permittedAction: "Acknowledge the local HTTPS ops-bridge. Do not merge. Do not push.",
    protectedAction: false,
    mergeAuthorized: false,
    pushAuthorized: false,
    ...overrides,
  };
}

async function call(
  method: string,
  url: string,
  extras: { token?: string; body?: unknown; expectedPackageId?: string } = {},
) {
  const req = createMemoryRequest({
    method,
    url,
    token: extras.token === undefined ? TOKEN : extras.token,
    body: extras.body,
  });
  const res = createMemoryResponse();
  const result = await handleOpsBridgeHttpsRequest(req, res, {
    token: TOKEN,
    expectedPackageId: extras.expectedPackageId ?? OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
  });
  return {
    ...result,
    statusCode: res.statusCode,
    json: res.body ? JSON.parse(res.body) : null,
  };
}

function httpsJson(
  port: number,
  method: string,
  urlPath: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        rejectUnauthorized: false,
        headers: {
          authorization: opts.token ? `Bearer ${opts.token}` : "",
          "content-type": "application/json",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode ?? 0, json: raw ? JSON.parse(raw) : {} });
        });
      },
    );
    req.on("error", reject);
    if (opts.body != null) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

describe("authenticated HTTPS ops-bridge", () => {
  it("runs the local authenticated read → POST → consume → ack loop", async () => {
    writeOutboundSnapshot({
      testsResults: "https transport local proof",
      nextDecisionRequired: "Do not claim zero-courier. Public host still required.",
    });

    const snapshot = await call("GET", "/v1/snapshot");
    expect(snapshot.statusCode).toBe(200);
    expect(snapshot.json.kind).toBe("chatgpt_scout_ops_snapshot");
    expect(snapshot.json.transport.zeroCourierAchieved).toBe(false);
    expect(JSON.stringify(snapshot.json)).not.toContain(TOKEN);
    expect(payloadContainsSecrets(snapshot.json)).toBe(false);

    const decision = authorizedLine({
      decisionId: `loop-${Date.now()}`,
      STRIPE_SECRET_KEY: "sk_test_should_never_return",
    });
    const posted = await call("POST", "/v1/inbound", { body: decision });
    expect(posted.statusCode).toBe(200);
    expect(posted.json.ok).toBe(true);
    expect(posted.json.acknowledgement.ok).toBe(true);
    expect(JSON.stringify(posted.json)).not.toMatch(/sk_test_/);
    expect(JSON.stringify(posted.json)).not.toContain(TOKEN);

    const ack = await call("GET", `/v1/acknowledgement?decisionId=${decision.decisionId}`);
    expect(ack.statusCode).toBe(200);
    expect(ack.json.acknowledgement.decisionId).toBe(decision.decisionId);
    expect(ack.json.acknowledgement.ok).toBe(true);
    expect(JSON.stringify(ack.json)).not.toMatch(/sk_test_/);
    expect(readLastAcknowledgement(decision.decisionId)?.decisionId).toBe(decision.decisionId);
  });

  it("rejects invalid auth, unsigned, stale, wrong package, merge/push, and file paths", async () => {
    writeOutboundSnapshot({ testsResults: "https reject cases" });

    const noAuth = await call("GET", "/v1/snapshot", { token: "" });
    expect(noAuth.statusCode).toBe(401);

    const wrongAuth = await call("GET", "/v1/snapshot", { token: "wrong-token-value-xxx" });
    expect(wrongAuth.statusCode).toBe(401);

    const unsigned = await call("POST", "/v1/inbound", {
      body: authorizedLine({ decisionId: `unsigned-${Date.now()}`, authorized: false }),
    });
    expect(unsigned.statusCode).toBe(400);
    expect(unsigned.json.reason).toBe("unsigned_or_unapproved");

    const stale = await call("POST", "/v1/inbound", {
      body: authorizedLine({
        decisionId: `stale-${Date.now()}`,
        at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      }),
    });
    expect(stale.statusCode).toBe(400);
    expect(stale.json.reason).toBe("stale_decision");

    const wrongPackage = await call("POST", "/v1/inbound", {
      expectedPackageId: STUDIO_CHATGPT_SCOUT_OPS_BRIDGE_PACKAGE_ID,
      body: authorizedLine({
        decisionId: `pkg-${Date.now()}`,
        packageId: "SOME-OTHER-PACKAGE-1",
      }),
    });
    expect(wrongPackage.statusCode).toBe(400);
    expect(wrongPackage.json.reason).toBe("scope_expansion");

    const merge = await call("POST", "/v1/inbound", {
      body: authorizedLine({
        decisionId: `merge-${Date.now()}`,
        action: "merge_authorization",
        protectedAction: true,
        mergeAuthorized: false,
      }),
    });
    expect(merge.statusCode).toBe(400);
    expect(merge.json.reason).toBe("merge_push_not_authorized");

    const push = await call("POST", "/v1/inbound", {
      body: authorizedLine({
        decisionId: `push-${Date.now()}`,
        action: "push_authorization",
        protectedAction: true,
        pushAuthorized: false,
      }),
    });
    expect(push.statusCode).toBe(400);
    expect(push.json.reason).toBe("merge_push_not_authorized");

    const queryPath = await call("GET", "/v1/snapshot?file=.env");
    expect(queryPath.statusCode).toBe(400);
    expect(queryPath.json.error).toBe("arbitrary_file_path");

    const bodyPath = await call("POST", "/v1/inbound", {
      body: { path: "docs/launch/owner-bridge/outbound-snapshot.json" },
    });
    expect(bodyPath.statusCode).toBe(400);
    expect(bodyPath.json.error).toBe("arbitrary_file_path");

    const traversal = await call("GET", "/v1/snapshot/../../.env");
    expect(traversal.statusCode).toBe(404);
    expect(normalizeBridgePath("/v1/snapshot/../../.env")).toBe(null);

    const unknown = await call("GET", "/etc/passwd");
    expect(unknown.statusCode).toBe(404);
  });

  it("serves the three endpoints over local HTTPS", async () => {
    expect(existsSync(GIT_OPENSSL)).toBe(true);
    const dir = mkdtempSync(path.join(tmpdir(), "ops-bridge-tls-"));
    const cert = path.join(dir, "localhost.crt");
    const key = path.join(dir, "localhost.key");
    execFileSync(
      GIT_OPENSSL,
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-keyout",
        key,
        "-out",
        cert,
        "-days",
        "1",
        "-nodes",
        "-subj",
        "/CN=127.0.0.1",
      ],
      { stdio: "ignore" },
    );
    const { readFileSync } = await import("node:fs");
    const { handleOpsBridgeHttpsRequest: handle } = await import(
      "../../../scripts/ops-bridge-https-lib.mjs"
    );
    const server = https.createServer({ cert: readFileSync(cert), key: readFileSync(key) }, (req, res) => {
      handle(req, res, {
        token: TOKEN,
        expectedPackageId: OPS_BRIDGE_DRY_RUN_PACKAGE_ID,
      }).catch(() => {
        res.writeHead(500);
        res.end("{}");
      });
    });
    const port = await new Promise<number>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        resolve(typeof address === "object" && address ? address.port : 0);
      });
    });
    writeOutboundSnapshot({ testsResults: "https listen proof" });
    try {
      const denied = await httpsJson(port, "GET", "/v1/snapshot");
      expect(denied.status).toBe(401);
      const snapshot = await httpsJson(port, "GET", "/v1/snapshot", { token: TOKEN });
      expect(snapshot.status).toBe(200);
      expect(snapshot.json.kind).toBe("chatgpt_scout_ops_snapshot");
      const decision = authorizedLine({ decisionId: `tls-${Date.now()}` });
      const posted = await httpsJson(port, "POST", "/v1/inbound", { token: TOKEN, body: decision });
      expect(posted.status).toBe(200);
      expect(posted.json.ok).toBe(true);
      const ack = await httpsJson(port, "GET", "/v1/acknowledgement", { token: TOKEN });
      expect(ack.status).toBe(200);
      expect(ack.json.acknowledgement.decisionId).toBe(decision.decisionId);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
