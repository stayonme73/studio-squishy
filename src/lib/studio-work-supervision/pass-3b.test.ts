import { mkdtempSync, readFileSync, rmSync } from "fs";
import http from "http";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { afterEach, describe, expect, it } from "vitest";

import { createFrozenClock } from "./clock";
import { createFileSupervisionRepository } from "./file-repository";
import { createLiveSupervisionRepository } from "./live-runtime";
import { createTestSupervisionMachine } from "./machine";
import { createMemorySupervisionRepository } from "./memory-repository";
import { createPostgresSupervisionRepository, sharedPostgresPair } from "./postgres-adapter";
import { createSupervisionPostgresEngine } from "./postgres-engine";
import {
  SUPERVISION_PROVIDER_CLASS,
  isLaunchRuntime,
  resolveSupervisionPostgresConfig,
} from "./provider-class";
import { startSupervisionPostgrestStub } from "./postgres-rest";
import {
  AppendOnlyViolationError,
  DurablePersistenceUnavailableError,
  LaunchPersistenceForbiddenError,
  assertDurableRepository,
} from "./repository";
import { toIncidentCommandView } from "./view-model";

const maple = {
  customerId: "cust_maple_p3b",
  customerLabel: "Maple & Pine Books (fixture)",
  projectId: "proj_maple_p3b",
  campaignId: "camp_maple_p3b",
};

const harbor = {
  customerId: "cust_harbor_p3b",
  customerLabel: "Harbor Lantern Co. (fixture)",
  projectId: "proj_harbor_p3b",
  campaignId: "camp_harbor_p3b",
};

function copyAgent() {
  return { kind: "agent" as const, id: "agent_p3b", label: "Copy agent (fixture)" };
}

describe("work supervision pass 3B launch-runtime durability", () => {
  const servers: http.Server[] = [];
  afterEach(() => {
    for (const server of servers.splice(0)) server.close();
  });

  it("classifies memory, JSON, and Postgres providers", () => {
    expect(SUPERVISION_PROVIDER_CLASS.memory).toBe("unit-tests-only");
    expect(SUPERVISION_PROVIDER_CLASS["durable-file"]).toBe(
      "local-development-and-controlled-certification-only",
    );
    expect(SUPERVISION_PROVIDER_CLASS["supabase-postgres"]).toBe(
      "launch-production-shared-durable-store",
    );
    expect(createMemorySupervisionRepository().kind).toBe("memory");
    const dir = mkdtempSync(path.join(os.tmpdir(), "sup-class-"));
    expect(createFileSupervisionRepository(dir).kind).toBe("durable-file");
    rmSync(dir, { recursive: true, force: true });
    expect(createPostgresSupervisionRepository().kind).toBe("supabase-postgres");
  });

  it("validates the launch SQL migration", () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260823_supervision_launch_runtime.sql",
      ),
      "utf8",
    );
    for (const token of [
      "supervision_leases",
      "supervision_incidents",
      "supervision_incident_events",
      "supervision_recovery_attempts",
      "supervision_idempotency",
      "supervision_heartbeats",
      "supervision_coverage",
      "supervision_sweep_claims",
      "supervision_sweep_evaluations",
      "supervision_try_claim_sweep",
      "APPEND_ONLY_VIOLATION",
      "PRIMARY KEY (lease_id, idempotency_key)",
      "supervision_incidents_open_dedupe_idx",
      "supervision_leases_next_check_idx",
      "REVOKE ALL",
      "anon",
      "service_role",
      "ENABLE ROW LEVEL SECURITY",
    ]) {
      expect(sql).toContain(token);
    }
  });

  it("persists through the Postgres adapter and restores derived state", () => {
    const engine = createSupervisionPostgresEngine();
    const first = createTestSupervisionMachine({
      repository: createPostgresSupervisionRepository(engine),
      recordSource: "live",
    });
    const lease = first.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "draft_headline",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
    });
    first.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "hb-1",
      reportedStatus: "working",
    });
    const opened = first.openIncident({
      ...maple,
      leaseId: lease.leaseId,
      dedupeKey: "maple:p3b",
      severity: "ROUTINE",
      category: "agent",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "draft_headline",
      customerImpact: "Copy is waiting.",
      deadlineImpact: "none proven",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    const restored = createTestSupervisionMachine({
      repository: createPostgresSupervisionRepository(engine),
      recordSource: "live",
    });
    expect(restored.getLease(lease.leaseId)?.lastHealthyAt).toBe(
      first.getLease(lease.leaseId)?.lastHealthyAt,
    );
    expect(restored.getIncident(opened.incidentId)?.history.map((event) => event.eventId)).toEqual(
      opened.history.map((event) => event.eventId),
    );
  });

  it("enforces append-only incident events on the Postgres adapter", () => {
    const repo = createPostgresSupervisionRepository();
    const machine = createTestSupervisionMachine({ repository: repo, recordSource: "live" });
    const opened = machine.openIncident({
      ...harbor,
      dedupeKey: "harbor:append",
      severity: "FINANCIAL_RISK",
      category: "money",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "reconcile",
      customerImpact: "Money question.",
      deadlineImpact: "held",
      financialImpact: "sandbox",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    expect(() => repo.replaceIncidentEvents(opened.incidentId, [])).toThrow(
      AppendOnlyViolationError,
    );
  });

  it("prevents two competing sweep holders from both winning", () => {
    const clock = createFrozenClock("2026-08-23T16:00:00.000Z");
    const { processA, processB } = sharedPostgresPair();
    const a = createTestSupervisionMachine({
      repository: processA,
      clock,
      recordSource: "live",
      holderId: "lambda-a",
    });
    a.registerWorker({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...maple,
      subject: copyAgent(),
      step: "draft",
    });
    clock.advanceMs(1_300);
    const first = a.sweep();
    const b = createTestSupervisionMachine({
      repository: processB,
      clock,
      recordSource: "live",
      holderId: "lambda-b",
    });
    const second = b.sweep();
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(false);
    expect(second.skippedBecauseClaimHeld).toBe(true);
    expect(b.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);
  });

  it("lets process B continue after process A stops, without duplicating work", () => {
    const clock = createFrozenClock("2026-08-23T16:00:00.000Z");
    const { processA, processB } = sharedPostgresPair();
    const a = createTestSupervisionMachine({
      repository: processA,
      clock,
      recordSource: "live",
      holderId: "process-a",
    });
    const lease = a.registerWorker({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...maple,
      subject: copyAgent(),
      step: "assemble_set",
    });
    a.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "a-1",
      reportedStatus: "working",
    });
    clock.advanceMs(60_000);
    const b = createTestSupervisionMachine({
      repository: processB,
      clock,
      recordSource: "live",
      holderId: "process-b",
    });
    const sweep = b.sweep();
    expect(b.getLease(lease.leaseId)?.health).toBe("STALLED");
    expect(b.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);
    expect(sweep.claimed).toBe(true);
    const again = b.sweep();
    expect(b.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);
    expect(again.incidentsOpenedOrUpdated).toBeDefined();
  });

  it("keeps idempotency and tenant isolation across two repository handles", () => {
    const { processA, processB } = sharedPostgresPair();
    const a = createTestSupervisionMachine({
      repository: processA,
      recordSource: "live",
    });
    const mapleLease = a.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "maple_only",
    });
    a.recordHeartbeat({
      leaseId: mapleLease.leaseId,
      idempotencyKey: "same",
      reportedStatus: "working",
    });
    const b = createTestSupervisionMachine({
      repository: processB,
      recordSource: "live",
    });
    const ignored = b.recordHeartbeat({
      leaseId: mapleLease.leaseId,
      idempotencyKey: "same",
      reportedStatus: "working",
    });
    expect(ignored.ignored).toBe(true);
    expect(() =>
      b.recordHeartbeat({
        leaseId: mapleLease.leaseId,
        idempotencyKey: "cross",
        reportedStatus: "working",
        customerId: harbor.customerId,
        projectId: maple.projectId,
      }),
    ).toThrow(/customer/);
  });

  it("keeps Owner Console fixture and live Postgres snapshots separate", () => {
    const fixture = createTestSupervisionMachine({ recordSource: "fixture" });
    const live = createTestSupervisionMachine({
      repository: createPostgresSupervisionRepository(),
      recordSource: "live",
    });
    fixture.openIncident({
      ...maple,
      dedupeKey: "fixture-only",
      severity: "ROUTINE",
      category: "agent",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "fixture_step",
      customerImpact: "Fixture only.",
      deadlineImpact: "none proven",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    live.openIncident({
      ...harbor,
      dedupeKey: "live-only",
      severity: "SECURITY_SUSPECTED",
      category: "security",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "live_step",
      customerImpact: "Persisted live record.",
      deadlineImpact: "held",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "suspected",
    });
    const fixtureView = toIncidentCommandView(fixture.snapshot());
    const liveView = toIncidentCommandView(live.snapshot());
    expect(fixtureView.recordSource).toBe("fixture");
    expect(liveView.recordSource).toBe("live");
    expect(liveView.incidentCards[0]?.showSquishy).toBe(false);
    expect(fixtureView.incidentCards.some((card) => card.whatHappened.includes("Persisted live"))).toBe(
      false,
    );
  });

  it("fails closed in launch runtime if only memory or JSON is available", () => {
    expect(isLaunchRuntime({ NODE_ENV: "production" })).toBe(true);
    expect(() =>
      assertDurableRepository(createMemorySupervisionRepository(), { NODE_ENV: "production" }),
    ).toThrow(LaunchPersistenceForbiddenError);
    const dir = mkdtempSync(path.join(os.tmpdir(), "sup-launch-json-"));
    expect(() =>
      assertDurableRepository(createFileSupervisionRepository(dir), {
        NODE_ENV: "production",
      }),
    ).toThrow(LaunchPersistenceForbiddenError);
    rmSync(dir, { recursive: true, force: true });
    expect(() =>
      createLiveSupervisionRepository({ NODE_ENV: "production" }),
    ).toThrow(DurablePersistenceUnavailableError);
    expect(() =>
      assertDurableRepository(createPostgresSupervisionRepository(), { NODE_ENV: "production" }),
    ).not.toThrow();
  });

  it("does not treat absent Supabase credentials as a live production store", () => {
    const resolved = resolveSupervisionPostgresConfig({});
    expect(resolved.ok).toBe(false);
    if (resolved.ok) throw new Error("expected missing config");
    expect(resolved.missing.join(" ")).toContain("STUDIO_SUPERVISION_SUPABASE_URL");
    expect(resolved.missing.join(" ")).toContain("STUDIO_SUPERVISION_SUPABASE_SECRET_KEY");
  });

  it("proves two OS processes cannot both win the same sweep claim", async () => {
    const stub = await startSupervisionPostgrestStub();
    servers.push(stub.server);
    const base = `http://127.0.0.1:${stub.port}`;
    const headers = {
      apikey: stub.key,
      Authorization: `Bearer ${stub.key}`,
      "content-type": "application/json",
    };
    const health = await fetch(`${base}/rest/v1/health`, { headers });
    expect(health.status).toBe(200);

    async function claim(holder: string, claimId: string) {
      const res = await fetch(`${base}/rest/v1/rpc/supervision_try_claim_sweep`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_claim_id: claimId,
          p_holder: holder,
          p_at: "2026-08-23T16:00:00.000Z",
          p_ttl_ms: 10_000,
        }),
      });
      return (await res.json()) as { claimed: boolean };
    }

    expect((await claim("holder-a", "claim-a")).claimed).toBe(true);
    expect((await claim("holder-b", "claim-b")).claimed).toBe(false);

    const denied = await fetch(`${base}/rest/v1/rpc/supervision_try_claim_sweep`, {
      method: "POST",
      headers: {
        apikey: "anon-browser-key",
        Authorization: "Bearer anon-browser-key",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_claim_id: "claim-browser",
        p_holder: "browser",
        p_at: "2026-08-23T16:00:00.000Z",
        p_ttl_ms: 10_000,
      }),
    });
    expect(denied.status).toBe(401);

    const helper = path.join(
      process.cwd(),
      "scripts",
      "prove-supervision-pass-3b-multiprocess.mjs",
    );
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value !== "string") continue;
      if (key === "NODE_OPTIONS" || key.startsWith("VITEST") || key.startsWith("VITE_")) continue;
      env[key] = value;
    }
    const child = spawnSync(process.execPath, [helper], {
      encoding: "utf8",
      env,
      timeout: 15_000,
      execArgv: [],
      windowsHide: true,
    });
    expect(child.status).toBe(0);
    const proof = JSON.parse(child.stdout) as {
      processAClaimed: boolean;
      processBClaimed: boolean;
      bothWon: boolean;
    };
    expect(proof.processAClaimed).toBe(true);
    expect(proof.processBClaimed).toBe(false);
    expect(proof.bothWon).toBe(false);
  });
});
