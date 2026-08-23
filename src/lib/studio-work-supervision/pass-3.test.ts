import { mkdtempSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { afterEach, describe, expect, it } from "vitest";

import { createFrozenClock } from "./clock";
import { createFileSupervisionRepository } from "./file-repository";
import { createTestSupervisionMachine } from "./machine";
import { createMemorySupervisionRepository } from "./memory-repository";
import {
  AppendOnlyViolationError,
  DurablePersistenceUnavailableError,
  VolatileMemoryForbiddenError,
  assertDurableRepository,
} from "./repository";
import { toIncidentCommandView } from "./view-model";
import {
  SUPERVISION_AUTH_HEADER,
  SUPERVISION_DEV_PROOF_SECRET,
} from "./contract";
import { GET as getSnapshot } from "@/app/api/operating/supervision/snapshot/route";
import { POST as postRegister } from "@/app/api/operating/supervision/register/route";
import { POST as postReload } from "@/app/api/operating/supervision/reload/route";
import { resetLiveSupervisionMachineForTests } from "./live-runtime";

const maple = {
  customerId: "cust_maple_p3",
  customerLabel: "Maple & Pine Books (fixture)",
  projectId: "proj_maple_p3",
  campaignId: "camp_maple_p3",
};

const harbor = {
  customerId: "cust_harbor_p3",
  customerLabel: "Harbor Lantern Co. (fixture)",
  projectId: "proj_harbor_p3",
  campaignId: "camp_harbor_p3",
};

function copyAgent() {
  return { kind: "agent" as const, id: "agent_p3", label: "Copy agent (fixture)" };
}

describe("work supervision pass 3 durable persistence", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
    resetLiveSupervisionMachineForTests();
  });

  function tempDir() {
    const dir = mkdtempSync(path.join(os.tmpdir(), "sup-p3-"));
    dirs.push(dir);
    return dir;
  }

  it("persists leases, incidents, recovery history, and next checks across restart", () => {
    const dir = tempDir();
    const clock = createFrozenClock("2026-08-23T15:00:00.000Z");
    const first = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      clock,
      recordSource: "live",
    });
    const finite = first.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "draft_headline",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
    });
    first.recordHeartbeat({
      leaseId: finite.leaseId,
      idempotencyKey: "hb-1",
      reportedStatus: "working",
      evidenceSummary: "Drafting.",
    });
    const waiting = first.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "wait_for_owner_notes",
    });
    first.recordHeartbeat({
      leaseId: waiting.leaseId,
      idempotencyKey: "wait-1",
      reportedStatus: "waiting_for_owner",
      waitingReason: "Owner must approve the proof.",
    });
    const service = first.registerWorker({
      kind: "LONG_RUNNING_SERVICE",
      ...harbor,
      subject: { kind: "service", id: "svc_watch", label: "Watch service" },
      step: "listen",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
    });
    first.recordHeartbeat({
      leaseId: service.leaseId,
      idempotencyKey: "svc-1",
      reportedStatus: "service_awake",
    });
    clock.advanceMs(1_300);
    first.sweep();
    const stalledId = first.getLease(finite.leaseId)!.openIncidentId!;
    first.attemptRecovery(stalledId, "failure", "request_fresh_heartbeat", "Still silent.");
    const before = first.getIncident(stalledId)!;
    const lastHealthy = first.getLease(finite.leaseId)!.lastHealthyAt;

    const restored = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      clock,
      recordSource: "live",
    });
    const restoredIncident = restored.getIncident(stalledId)!;
    expect(restoredIncident.history.length).toBe(before.history.length);
    expect(restoredIncident.recoveryAttempts).toHaveLength(before.recoveryAttempts.length);
    expect(restoredIncident.nextCheckAt).toBe(before.nextCheckAt);
    expect(restoredIncident.ownerEscalated).toBe(true);
    expect(restored.getLease(finite.leaseId)!.lastHealthyAt).toBe(lastHealthy);
    expect(restored.getLease(waiting.leaseId)!.health).toBe("WAITING");
    expect(restored.getLease(waiting.leaseId)!.reportedStatus).toBe("waiting_for_owner");
    expect(restored.getLease(service.leaseId)!.health).not.toBe("SERVICE_AWAKE");
    expect(restored.getLease(service.leaseId)!.serviceNeedsHealthCheck).toBe(true);
    expect(restored.snapshot().recordSource).toBe("live");
  });

  it("detects downtime-missed heartbeats after restart without duplicating incidents", () => {
    const dir = tempDir();
    const clock = createFrozenClock("2026-08-23T15:00:00.000Z");
    const first = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      clock,
      recordSource: "live",
      holderId: "process-a",
    });
    const lease = first.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "assemble_set",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
    });
    clock.advanceMs(1_300);
    first.sweep();
    expect(first.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);

    clock.advanceMs(60_000);
    const restored = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      clock,
      recordSource: "live",
      holderId: "process-b",
    });
    const sweep = restored.sweep();
    expect(restored.getLease(lease.leaseId)!.health).toBe("STALLED");
    expect(restored.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);
    expect(sweep.recoveries.every((row) => row.result !== "pending") || sweep.claimed).toBe(true);
    const incident = restored.listIncidentsForCustomer(maple.customerId)[0]!;
    expect(incident.history.filter((event) => event.type === "incident_opened")).toHaveLength(1);
  });

  it("reconstructs derived incident state from append-only history", () => {
    const dir = tempDir();
    const machine = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    const opened = machine.openIncident({
      ...harbor,
      dedupeKey: "harbor:p3",
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
    const repo = createFileSupervisionRepository(dir);
    expect(() => repo.replaceIncidentEvents(opened.incidentId, [])).toThrow(
      AppendOnlyViolationError,
    );
    const events = repo.listIncidentEvents(opened.incidentId);
    expect(events[0]?.type).toBe("incident_opened");
    const restored = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    const derived = restored.getIncident(opened.incidentId)!;
    expect(derived.state).toBe("ESCALATED");
    expect(derived.history.map((event) => event.eventId)).toEqual(
      events.map((event) => event.eventId),
    );
  });

  it("enforces tenant isolation after restore", () => {
    const dir = tempDir();
    const first = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    const mapleLease = first.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "maple_only",
    });
    first.registerWorker({
      kind: "FINITE_WORK",
      ...harbor,
      subject: copyAgent(),
      step: "harbor_only",
    });
    const restored = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    expect(() =>
      restored.recordHeartbeat({
        leaseId: mapleLease.leaseId,
        idempotencyKey: "cross",
        reportedStatus: "working",
        customerId: harbor.customerId,
        projectId: maple.projectId,
      }),
    ).toThrow(/customer/);
    expect(restored.listIncidentsForCustomer(maple.customerId).every((row) => row.customerId === maple.customerId)).toBe(true);
  });

  it("keeps idempotency across restart", () => {
    const dir = tempDir();
    const first = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    const lease = first.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "draft",
    });
    const one = first.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "same",
      reportedStatus: "working",
    });
    const restored = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    const two = restored.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "same",
      reportedStatus: "working",
    });
    expect(one.ignored).toBe(false);
    expect(two.ignored).toBe(true);
  });

  it("prevents a concurrent sweep holder from duplicating recoveries", () => {
    const dir = tempDir();
    const clock = createFrozenClock("2026-08-23T15:00:00.000Z");
    const a = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      clock,
      recordSource: "live",
      holderId: "holder-a",
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
    const firstSweep = a.sweep();
    expect(firstSweep.claimed).toBe(true);
    const b = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      clock,
      recordSource: "live",
      holderId: "holder-b",
    });
    const secondSweep = b.sweep();
    expect(secondSweep.claimed).toBe(false);
    expect(secondSweep.skippedBecauseClaimHeld).toBe(true);
    expect(b.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);
  });

  it("restores SERVICE_AWAKE only after a post-restart health check", () => {
    const dir = tempDir();
    const first = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    const service = first.registerWorker({
      kind: "LONG_RUNNING_SERVICE",
      ...harbor,
      subject: { kind: "service", id: "svc_watch", label: "Watch service" },
      step: "listen",
    });
    first.recordHeartbeat({
      leaseId: service.leaseId,
      idempotencyKey: "awake-1",
      reportedStatus: "service_awake",
    });
    expect(first.getLease(service.leaseId)!.health).toBe("SERVICE_AWAKE");
    const restored = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    expect(restored.getLease(service.leaseId)!.health).not.toBe("SERVICE_AWAKE");
    restored.recordHeartbeat({
      leaseId: service.leaseId,
      idempotencyKey: "awake-2",
      reportedStatus: "service_awake",
    });
    expect(restored.getLease(service.leaseId)!.health).toBe("SERVICE_AWAKE");
  });

  it("keeps fixture and live snapshots separate", () => {
    const fixture = createTestSupervisionMachine({ recordSource: "fixture" });
    const live = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(tempDir()),
      recordSource: "live",
    });
    fixture.openIncident({
      ...maple,
      dedupeKey: "maple:fixture-only",
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
      dedupeKey: "harbor:live-only",
      severity: "ROUTINE",
      category: "agent",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "live_step",
      customerImpact: "Live persisted only.",
      deadlineImpact: "none proven",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    const fixtureView = toIncidentCommandView(fixture.snapshot());
    const liveView = toIncidentCommandView(live.snapshot());
    expect(fixtureView.recordSource).toBe("fixture");
    expect(liveView.recordSource).toBe("live");
    expect(fixtureView.incidentCards.some((card) => card.whatHappened.includes("Fixture only"))).toBe(
      true,
    );
    expect(liveView.incidentCards.some((card) => card.whatHappened.includes("Live persisted"))).toBe(
      true,
    );
    expect(fixtureView.incidentCards.some((card) => card.whatHappened.includes("Live persisted"))).toBe(
      false,
    );
  });

  it("fails closed when production would fall back to volatile memory", () => {
    expect(() =>
      assertDurableRepository(createMemorySupervisionRepository(), {
        NODE_ENV: "production",
      }),
    ).toThrow(/Launch runtime cannot use memory or JSON-file/);
    expect(() =>
      createTestSupervisionMachine({
        repository: createMemorySupervisionRepository(),
        requireDurable: true,
      }),
    ).toThrow(VolatileMemoryForbiddenError);
  });

  it("proves an intentional second Node process can still read the durable files", () => {
    const dir = tempDir();
    const machine = createTestSupervisionMachine({
      repository: createFileSupervisionRepository(dir),
      recordSource: "live",
    });
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "process_exit_proof",
    });
    const script = `
      const fs = require('fs');
      const path = require('path');
      const dir = process.env.P3_DIR;
      const files = fs.readdirSync(path.join(dir, 'leases'));
      if (!files.some((file) => file.endsWith('.json'))) process.exit(2);
      const schema = JSON.parse(fs.readFileSync(path.join(dir, 'SCHEMA.json'), 'utf8'));
      if (schema.provider !== 'studio-data-json') process.exit(3);
      process.stdout.write('restart-process-ok');
    `;
    const result = spawnSync(process.execPath, ["-e", script], {
      encoding: "utf8",
      env: { ...process.env, P3_DIR: dir },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("restart-process-ok");
    expect(lease.step).toBe("process_exit_proof");
  });

  it("fails closed when the durable store cannot be created", () => {
    const blocker = path.join(tempDir(), "not-a-directory");
    writeFileSync(blocker, "blocked");
    expect(() => createFileSupervisionRepository(blocker)).toThrow(
      DurablePersistenceUnavailableError,
    );
  });

  it("reloads live Owner Console records from disk without mixing fixtures", async () => {
    resetLiveSupervisionMachineForTests();
    const headers = {
      "content-type": "application/json",
      [SUPERVISION_AUTH_HEADER]: SUPERVISION_DEV_PROOF_SECRET,
    };
    const registered = await postRegister(
      new Request("http://studio.local/api/operating/supervision/register", {
        method: "POST",
        headers,
        body: JSON.stringify({
          leaseId: "lease_p3_http_live",
          kind: "FINITE_WORK",
          workerId: "scout_p3_http",
          providerId: "scout",
          ...maple,
          step: "durable_http_reload",
        }),
      }),
    );
    expect(registered.status).toBe(200);
    const reloaded = await postReload(
      new Request("http://studio.local/api/operating/supervision/reload", {
        method: "POST",
        headers,
        body: "{}",
      }),
    );
    expect(reloaded.status).toBe(200);
    const reloadJson = (await reloaded.json()) as {
      recordSource: string;
      leases: Array<{ leaseId: string }>;
    };
    expect(reloadJson.recordSource).toBe("live");
    expect(reloadJson.leases.some((lease) => lease.leaseId === "lease_p3_http_live")).toBe(true);

    const snapshot = await getSnapshot(
      new Request("http://studio.local/api/operating/supervision/snapshot", {
        method: "GET",
        headers,
      }),
    );
    expect(snapshot.status).toBe(200);
    const body = (await snapshot.json()) as {
      mixed: boolean;
      fixture: { recordSource: string; incidentCards: Array<{ whatHappened: string }> };
      live: { recordSource: string; healthyLeases: Array<{ leaseId: string }> };
    };
    expect(body.mixed).toBe(false);
    expect(body.fixture.recordSource).toBe("fixture");
    expect(body.live.recordSource).toBe("live");
    expect(body.live.healthyLeases.some((lease) => lease.leaseId === "lease_p3_http_live")).toBe(
      true,
    );
    expect(
      body.fixture.incidentCards.some((card) => card.whatHappened.includes("Live persisted")),
    ).toBe(false);
  });
});
