import type { IncomingMessage, ServerResponse } from "http";
import { createServer, type Server } from "http";

import { createSupervisionPostgresEngine, type SupervisionPostgresEngine } from "./postgres-engine";
import type { SupervisionPostgresConfig } from "./provider-class";
import type { SweepClaim } from "./repository";

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
  return Boolean(expected) && token === expected && apiKey === expected;
}

export function handleSupervisionPostgrest(
  engine: SupervisionPostgresEngine,
  serviceRoleKey: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  return (async () => {
    if (!hasServiceRole(req, serviceRoleKey)) {
      send(res, 401, { error: "Service role required. Browser keys are not accepted." });
      return;
    }
    const url = new URL(req.url ?? "/", "http://studio.local");
    const pathname = url.pathname;
    if (req.method === "POST" && pathname.endsWith("/rpc/supervision_try_claim_sweep")) {
      const body = JSON.parse((await readBody(req)) || "{}") as {
        p_claim_id: string;
        p_holder: string;
        p_at: string;
        p_ttl_ms: number;
      };
      send(res, 200, engine.tryClaimSweep({
        claimId: body.p_claim_id,
        holder: body.p_holder,
        at: body.p_at,
        ttlMs: body.p_ttl_ms,
      }));
      return;
    }
    if (req.method === "GET" && pathname.endsWith("/supervision_leases")) {
      send(res, 200, engine.listLeases());
      return;
    }
    if (req.method === "POST" && pathname.endsWith("/supervision_leases")) {
      const lease = JSON.parse(await readBody(req));
      engine.saveLease(lease);
      send(res, 201, lease);
      return;
    }
    if (req.method === "GET" && pathname.endsWith("/supervision_incidents")) {
      send(res, 200, engine.listIncidents());
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
}): Promise<{ server: Server; port: number; engine: SupervisionPostgresEngine; key: string }> {
  const engine = options?.engine ?? createSupervisionPostgresEngine();
  const key = options?.serviceRoleKey ?? "supervision-test-service-role";
  const server = createServer((req, res) => {
    void handleSupervisionPostgrest(engine, key, req, res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port, engine, key });
    });
  });
}

export async function pingSupervisionPostgres(
  config: SupervisionPostgresConfig,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${config.url}/rest/v1/supervision_meta?select=id`, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
    },
  });
  return { ok: res.ok, status: res.status };
}

export async function restTryClaimSweep(
  config: SupervisionPostgresConfig,
  input: { claimId: string; holder: string; at: string; ttlMs: number },
): Promise<{ claimed: boolean; claim: SweepClaim | null }> {
  const res = await fetch(`${config.url}/rest/v1/rpc/supervision_try_claim_sweep`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
    },
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
