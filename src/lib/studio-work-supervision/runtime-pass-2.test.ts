import { afterEach, describe, expect, it } from "vitest";

import { createFrozenClock } from "./clock";
import {
  SUPERVISION_AUTH_HEADER,
  SUPERVISION_DEV_PROOF_SECRET,
  SUPERVISION_IDEMPOTENCY_HEADER,
} from "./contract";
import { POST as postHeartbeat } from "@/app/api/operating/supervision/heartbeat/route";
import { POST as postRegister } from "@/app/api/operating/supervision/register/route";
import { POST as postSweep } from "@/app/api/operating/supervision/sweep/route";
import { createTestSupervisionMachine } from "./machine";
import { ROUTINE_RECOVERY_WINDOW_MS, UNCONNECTED_PROVIDER_PORTS } from "./policy";
import { resetLiveSupervisionMachineForTests } from "./live-runtime";
import { toIncidentCommandView } from "./view-model";

const maple = {
  customerId: "cust_maple_runtime",
  customerLabel: "Maple & Pine Books (fixture)",
  projectId: "proj_maple_runtime",
  campaignId: "camp_maple_runtime",
};

const harbor = {
  customerId: "cust_harbor_runtime",
  customerLabel: "Harbor Lantern Co. (fixture)",
  projectId: "proj_harbor_runtime",
  campaignId: "camp_harbor_runtime",
};

function copyAgent() {
  return { kind: "agent" as const, id: "agent_copy_runtime", label: "Copy agent (fixture)" };
}

function authHeaders(extra?: Record<string, string>) {
  return {
    "content-type": "application/json",
    [SUPERVISION_AUTH_HEADER]: SUPERVISION_DEV_PROOF_SECRET,
    ...extra,
  };
}

describe("work supervision runtime pass 2", () => {
  afterEach(() => {
    resetLiveSupervisionMachineForTests();
  });

  it("records assigned worker, package, branch, commit, and expected update on a Machine-owned lease", () => {
    const machine = createTestSupervisionMachine();
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      assignedWorker: {
        providerId: "scout",
        workerId: "scout_runtime_1",
        label: "Scout runtime worker (fixture)",
      },
      packageId: "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1",
      branch: "operating/work-supervision-and-incident-escalation-1",
      commit: "0dc769038518a31db91346a6164c58a27a3f2239",
      step: "draft_headline",
      heartbeatIntervalMs: 1_000,
      expectedCompletionAt: "2026-08-23T13:00:00.000Z",
    });
    expect(lease.assignedWorker.workerId).toBe("scout_runtime_1");
    expect(lease.packageId).toBe(
      "STUDIO-OPERATING-WORK-SUPERVISION-AND-INCIDENT-ESCALATION-1",
    );
    expect(lease.branch).toBe("operating/work-supervision-and-incident-escalation-1");
    expect(lease.commit).toBe("0dc769038518a31db91346a6164c58a27a3f2239");
    expect(lease.expectedUpdateAt).not.toBeNull();
    expect(lease.health).toBe("ACTIVE");
  });

  it("keeps healthy finite work ACTIVE and a healthy service SERVICE_AWAKE", () => {
    const machine = createTestSupervisionMachine();
    const finite = machine.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "draft_headline",
    });
    const service = machine.registerWorker({
      kind: "LONG_RUNNING_SERVICE",
      ...maple,
      subject: { kind: "service", id: "svc_watch", label: "Watch service" },
      assignedWorker: {
        providerId: "machine",
        workerId: "svc_watch",
        label: "Watch service",
      },
      step: "listen",
    });
    machine.recordHeartbeat({
      leaseId: finite.leaseId,
      idempotencyKey: "finite-ok",
      reportedStatus: "working",
      evidenceSummary: "Draft in progress.",
    });
    machine.recordHeartbeat({
      leaseId: service.leaseId,
      idempotencyKey: "service-ok",
      reportedStatus: "service_awake",
      evidenceSummary: "Service is detached and listening.",
    });
    const sweep = machine.sweep();
    expect(machine.getLease(finite.leaseId)!.health).toBe("ACTIVE");
    expect(machine.getLease(service.leaseId)!.health).toBe("SERVICE_AWAKE");
    expect(machine.getLease(finite.leaseId)!.health).not.toBe("SERVICE_AWAKE");
    expect(sweep.incidentsOpenedOrUpdated).toHaveLength(0);
  });

  it("marks a stopped finite heartbeat STALLED after the contract threshold", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createTestSupervisionMachine({ clock });
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...maple,
      subject: copyAgent(),
      step: "assemble_set",
    });
    clock.advanceMs(1_300);
    const sweep = machine.sweep();
    const fresh = machine.getLease(lease.leaseId)!;
    expect(fresh.health).toBe("STALLED");
    expect(fresh.openIncidentId).toBeTruthy();
    expect(sweep.leaseHealth[lease.leaseId]).toBe("STALLED");
    const incident = machine.getIncident(fresh.openIncidentId!)!;
    expect(incident.failedOrStalledStep).toBe("assemble_set");
    expect(incident.lastHealthyAt).toBe(lease.lastHealthyAt);
  });

  it("opens a dead-service incident without calling quiet finite work a dead service", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createTestSupervisionMachine({ clock });
    const service = machine.registerWorker({
      kind: "LONG_RUNNING_SERVICE",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...harbor,
      subject: { kind: "service", id: "svc_render", label: "Render service" },
      step: "keep_renderer_awake",
    });
    clock.advanceMs(1_300);
    machine.sweep();
    const incident = machine.getIncident(machine.getLease(service.leaseId)!.openIncidentId!)!;
    expect(incident.dedupeKey.endsWith(":dead_service")).toBe(true);
    expect(incident.category).toBe("process");
  });

  it("detects branch/commit mismatch from worker evidence, not worker health claims", () => {
    const machine = createTestSupervisionMachine();
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      branch: "operating/work-supervision-and-incident-escalation-1",
      commit: "0dc769038518a31db91346a6164c58a27a3f2239",
      step: "draft_headline",
    });
    machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "mismatch-1",
      reportedStatus: "working",
      branch: "wrong-branch",
      commit: "deadbeef",
      evidenceSummary: "Worker is still sending beats on the wrong commit.",
    });
    machine.sweep();
    const fresh = machine.getLease(lease.leaseId)!;
    expect(fresh.mismatch?.code).toBe("branch_commit_mismatch");
    const incident = machine.getIncident(fresh.openIncidentId!)!;
    expect(incident.dedupeKey.endsWith(":branch_commit_mismatch")).toBe(true);
    expect(incident.ownerEscalated).toBe(true);
    expect(toIncidentCommandView(machine.snapshot()).healthyLeases).toHaveLength(0);
  });

  it("resolves authorized routine recovery without Owner escalation after a fresh heartbeat", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createTestSupervisionMachine({ clock });
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...maple,
      subject: copyAgent(),
      step: "proofread",
    });
    clock.advanceMs(1_300);
    const first = machine.sweep();
    expect(first.recoveries[0]?.result).toBe("pending");
    const incidentId = machine.getLease(lease.leaseId)!.openIncidentId!;
    expect(machine.getIncident(incidentId)!.ownerEscalated).toBe(false);
    machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "resume-1",
      reportedStatus: "working",
      evidenceSummary: "Worker resumed.",
    });
    const second = machine.sweep();
    expect(second.recoveries.some((row) => row.result === "success")).toBe(true);
    const recovered = machine.getIncident(incidentId)!;
    expect(recovered.state).toBe("RESOLVED");
    expect(recovered.ownerEscalated).toBe(false);
    expect(recovered.history.some((event) => event.type === "resolved")).toBe(true);
  });

  it("creates a complete Owner incident when authorized recovery fails", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createTestSupervisionMachine({ clock });
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...harbor,
      subject: copyAgent(),
      step: "upload_final",
    });
    clock.advanceMs(1_300);
    machine.sweep();
    clock.advanceMs(ROUTINE_RECOVERY_WINDOW_MS);
    const failedSweep = machine.sweep();
    expect(failedSweep.recoveries.some((row) => row.result === "failure")).toBe(true);
    const incident = machine.getIncident(machine.getLease(lease.leaseId)!.openIncidentId!)!;
    expect(incident.ownerEscalated).toBe(true);
    expect(incident.state).toBe("ESCALATED");
    expect(incident.ownerDecisionRequired).not.toBe("none");
    expect(incident.whoMustBeContacted).toContain("Owner");
    expect(incident.ifOwnerDoesNothing).toContain("Owner desk");
    expect(incident.ifOwnerDoesNothing).toContain(incident.nextCheckAt);
    expect(incident.recoveryAttempts.some((attempt) => attempt.result === "failure")).toBe(
      true,
    );
    expect(incident.history.length).toBeGreaterThan(1);
  });

  it("does not mislabel WAITING_FOR_OWNER as WORKING or ACTIVE", () => {
    const machine = createTestSupervisionMachine();
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "wait_for_owner_notes",
    });
    machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "wait-1",
      reportedStatus: "waiting_for_owner",
      waitingReason: "Owner must approve the proof.",
      evidenceSummary: "Proof is ready; Owner decision is required.",
    });
    machine.sweep();
    const fresh = machine.getLease(lease.leaseId)!;
    expect(fresh.health).toBe("WAITING");
    expect(fresh.health).not.toBe("ACTIVE");
    expect(fresh.reportedStatus).toBe("waiting_for_owner");
    expect(fresh.openIncidentId).toBeNull();
    expect(
      toIncidentCommandView(machine.snapshot()).healthyLeases.some(
        (row) => row.leaseId === lease.leaseId,
      ),
    ).toBe(false);
  });

  it("keeps unconnected providers COVERAGE_NOT_CONNECTED even if they register", () => {
    const machine = createTestSupervisionMachine();
    const lease = machine.registerWorker({
      kind: "LONG_RUNNING_SERVICE",
      coverageConnected: true,
      ...maple,
      subject: { kind: "provider", id: "claude", label: "Claude verifier" },
      assignedWorker: {
        providerId: "claude",
        workerId: "claude_verifier",
        label: "Claude verifier",
      },
      step: "verify_incident",
    });
    machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "claude-beat",
      reportedStatus: "service_awake",
    });
    machine.sweep();
    const fresh = machine.getLease(lease.leaseId)!;
    expect(fresh.coverageConnected).toBe(false);
    expect(fresh.health).toBe("COVERAGE_NOT_CONNECTED");
    expect(machine.snapshot().providers).toEqual([...UNCONNECTED_PROVIDER_PORTS]);
  });

  it("does not duplicate incidents for duplicate heartbeats or duplicate sweeps", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createTestSupervisionMachine({ clock });
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...maple,
      subject: copyAgent(),
      step: "draft",
    });
    const firstBeat = machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "same-key",
      reportedStatus: "working",
    });
    const secondBeat = machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "same-key",
      reportedStatus: "working",
    });
    expect(firstBeat.ignored).toBe(false);
    expect(secondBeat.ignored).toBe(true);
    clock.advanceMs(1_300);
    machine.sweep();
    machine.sweep();
    expect(machine.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);
    const incident = machine.listIncidentsForCustomer(maple.customerId)[0]!;
    expect(incident.incidentId).toBeTruthy();
  });

  it("records overdue next checks without replacing history", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createTestSupervisionMachine({ clock });
    const lease = machine.registerWorker({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 1_000,
      graceMs: 200,
      ...maple,
      subject: copyAgent(),
      step: "draft",
    });
    clock.advanceMs(1_300);
    machine.sweep();
    const incidentId = machine.getLease(lease.leaseId)!.openIncidentId!;
    const opened = machine.getIncident(incidentId)!;
    const firstEvent = { ...opened.history[0]! };
    clock.advanceMs(6 * 60_000);
    const sweep = machine.sweep();
    expect(sweep.overdueNextChecks).toContain(incidentId);
    const after = machine.getIncident(incidentId)!;
    expect(after.history[0]).toEqual(firstEvent);
    expect(after.history.some((event) => event.type === "overdue_next_check")).toBe(true);
    expect(after.lastHealthyAt).toBe(opened.lastHealthyAt);
  });

  it("rejects worker self-certify fields on the heartbeat endpoint", async () => {
    const register = await postRegister(
      new Request("http://localhost/api/operating/supervision/register", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          kind: "FINITE_WORK",
          workerId: "scout_http_1",
          workerLabel: "Scout HTTP worker",
          providerId: "scout",
          ...maple,
          step: "http_draft",
        }),
      }),
    );
    expect(register.status).toBe(200);
    const registered = (await register.json()) as { lease: { leaseId: string } };
    const forbidden = await postHeartbeat(
      new Request("http://localhost/api/operating/supervision/heartbeat", {
        method: "POST",
        headers: authHeaders({ [SUPERVISION_IDEMPOTENCY_HEADER]: "hb-self" }),
        body: JSON.stringify({
          leaseId: registered.lease.leaseId,
          reportedStatus: "working",
          health: "ACTIVE",
        }),
      }),
    );
    expect(forbidden.status).toBe(400);
    const payload = (await forbidden.json()) as { error: string };
    expect(payload.error.toLowerCase()).toContain("self-certify");
  });

  it("enforces service auth, customer isolation, and Machine-computed health over HTTP", async () => {
    const denied = await postRegister(
      new Request("http://localhost/api/operating/supervision/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "FINITE_WORK" }),
      }),
    );
    expect(denied.status).toBe(401);

    const register = await postRegister(
      new Request("http://localhost/api/operating/supervision/register", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          kind: "FINITE_WORK",
          workerId: "scout_http_2",
          providerId: "scout",
          ...maple,
          step: "http_isolate",
        }),
      }),
    );
    const registered = (await register.json()) as { lease: { leaseId: string; health: string } };
    expect(registered.lease.health).toBe("ACTIVE");

    const isolated = await postHeartbeat(
      new Request("http://localhost/api/operating/supervision/heartbeat", {
        method: "POST",
        headers: authHeaders({ [SUPERVISION_IDEMPOTENCY_HEADER]: "hb-wrong-customer" }),
        body: JSON.stringify({
          leaseId: registered.lease.leaseId,
          reportedStatus: "working",
          customerId: harbor.customerId,
          projectId: maple.projectId,
        }),
      }),
    );
    expect(isolated.status).toBe(403);

    const ok = await postHeartbeat(
      new Request("http://localhost/api/operating/supervision/heartbeat", {
        method: "POST",
        headers: authHeaders({ [SUPERVISION_IDEMPOTENCY_HEADER]: "hb-ok" }),
        body: JSON.stringify({
          leaseId: registered.lease.leaseId,
          reportedStatus: "working",
          customerId: maple.customerId,
          projectId: maple.projectId,
          evidenceSummary: "Still drafting.",
        }),
      }),
    );
    expect(ok.status).toBe(200);
    const beat = (await ok.json()) as {
      machineComputedHealth: string;
      lease: { health: string };
    };
    expect(beat.machineComputedHealth).toBe("ACTIVE");
    expect(beat.lease.health).toBe("ACTIVE");

    const sweep = await postSweep(
      new Request("http://localhost/api/operating/supervision/sweep", {
        method: "POST",
        headers: authHeaders(),
      }),
    );
    expect(sweep.status).toBe(200);
    const sweepBody = (await sweep.json()) as {
      providersRemainUnconnected: Array<{ status: string; healthyDisplayAllowed: boolean }>;
    };
    expect(
      sweepBody.providersRemainUnconnected.every(
        (port) => port.status === "NOT_CONNECTED" && port.healthyDisplayAllowed === false,
      ),
    ).toBe(true);
  });
});
