import type { IncomingMessage, ServerResponse } from "http";
import { createServer, type Server } from "http";

import {
  SUPERVISION_POSTGRES_SCHEMA_VERSION,
  classifySupervisionSecretKey,
  supervisionRestHeaders,
  type SupervisionPostgresConfig,
} from "./provider-class";
import { createSupervisionPostgresEngine, type SupervisionPostgresEngine } from "./postgres-engine";
import { applySupervisionRpc } from "./postgres-rpc";
import type { SweepClaim } from "./repository";

export type SupervisionStubRequest = {
  method: string;
  path: string;
  rpc: string | null;
  authorized: boolean;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function hasServiceRole(req: IncomingMessage, expected: string): boolean {
  const auth = req.headers.authorization ?? "";
  const apiKey = String(req.headers.apikey ?? "");
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!expected) return false;
  if (classifySupervisionSecretKey(expected) === "sb_secret") {
    if (token === expected) return false;
    return apiKey === expected;
  }
  return token === expected && apiKey === expected;
}

function rpcName(pathname: string): string | null {
  const marker = "/rpc/";
  const index = pathname.lastIndexOf(marker);
  if (index < 0) return null;
  return pathname.slice(index + marker.length);
}

export function handleSupervisionPostgrest(
  engine: SupervisionPostgresEngine,
  serviceRoleKey: string,
  req: IncomingMessage,
  res: ServerResponse,
  options?: {
    requests?: SupervisionStubRequest[];
    failNextRpc?: { current: boolean };
    failMidApply?: { current: boolean };
  },
): Promise<void> {
  return (async () => {
    const url = new URL(req.url ?? "/", "http://studio.local");
    const pathname = url.pathname;
    const authorized = hasServiceRole(req, serviceRoleKey);
    options?.requests?.push({
      method: req.method ?? "GET",
      path: pathname,
      rpc: rpcName(pathname),
      authorized,
    });
    if (!authorized) {
      const token = (req.headers.authorization ?? "").toLowerCase().startsWith("bearer ")
        ? (req.headers.authorization ?? "").slice(7).trim()
        : "";
      const invalidJwt =
        classifySupervisionSecretKey(serviceRoleKey) === "sb_secret" && token === serviceRoleKey;
      send(res, 401, {
        error: invalidJwt
          ? "Invalid JWT"
          : "Service role required. Browser keys are not accepted.",
      });
      return;
    }
    const name = rpcName(pathname);
    if (req.method === "POST" && name) {
      if (options?.failNextRpc?.current) {
        options.failNextRpc.current = false;
        send(res, 500, { error: "RPC_FAILED" });
        return;
      }
      const body = JSON.parse((await readBody(req)) || "{}") as Record<string, unknown>;
      if (name === "supervision_apply_ops" && options?.failMidApply?.current) {
        options.failMidApply.current = false;
        send(res, 500, { error: "RPC_FAILED" });
        return;
      }
      try {
        const result = applySupervisionRpc(engine, name, body);
        if (
          name === "supervision_verify_schema" &&
          result &&
          typeof result === "object" &&
          (result as { ok?: boolean }).ok === false
        ) {
          send(res, 409, result);
          return;
        }
        send(res, 200, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "RPC_FAILED";
        const status = message.includes("TENANT") ? 403 : 400;
        send(res, status, { error: message, code: message });
      }
      return;
    }
    if (req.method === "GET" && pathname.endsWith("/supervision_meta")) {
      send(res, 200, [
        { schema_version: engine.meta.schemaVersion, provider: engine.meta.provider },
      ]);
      return;
    }
    if (req.method === "GET" && pathname.endsWith("/supervision_leases")) {
      send(res, 200, engine.listLeases());
      return;
    }
    if (req.method === "GET" && pathname.endsWith("/health")) {
      send(res, 200, { ok: true, provider: "supabase-postgres-stub" });
      return;
    }
    send(res, 404, { error: "Unknown supervision PostgREST path." });
  })();
}

export function startSupervisionPostgrestStub(options?: {
  engine?: SupervisionPostgresEngine;
  serviceRoleKey?: string;
  schemaVersion?: number;
}): Promise<{
  server: Server;
  port: number;
  engine: SupervisionPostgresEngine;
  key: string;
  requests: SupervisionStubRequest[];
  failNextRpc: { current: boolean };
  failMidApply: { current: boolean };
  url: string;
}> {
  const engine = options?.engine ?? createSupervisionPostgresEngine();
  engine.meta.schemaVersion = options?.schemaVersion ?? SUPERVISION_POSTGRES_SCHEMA_VERSION;
  const key = options?.serviceRoleKey ?? "supervision-test-service-role";
  const requests: SupervisionStubRequest[] = [];
  const failNextRpc = { current: false };
  const failMidApply = { current: false };
  const server = createServer((req, res) => {
    void handleSupervisionPostgrest(engine, key, req, res, {
      requests,
      failNextRpc,
      failMidApply,
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        server,
        port,
        engine,
        key,
        requests,
        failNextRpc,
        failMidApply,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
}

export async function pingSupervisionPostgres(
  config: SupervisionPostgresConfig,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${config.url}/rest/v1/supervision_meta?select=id`, {
    headers: supervisionRestHeaders(config.serviceRoleKey, config.keyKind),
  });
  return { ok: res.ok, status: res.status };
}

export async function restTryClaimSweep(
  config: SupervisionPostgresConfig,
  input: { claimId: string; holder: string; at: string; ttlMs: number },
): Promise<{ claimed: boolean; claim: SweepClaim | null }> {
  const res = await fetch(`${config.url}/rest/v1/rpc/supervision_try_claim_sweep`, {
    method: "POST",
    headers: supervisionRestHeaders(config.serviceRoleKey, config.keyKind),
    body: JSON.stringify({
      p_claim_id: input.claimId,
      p_holder: input.holder,
      p_at: input.at,
      p_ttl_ms: input.ttlMs,
    }),
  });
  if (!res.ok) {
    throw new Error(`supervision_try_claim_sweep failed with HTTP ${res.status}`);
  }
  return (await res.json()) as { claimed: boolean; claim: SweepClaim | null };
}
