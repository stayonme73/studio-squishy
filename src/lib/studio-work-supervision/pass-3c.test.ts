import { afterEach, describe, expect, it } from "vitest";
import http from "http";
import { readFileSync } from "fs";
import path from "path";

import { createFrozenClock } from "./clock";
import { createSupervisionMachine } from "./machine";
import { createSupervisionLiveClient } from "./postgres-live-client";
import { createLivePostgresSupervisionRepository } from "./postgres-live-repository";
import { createLiveSupervisionRepositoryAsync } from "./live-runtime";
import {
  SUPERVISION_POSTGRES_SCHEMA_VERSION,
  classifySupervisionSecretKey,
  resolveSupervisionPostgresConfig,
  supervisionRestHeaders,
} from "./provider-class";
import { startSupervisionPostgrestStub } from "./postgres-rest";
import {
  AppendOnlyViolationError,
  DurablePersistenceUnavailableError,
  LiveStoreUnhealthyError,
  SchemaMismatchError,
} from "./repository";

const maple = {
  customerId: "cust_maple_p3c",
  customerLabel: "Maple & Pine Books (fixture)",
  projectId: "proj_maple_p3c",
  campaignId: "camp_maple_p3c",
};

const harbor = {
  customerId: "cust_harbor_p3c",
  customerLabel: "Harbor Lantern Co. (fixture)",
  projectId: "proj_harbor_p3c",
  campaignId: "camp_harbor_p3c",
};

function copyAgent() {
  return { kind: "agent" as const, id: "agent_p3c", label: "Copy agent (fixture)" };
}

const SB_SECRET_FIXTURE = "sb_secret_supervision_test_fixture";
const LEGACY_SERVICE_ROLE_FIXTURE = "supervision-test-service-role";

function configFor(stub: { url: string; key: string }, keyName = "STUDIO_SUPERVISION_SUPABASE_SECRET_KEY") {
  return {
    url: stub.url,
    serviceRoleKey: stub.key,
    urlKeyUsed: "STUDIO_SUPERVISION_SUPABASE_URL",
    serviceRoleKeyName: keyName,
    keyKind: classifySupervisionSecretKey(stub.key),
  };
}

function startSecretStub(options?: { schemaVersion?: number }) {
  return startSupervisionPostgrestStub({
    serviceRoleKey: SB_SECRET_FIXTURE,
    schemaVersion: options?.schemaVersion,
  });
}

describe("work supervision pass 3C live connector", () => {
  const servers: http.Server[] = [];
  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
  });

  it("validates the live connector SQL migration", () => {
    const sql = readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260824_supervision_live_connector.sql"),
      "utf8",
    );
    for (const token of [
      "supervision_verify_schema",
      "supervision_hydrate",
      "supervision_due_next_checks",
      "supervision_upsert_lease",
      "supervision_accept_heartbeat",
      "supervision_upsert_incident_with_events",
      "supervision_record_recovery",
      "supervision_record_sweep_evaluation",
      "supervision_save_coverage",
      "supervision_mark_restored",
      "supervision_apply_ops",
      "schema_version = 2",
      "TENANT_ISOLATION",
      "service_role",
      "REVOKE ALL ON FUNCTION",
    ]) {
      expect(sql).toContain(token);
    }
  });

  it("initializes, hydrates, and records work through live RPCs", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const log: {
      method: string;
      path: string;
      rpc: string | null;
      hasApikey: boolean;
      hasAuthorization: boolean;
    }[] = [];
    const client = createSupervisionLiveClient(configFor(stub), { requestLog: log });
    await client.initialize();
    const repo = createLivePostgresSupervisionRepository(client);
    await repo.load();
    const machine = createSupervisionMachine({ repository: repo, recordSource: "live" });
    const lease = await Promise.resolve(
      machine.registerWorker({
        kind: "FINITE_WORK",
        ...maple,
        subject: copyAgent(),
        step: "draft",
      }),
    );
    await Promise.resolve(
      machine.recordHeartbeat({
        leaseId: lease.leaseId,
        idempotencyKey: "hb-1",
        reportedStatus: "working",
      }),
    );
    const opened = await Promise.resolve(
      machine.openIncident({
        ...maple,
        leaseId: lease.leaseId,
        dedupeKey: "maple:p3c",
        severity: "ROUTINE",
        category: "agent",
        responsibleComponent: copyAgent(),
        failedOrStalledStep: "draft",
        customerImpact: "Copy is waiting.",
        deadlineImpact: "none proven",
        financialImpact: "none proven",
        rightsOrComplianceImpact: "none proven",
        securityOrBreachImpact: "none proven",
      }),
    );
    expect(opened.history.length).toBeGreaterThan(0);
    expect(log.some((row) => row.rpc === "supervision_verify_schema")).toBe(true);
    expect(log.some((row) => row.rpc === "supervision_hydrate")).toBe(true);
    expect(log.some((row) => row.path.includes("supervision_meta"))).toBe(true);
    expect(log.some((row) => row.rpc === "supervision_apply_ops")).toBe(true);
    expect(log.every((row) => row.hasApikey)).toBe(true);
    expect(log.every((row) => row.hasAuthorization === false)).toBe(true);
    const restored = createLivePostgresSupervisionRepository(client);
    await restored.load();
    expect(restored.getLease(lease.leaseId)?.step).toBe("draft");
    expect(restored.getIncident(opened.incidentId)?.history.map((event) => event.eventId)).toEqual(
      opened.history.map((event) => event.eventId),
    );
    expect(JSON.stringify(log)).not.toContain(stub.key);
  });

  it("sends sb_secret_ only as apikey and never as Authorization Bearer", async () => {
    const headers = supervisionRestHeaders(SB_SECRET_FIXTURE);
    expect(headers.apikey).toBe(SB_SECRET_FIXTURE);
    expect(headers.Authorization).toBeUndefined();
    const stub = await startSecretStub();
    servers.push(stub.server);
    const log: {
      method: string;
      path: string;
      rpc: string | null;
      hasApikey: boolean;
      hasAuthorization: boolean;
    }[] = [];
    const client = createSupervisionLiveClient(configFor(stub), { requestLog: log });
    await client.initialize();
    expect(log.length).toBeGreaterThan(0);
    expect(log.every((row) => row.hasApikey && row.hasAuthorization === false)).toBe(true);
    const bearerRejected = await fetch(`${stub.url}/rest/v1/rpc/supervision_verify_schema`, {
      method: "POST",
      headers: {
        apikey: SB_SECRET_FIXTURE,
        Authorization: `Bearer ${SB_SECRET_FIXTURE}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(bearerRejected.status).toBe(401);
    expect(await bearerRejected.text()).toContain("Invalid JWT");
    expect(JSON.stringify(log)).not.toContain(SB_SECRET_FIXTURE);
  });

  it("retains legacy JWT service_role headers only as a compatibility fallback", async () => {
    const stub = await startSupervisionPostgrestStub({
      serviceRoleKey: LEGACY_SERVICE_ROLE_FIXTURE,
    });
    servers.push(stub.server);
    const log: {
      method: string;
      path: string;
      rpc: string | null;
      hasApikey: boolean;
      hasAuthorization: boolean;
    }[] = [];
    const resolved = resolveSupervisionPostgresConfig({
      STUDIO_SUPERVISION_SUPABASE_URL: stub.url,
      STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY: LEGACY_SERVICE_ROLE_FIXTURE,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error("expected legacy config");
    expect(resolved.config.serviceRoleKeyName).toBe("STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY");
    expect(resolved.config.keyKind).toBe("legacy_jwt_service_role");
    const client = createSupervisionLiveClient(resolved.config, { requestLog: log });
    await client.initialize();
    expect(log.every((row) => row.hasApikey && row.hasAuthorization)).toBe(true);
    expect(JSON.stringify(log)).not.toContain(LEGACY_SERVICE_ROLE_FIXTURE);
  });

  it("prefers STUDIO_SUPERVISION_SUPABASE_SECRET_KEY over the legacy service_role names", () => {
    const resolved = resolveSupervisionPostgresConfig({
      STUDIO_SUPERVISION_SUPABASE_URL: "https://example.supabase.co",
      STUDIO_SUPERVISION_SUPABASE_SECRET_KEY: SB_SECRET_FIXTURE,
      STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY: LEGACY_SERVICE_ROLE_FIXTURE,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error("expected secret config");
    expect(resolved.config.serviceRoleKeyName).toBe("STUDIO_SUPERVISION_SUPABASE_SECRET_KEY");
    expect(resolved.config.keyKind).toBe("sb_secret");
    expect(resolved.config.serviceRoleKey).toBe(SB_SECRET_FIXTURE);
  });

  it("rejects browser-style keys and does not leak the service-role secret", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient({
      ...configFor(stub),
      serviceRoleKey: "anon-browser-key",
    });
    await expect(client.initialize()).rejects.toThrow(DurablePersistenceUnavailableError);
    expect(stub.requests.every((row) => row.authorized === false || row.rpc === "supervision_verify_schema")).toBe(
      true,
    );
    try {
      await client.initialize();
    } catch (error) {
      expect(String(error)).not.toContain(stub.key);
      expect(String(error)).toContain("AUTH_FAILED");
    }
  });

  it("fails closed when the database is unavailable", async () => {
    const client = createSupervisionLiveClient({
      url: "http://127.0.0.1:9",
      serviceRoleKey: SB_SECRET_FIXTURE,
      urlKeyUsed: "STUDIO_SUPERVISION_SUPABASE_URL",
      serviceRoleKeyName: "STUDIO_SUPERVISION_SUPABASE_SECRET_KEY",
      keyKind: "sb_secret",
    });
    await expect(client.initialize()).rejects.toThrow(LiveStoreUnhealthyError);
  });

  it("fails closed on schema mismatch", async () => {
    const stub = await startSecretStub({ schemaVersion: 1 });
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await expect(client.initialize()).rejects.toThrow(SchemaMismatchError);
  });

  it("does not apply a partial write when apply_ops fails", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await client.initialize();
    const repo = createLivePostgresSupervisionRepository(client);
    await repo.load();
    const machine = createSupervisionMachine({ repository: repo, recordSource: "live" });
    stub.failMidApply.current = true;
    await expect(
      Promise.resolve(
        machine.registerWorker({
          kind: "FINITE_WORK",
          ...maple,
          subject: copyAgent(),
          step: "failing_write",
        }),
      ),
    ).rejects.toThrow(LiveStoreUnhealthyError);
    const reader = createLivePostgresSupervisionRepository(client);
    await reader.load();
    expect(reader.listLeases().some((lease) => lease.step === "failing_write")).toBe(false);
  });

  it("fails closed when a transactional RPC fails", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await client.initialize();
    stub.failNextRpc.current = true;
    await expect(client.hydrate()).rejects.toThrow(LiveStoreUnhealthyError);
  });

  it("persists recovery attempts atomically through hydrate", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await client.initialize();
    const repo = createLivePostgresSupervisionRepository(client);
    await repo.load();
    const machine = createSupervisionMachine({ repository: repo, recordSource: "live" });
    const lease = await Promise.resolve(
      machine.registerWorker({
        kind: "FINITE_WORK",
        ...maple,
        subject: copyAgent(),
        step: "recover",
      }),
    );
    const incident = await Promise.resolve(
      machine.openIncident({
        ...maple,
        leaseId: lease.leaseId,
        dedupeKey: "maple:recover",
        severity: "ROUTINE",
        category: "agent",
        responsibleComponent: copyAgent(),
        failedOrStalledStep: "recover",
        customerImpact: "Copy is waiting.",
        deadlineImpact: "none proven",
        financialImpact: "none proven",
        rightsOrComplianceImpact: "none proven",
        securityOrBreachImpact: "none proven",
      }),
    );
    await Promise.resolve(
      machine.attemptRecovery(
        incident.incidentId,
        "pending",
        "retry_heartbeat",
        "Machine retries the stalled copy step.",
      ),
    );
    const restored = createLivePostgresSupervisionRepository(client);
    await restored.load();
    expect(restored.getIncident(incident.incidentId)?.recoveryAttempts).toHaveLength(1);
    expect(restored.getIncident(incident.incidentId)?.state).not.toBe("RESOLVED");
  });

  it("ignores duplicate idempotency keys across hydrate", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await client.initialize();
    const repo = createLivePostgresSupervisionRepository(client);
    await repo.load();
    const clock = createFrozenClock("2026-08-23T18:00:00.000Z");
    const machine = createSupervisionMachine({ repository: repo, clock, recordSource: "live" });
    const lease = await Promise.resolve(
      machine.registerWorker({
        kind: "FINITE_WORK",
        ...maple,
        subject: copyAgent(),
        step: "idem",
      }),
    );
    const first = await Promise.resolve(
      machine.recordHeartbeat({
        leaseId: lease.leaseId,
        idempotencyKey: "same",
        reportedStatus: "working",
      }),
    );
    const second = await Promise.resolve(
      machine.recordHeartbeat({
        leaseId: lease.leaseId,
        idempotencyKey: "same",
        reportedStatus: "working",
      }),
    );
    expect(first.ignored).toBe(false);
    expect(second.ignored).toBe(true);
  });

  it("prevents competing live sweep claims and enforces tenant isolation", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await client.initialize();
    const repoA = createLivePostgresSupervisionRepository(client);
    const repoB = createLivePostgresSupervisionRepository(client);
    await repoA.load();
    await repoB.load();
    const clock = createFrozenClock("2026-08-23T18:00:00.000Z");
    const a = createSupervisionMachine({
      repository: repoA,
      clock,
      recordSource: "live",
      holderId: "lambda-a",
    });
    await Promise.resolve(
      a.registerWorker({
        kind: "FINITE_WORK",
        heartbeatIntervalMs: 1_000,
        graceMs: 200,
        ...maple,
        subject: copyAgent(),
        step: "draft",
      }),
    );
    clock.advanceMs(1_300);
    const first = await Promise.resolve(a.sweep());
    const b = createSupervisionMachine({
      repository: repoB,
      clock,
      recordSource: "live",
      holderId: "lambda-b",
    });
    const second = await Promise.resolve(b.sweep());
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(false);
    expect(() =>
      a.recordHeartbeat({
        leaseId: a.snapshot().leases[0]!.leaseId,
        idempotencyKey: "cross",
        reportedStatus: "working",
        customerId: harbor.customerId,
        projectId: maple.projectId,
      }),
    ).toThrow(/customer/);
    const lease = a.snapshot().leases[0]!;
    await expect(
      client.acceptHeartbeat(
        { ...lease, customerId: harbor.customerId },
        {
          leaseId: lease.leaseId,
          idempotencyKey: "cross-rpc",
          at: clock.now().toISOString(),
          reportedStatus: "working",
          customerId: harbor.customerId,
          projectId: maple.projectId,
        },
      ),
    ).rejects.toThrow(/customer/);
  });

  it("enforces append-only through the live repository", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await client.initialize();
    const repo = createLivePostgresSupervisionRepository(client);
    await repo.load();
    expect(() => repo.replaceIncidentEvents("inc", [])).toThrow(AppendOnlyViolationError);
  });

  it("selects the live connector when launch credentials are present and never falls back to JSON", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const repo = await createLiveSupervisionRepositoryAsync({
      NODE_ENV: "production",
      STUDIO_SUPERVISION_SUPABASE_URL: stub.url,
      STUDIO_SUPERVISION_SUPABASE_SECRET_KEY: stub.key,
    });
    expect(repo.kind).toBe("supabase-postgres");
    expect(repo.flush).toBeTypeOf("function");
  });

  it("queries due next checks after hydration", async () => {
    const stub = await startSecretStub();
    servers.push(stub.server);
    const client = createSupervisionLiveClient(configFor(stub));
    await client.initialize();
    const due = await client.dueNextChecks("2026-08-23T20:00:00.000Z");
    expect(due.leaseIds).toEqual([]);
    expect(due.incidentIds).toEqual([]);
    expect(SUPERVISION_POSTGRES_SCHEMA_VERSION).toBe(2);
  });
});
