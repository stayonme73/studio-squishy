import { afterEach, describe, expect, it } from "vitest";
import http from "http";
import { readFileSync } from "fs";
import path from "path";

import {
  classifyLiveInitError,
  readLiveSupervisionForIncidentCommand,
  sanitizedLiveStatusPane,
} from "./live-read";
import {
  getLiveSupervisionMachine,
  resetLiveSupervisionMachineForTests,
} from "./live-runtime";
import { SUPERVISION_POSTGRES_SCHEMA_VERSION } from "./provider-class";
import { startSupervisionPostgrestStub } from "./postgres-rest";
import {
  DurablePersistenceUnavailableError,
  LaunchPersistenceForbiddenError,
  LiveStoreUnhealthyError,
  SchemaMismatchError,
} from "./repository";

const SB_SECRET_FIXTURE = "sb_secret_supervision_test_fixture";

function postgresEnv(url: string, key = SB_SECRET_FIXTURE): NodeJS.ProcessEnv {
  return {
    STUDIO_SUPERVISION_SUPABASE_URL: url,
    STUDIO_SUPERVISION_SUPABASE_SECRET_KEY: key,
  };
}

function rpcNames(requests: Array<{ rpc: string | null }>): string[] {
  return requests.map((request) => request.rpc).filter((rpc): rpc is string => Boolean(rpc));
}

function startScriptedServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; url: string }> {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

describe("incident command read-only live hydration", () => {
  const servers: http.Server[] = [];
  const envKeys = [
    "STUDIO_SUPERVISION_SUPABASE_URL",
    "STUDIO_SUPERVISION_SUPABASE_SECRET_KEY",
    "STUDIO_SUPERVISION_PROVIDER",
  ] as const;
  const previousEnv: Partial<Record<(typeof envKeys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
    resetLiveSupervisionMachineForTests();
    for (const key of envKeys) {
      if (key in previousEnv) {
        const value = previousEnv[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
        delete previousEnv[key];
      }
    }
  });

  function stashEnv(): void {
    for (const key of envKeys) {
      if (!(key in previousEnv)) previousEnv[key] = process.env[key];
    }
  }

  it("returns a sanitized configuration failure without key names or URLs", async () => {
    const result = await readLiveSupervisionForIncidentCommand({});
    expect(result).toEqual({
      ok: false,
      stage: "configuration",
      errorClass: "configuration",
    });
    const pane = sanitizedLiveStatusPane(result);
    expect(pane.stage).toBe("configuration");
    expect(pane.errorClass).toBe("configuration");
    expect(pane.schemaVersion).toBeNull();
    expect(pane.body).toContain("Stage: configuration");
    expect(pane.body).toContain("Error class: configuration");
    expect(pane.body).not.toMatch(/https?:\/\//i);
    expect(pane.body).not.toContain("STUDIO_SUPERVISION_SUPABASE");
    expect(pane.body).not.toContain("sb_secret");
    expect(JSON.stringify(pane)).not.toContain("Missing");
  });

  it("classifies typed live-store errors without leaking messages", () => {
    expect(classifyLiveInitError(new SchemaMismatchError(), "schema")).toEqual({
      ok: false,
      stage: "schema",
      errorClass: "schema",
    });
    expect(classifyLiveInitError(new LiveStoreUnhealthyError(), "health")).toEqual({
      ok: false,
      stage: "health",
      errorClass: "health",
    });
    expect(
      classifyLiveInitError(
        new DurablePersistenceUnavailableError(
          "Supervision store AUTH_FAILED (HTTP 401) at /rest/v1/rpc/supervision_verify_schema",
        ),
        "schema",
      ),
    ).toEqual({ ok: false, stage: "schema", errorClass: "authentication" });
    expect(
      classifyLiveInitError(
        new DurablePersistenceUnavailableError("Supervision store RPC_FAILED (HTTP 400) at /hydrate"),
        "hydration",
      ),
    ).toEqual({ ok: false, stage: "hydration", errorClass: "hydration" });
    expect(classifyLiveInitError(new LaunchPersistenceForbiddenError(), "hydration")).toEqual({
      ok: false,
      stage: "configuration",
      errorClass: "configuration",
    });
    expect(classifyLiveInitError(new Error("http://secret.example/sb_secret_abc"), "schema")).toBeNull();
  });

  it("maps authentication failures from the live store", async () => {
    const stub = await startSupervisionPostgrestStub({ serviceRoleKey: SB_SECRET_FIXTURE });
    servers.push(stub.server);
    const result = await readLiveSupervisionForIncidentCommand(
      postgresEnv(stub.url, "sb_secret_wrong_key"),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected authentication failure");
    expect(result.stage).toBe("schema");
    expect(result.errorClass).toBe("authentication");
    const pane = sanitizedLiveStatusPane(result);
    expect(pane.body).toContain("Error class: authentication");
    expect(pane.body).not.toContain(stub.url);
    expect(pane.body).not.toContain("sb_secret");
  });

  it("maps schema mismatch without claiming version 2", async () => {
    const stub = await startSupervisionPostgrestStub({
      serviceRoleKey: SB_SECRET_FIXTURE,
      schemaVersion: 1,
    });
    servers.push(stub.server);
    const result = await readLiveSupervisionForIncidentCommand(postgresEnv(stub.url));
    expect(result).toEqual({ ok: false, stage: "schema", errorClass: "schema" });
    const pane = sanitizedLiveStatusPane(result);
    expect(pane.schemaVersion).toBeNull();
    expect(pane.body).not.toContain("Schema version 2");
  });

  it("maps a health failure after schema verification", async () => {
    const stub = await startScriptedServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://studio.local");
      if (url.pathname.endsWith("/supervision_verify_schema")) {
        send(res, 200, {
          ok: true,
          schemaVersion: SUPERVISION_POSTGRES_SCHEMA_VERSION,
          provider: "supabase-postgres",
        });
        return;
      }
      if (url.pathname.includes("supervision_meta")) {
        send(res, 503, { error: "down" });
        return;
      }
      send(res, 500, { error: "unexpected" });
    });
    servers.push(stub.server);
    const result = await readLiveSupervisionForIncidentCommand(postgresEnv(stub.url));
    expect(result).toEqual({ ok: false, stage: "health", errorClass: "health" });
  });

  it("maps hydration failure after a healthy schema check", async () => {
    const stub = await startScriptedServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://studio.local");
      if (url.pathname.endsWith("/supervision_verify_schema")) {
        send(res, 200, {
          ok: true,
          schemaVersion: SUPERVISION_POSTGRES_SCHEMA_VERSION,
          provider: "supabase-postgres",
        });
        return;
      }
      if (url.pathname.includes("supervision_meta")) {
        send(res, 200, [{ schema_version: 2, provider: "supabase-postgres" }]);
        return;
      }
      if (url.pathname.endsWith("/supervision_hydrate")) {
        send(res, 500, { error: "RPC_FAILED" });
        return;
      }
      send(res, 500, { error: "unexpected" });
    });
    servers.push(stub.server);
    const result = await readLiveSupervisionForIncidentCommand(postgresEnv(stub.url));
    expect(result).toEqual({ ok: false, stage: "hydration", errorClass: "health" });
  });

  it("hydrates a read-only snapshot without creating the sweep lease or a timer", async () => {
    const stub = await startSupervisionPostgrestStub({ serviceRoleKey: SB_SECRET_FIXTURE });
    servers.push(stub.server);
    const result = await readLiveSupervisionForIncidentCommand(postgresEnv(stub.url));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected live read success");
    expect(result.schemaVersion).toBe(SUPERVISION_POSTGRES_SCHEMA_VERSION);
    expect(result.provider).toBe("supabase-postgres");
    expect(result.snapshot.recordSource).toBe("live");
    expect(result.snapshot.leases.some((lease) => lease.leaseId === "lease_machine_sweep")).toBe(
      false,
    );
    expect(rpcNames(stub.requests)).toEqual([
      "supervision_verify_schema",
      "supervision_hydrate",
    ]);
    expect(stub.requests.some((request) => request.rpc === "supervision_upsert_lease")).toBe(false);
    expect(stub.requests.some((request) => request.rpc === "supervision_apply_ops")).toBe(false);
    expect(stub.requests.some((request) => request.rpc === "supervision_try_claim_sweep")).toBe(
      false,
    );
    const pane = sanitizedLiveStatusPane(result);
    expect(pane.stage).toBe("initialized");
    expect(pane.schemaVersion).toBe(2);
    expect(pane.body).toBe("The live supervision store initialized. Schema version 2.");
  });

  it("keeps worker boot able to create the sweep lease", async () => {
    const stub = await startSupervisionPostgrestStub({ serviceRoleKey: SB_SECRET_FIXTURE });
    servers.push(stub.server);
    stashEnv();
    process.env.STUDIO_SUPERVISION_PROVIDER = "supabase-postgres";
    process.env.STUDIO_SUPERVISION_SUPABASE_URL = stub.url;
    process.env.STUDIO_SUPERVISION_SUPABASE_SECRET_KEY = stub.key;
    const machine = await getLiveSupervisionMachine();
    expect(machine.getLease("lease_machine_sweep")?.leaseId).toBe("lease_machine_sweep");
    expect(
      rpcNames(stub.requests).some(
        (rpc) => rpc === "supervision_upsert_lease" || rpc === "supervision_apply_ops",
      ),
    ).toBe(true);
  });

  it("does not import the worker boot from the Incident Command page", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/file-room/incident-command/page.tsx"),
      "utf8",
    );
    expect(source).not.toContain("getLiveSupervisionMachine");
    expect(source).toContain("readLiveSupervisionForIncidentCommand");
  });
});
