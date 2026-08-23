import { describe, expect, it } from "vitest";

import { createFrozenClock } from "./clock";
import { buildFoundationFixturePack } from "./fixtures";
import { createSupervisionMachine } from "./machine";
import {
  DEFAULT_GRACE_MS,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  NEXT_CHECK_INTERVAL_MS,
  SQUISHY_WATCHKEEPER_ASSET,
  UNCONNECTED_PROVIDER_PORTS,
  isSecuritySeverity,
  mayShowSquishy,
  nextCheckAt,
} from "./policy";
import { toIncidentCommandDetail, toIncidentCommandView } from "./view-model";

const maple = {
  customerId: "cust_maple",
  customerLabel: "Maple & Pine Books (fixture)",
  projectId: "proj_maple",
  campaignId: "camp_maple",
};

const harbor = {
  customerId: "cust_harbor",
  customerLabel: "Harbor Lantern Co. (fixture)",
  projectId: "proj_harbor",
  campaignId: "camp_harbor",
};

function copyAgent() {
  return { kind: "agent" as const, id: "agent_copy", label: "Copy agent (fixture)" };
}

describe("work supervision foundation pass 1", () => {
  it("keeps healthy finite work ACTIVE without an incident", () => {
    const machine = createSupervisionMachine();
    const lease = machine.issueLease({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "draft_headline",
    });
    machine.recordHeartbeat({ leaseId: lease.leaseId, idempotencyKey: "hb-1" });
    machine.evaluateLeases();
    const fresh = machine.getLease(lease.leaseId)!;
    expect(fresh.health).toBe("ACTIVE");
    expect(fresh.openIncidentId).toBeNull();
    expect(machine.snapshot().incidents).toHaveLength(0);
  });

  it("keeps a healthy long-running service SERVICE_AWAKE, distinct from finite work", () => {
    const machine = createSupervisionMachine();
    const lease = machine.issueLease({
      kind: "LONG_RUNNING_SERVICE",
      ...maple,
      subject: { kind: "service", id: "svc_watch", label: "Watch service" },
      step: "listen",
    });
    machine.recordHeartbeat({ leaseId: lease.leaseId, idempotencyKey: "svc-1" });
    machine.evaluateLeases();
    expect(machine.getLease(lease.leaseId)!.health).toBe("SERVICE_AWAKE");
    expect(machine.snapshot().incidents).toHaveLength(0);
  });

  it("opens a deterministic stale-heartbeat incident for finite work", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createSupervisionMachine({ clock });
    const lease = machine.issueLease({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 30_000,
      graceMs: 5_000,
      ...maple,
      subject: copyAgent(),
      step: "assemble_set",
    });
    clock.advanceMs(40_000);
    machine.evaluateLeases();
    const incident = machine.getIncident(machine.getLease(lease.leaseId)!.openIncidentId!)!;
    expect(machine.getLease(lease.leaseId)!.health).toBe("STALLED");
    expect(incident.severity).toBe("ROUTINE");
    expect(incident.failedOrStalledStep).toBe("assemble_set");
    expect(incident.customerId).toBe(maple.customerId);
    expect(incident.ownerEscalated).toBe(false);
    expect(incident.history[0]?.type).toBe("incident_opened");
  });

  it("detects a dead long-running service separately from quiet finite work", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createSupervisionMachine({ clock });
    machine.issueLease({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "wait_for_client_notes",
    });
    const service = machine.issueLease({
      kind: "LONG_RUNNING_SERVICE",
      heartbeatIntervalMs: 30_000,
      graceMs: 5_000,
      ...maple,
      subject: { kind: "service", id: "svc_render", label: "Render service" },
      step: "keep_renderer_awake",
    });
    clock.advanceMs(40_000);
    machine.evaluateLeases();
    const snapshot = machine.snapshot();
    expect(snapshot.leases.find((row) => row.kind === "FINITE_WORK")?.health).toBe("STALLED");
    expect(machine.getLease(service.leaseId)!.health).toBe("STALLED");
    expect(
      snapshot.incidents.some((incident) => incident.dedupeKey.endsWith(":dead_service")),
    ).toBe(true);
  });

  it("records blocked work with the exact blocker and does not call it a dead service", () => {
    const machine = createSupervisionMachine();
    const lease = machine.issueLease({
      kind: "FINITE_WORK",
      ...harbor,
      subject: { kind: "agent", id: "agent_print", label: "Print agent" },
      step: "send_to_vendor",
    });
    machine.recordHeartbeat({ leaseId: lease.leaseId, idempotencyKey: "print-1" });
    machine.markBlocked(
      lease.leaseId,
      "vendor_api_unreachable",
      "Print vendor API returned connection refused.",
    );
    machine.evaluateLeases();
    const fresh = machine.getLease(lease.leaseId)!;
    const incident = machine.getIncident(fresh.openIncidentId!)!;
    expect(fresh.health).toBe("BLOCKED");
    expect(fresh.blocker?.code).toBe("vendor_api_unreachable");
    expect(incident.customerImpact).toContain("Print vendor API returned connection refused.");
    expect(incident.dedupeKey).toContain("blocked:vendor_api_unreachable");
  });

  it("ignores duplicate heartbeats with the same idempotency key", () => {
    const machine = createSupervisionMachine();
    const lease = machine.issueLease({
      kind: "FINITE_WORK",
      ...maple,
      subject: copyAgent(),
      step: "draft",
    });
    const first = machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "same-key",
    });
    const second = machine.recordHeartbeat({
      leaseId: lease.leaseId,
      idempotencyKey: "same-key",
    });
    expect(first.ignored).toBe(false);
    expect(second.ignored).toBe(true);
    expect(second.lease.lastHeartbeatAt).toBe(first.lease.lastHeartbeatAt);
  });

  it("resolves routine recovery without escalating to the Owner", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createSupervisionMachine({ clock });
    const lease = machine.issueLease({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 30_000,
      graceMs: 5_000,
      ...maple,
      subject: copyAgent(),
      step: "proofread",
    });
    clock.advanceMs(40_000);
    machine.evaluateLeases();
    const incidentId = machine.getLease(lease.leaseId)!.openIncidentId!;
    const recovered = machine.attemptRecovery(
      incidentId,
      "success",
      "reissue_lease",
      "Worker resumed.",
    );
    expect(recovered.state).toBe("RESOLVED");
    expect(recovered.ownerEscalated).toBe(false);
    expect(recovered.history.some((event) => event.type === "resolved")).toBe(true);
  });

  it("escalates a complete Owner incident when routine recovery fails", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createSupervisionMachine({ clock });
    const lease = machine.issueLease({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 30_000,
      graceMs: 5_000,
      ...harbor,
      subject: copyAgent(),
      step: "upload_final",
    });
    clock.advanceMs(40_000);
    machine.evaluateLeases();
    const incident = machine.attemptRecovery(
      machine.getLease(lease.leaseId)!.openIncidentId!,
      "failure",
      "retry_upload",
      "Host refused the connection.",
    );
    expect(incident.ownerEscalated).toBe(true);
    expect(incident.state).toBe("ESCALATED");
    expect(incident.ownerDecisionRequired).not.toBe("none");
    expect(incident.whoMustBeContacted).toContain("Owner");
    expect(incident.ifOwnerDoesNothing).toContain("Owner desk");
    expect(incident.ifOwnerDoesNothing).toContain(incident.nextCheckAt);
    expect(incident.recoveryAttempts).toHaveLength(1);
    expect(incident.recoveryAttempts[0]?.result).toBe("failure");
  });

  it("opens deadline, financial, rights, and suspected-security incidents with the required escalation", () => {
    const machine = createSupervisionMachine();
    const deadline = machine.openIncident({
      ...harbor,
      dedupeKey: "harbor:deadline",
      severity: "DEADLINE_CRITICAL",
      category: "deadline",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "approve_proof",
      customerImpact: "Drop date is at risk.",
      deadlineImpact: "Promised date is inside the remaining window.",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    const financial = machine.openIncident({
      ...harbor,
      dedupeKey: "harbor:money",
      severity: "FINANCIAL_RISK",
      category: "money",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "reconcile_payment",
      customerImpact: "Payment truth is uncertain.",
      deadlineImpact: "Work is held.",
      financialImpact: "Possible duplicate sandbox charge.",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    const rights = machine.openIncident({
      ...maple,
      dedupeKey: "maple:rights",
      severity: "RIGHTS_OR_COMPLIANCE_RISK",
      category: "rights",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "clear_likeness",
      customerImpact: "Likeness is held.",
      deadlineImpact: "Design is held.",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "Owner judgment required.",
      securityOrBreachImpact: "none proven",
    });
    const security = machine.openIncident({
      ...maple,
      dedupeKey: "maple:security",
      severity: "SECURITY_SUSPECTED",
      category: "security",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "review_session_spike",
      customerImpact: "Fixture drill only.",
      deadlineImpact: "Paused.",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "Suspected — not confirmed.",
    });
    expect(deadline.ownerEscalated).toBe(true);
    expect(financial.ownerEscalated).toBe(true);
    expect(rights.ownerEscalated).toBe(true);
    expect(security.ownerEscalated).toBe(true);
    expect(security.containmentPerformed.toLowerCase()).toContain("isolated");
    expect(security.securityOrBreachImpact).toMatch(/not confirmed/i);
    expect(isSecuritySeverity(security.severity)).toBe(true);
    expect(mayShowSquishy(security.severity)).toBe(false);
    expect(mayShowSquishy("ROUTINE")).toBe(true);
  });

  it("hides Squishy on security incidents and uses the canonical asset on routine status only", () => {
    const pack = buildFoundationFixturePack();
    const list = toIncidentCommandView(pack.snapshot);
    const security = toIncidentCommandDetail(pack.securityIncident);
    const recovered = toIncidentCommandDetail(pack.recoveredRoutine);
    expect(list.watchkeeper.showSquishy).toBe(false);
    expect(list.watchkeeper.ring).toBe("hidden");
    expect(security.showSquishy).toBe(false);
    expect(security.presentation).toBe("critical");
    expect(recovered.showSquishy).toBe(true);
    expect(SQUISHY_WATCHKEEPER_ASSET).toBe("public/squishy/squishy-studio-guide-v1.png");
    expect(list.watchkeeper.assetSrc).toBe("/squishy/squishy-studio-guide-v1.png");
  });

  it("never displays an unconnected provider as healthy", () => {
    const machine = createSupervisionMachine();
    const lease = machine.issueLease({
      kind: "LONG_RUNNING_SERVICE",
      coverageConnected: false,
      ...maple,
      subject: { kind: "provider", id: "claude", label: "Claude verifier" },
      step: "verify_incident",
    });
    machine.evaluateLeases();
    const fresh = machine.getLease(lease.leaseId)!;
    expect(fresh.health).toBe("COVERAGE_NOT_CONNECTED");
    expect(fresh.health).not.toBe("SERVICE_AWAKE");
    expect(fresh.health).not.toBe("ACTIVE");
    const snapshot = machine.snapshot();
    expect(snapshot.providers).toEqual([...UNCONNECTED_PROVIDER_PORTS]);
    expect(snapshot.providers.every((port) => port.status === "NOT_CONNECTED")).toBe(true);
    expect(snapshot.providers.every((port) => port.healthyDisplayAllowed === false)).toBe(true);
    const incident = machine.getIncident(fresh.openIncidentId!)!;
    expect(incident.customerImpact.toLowerCase()).toContain("not connected");
  });

  it("preserves append-only history and does not overwrite earlier events", () => {
    const clock = createFrozenClock("2026-08-23T12:00:00.000Z");
    const machine = createSupervisionMachine({ clock });
    const lease = machine.issueLease({
      kind: "FINITE_WORK",
      heartbeatIntervalMs: 30_000,
      graceMs: 5_000,
      ...maple,
      subject: copyAgent(),
      step: "draft",
    });
    clock.advanceMs(40_000);
    machine.evaluateLeases();
    const incidentId = machine.getLease(lease.leaseId)!.openIncidentId!;
    const opened = machine.getIncident(incidentId)!;
    const firstEvent = { ...opened.history[0]! };
    machine.attemptRecovery(incidentId, "failure", "retry", "still down");
    const after = machine.getIncident(incidentId)!;
    expect(after.history[0]).toEqual(firstEvent);
    expect(after.history.length).toBeGreaterThan(opened.history.length);
    expect(() => {
      after.history.pop();
    }).not.toThrow();
    expect(machine.getIncident(incidentId)!.history[0]).toEqual(firstEvent);
  });

  it("isolates incidents by customer/project", () => {
    const machine = createSupervisionMachine();
    machine.openIncident({
      ...maple,
      dedupeKey: "maple:only",
      severity: "FINANCIAL_RISK",
      category: "money",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "invoice",
      customerImpact: "Maple money question.",
      deadlineImpact: "none proven",
      financialImpact: "sandbox",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    machine.openIncident({
      ...harbor,
      dedupeKey: "harbor:only",
      severity: "DEADLINE_CRITICAL",
      category: "deadline",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "drop",
      customerImpact: "Harbor deadline question.",
      deadlineImpact: "at risk",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    const mapleOnly = machine.listIncidentsForCustomer(maple.customerId);
    const harborOnly = machine.listIncidentsForCustomer(harbor.customerId);
    expect(mapleOnly).toHaveLength(1);
    expect(harborOnly).toHaveLength(1);
    expect(mapleOnly[0]?.customerId).toBe(maple.customerId);
    expect(harborOnly[0]?.campaignId).toBe(harbor.campaignId);
    expect(mapleOnly[0]?.customerImpact).not.toContain("Harbor");
  });

  it("computes next-check time from severity cadence", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(nextCheckAt(now, "ROUTINE")).toBe(
      new Date(now.getTime() + NEXT_CHECK_INTERVAL_MS.ROUTINE).toISOString(),
    );
    expect(nextCheckAt(now, "SECURITY_SUSPECTED")).toBe(
      new Date(now.getTime() + NEXT_CHECK_INTERVAL_MS.SECURITY_SUSPECTED).toISOString(),
    );
    const machine = createSupervisionMachine({
      clock: createFrozenClock("2026-08-23T12:00:00.000Z"),
    });
    const incident = machine.openIncident({
      ...maple,
      dedupeKey: "maple:next-check",
      severity: "DEADLINE_CRITICAL",
      category: "deadline",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "proof",
      customerImpact: "Date risk.",
      deadlineImpact: "inside window",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    expect(incident.nextCheckAt).toBe(
      new Date(
        Date.parse("2026-08-23T12:00:00.000Z") + NEXT_CHECK_INTERVAL_MS.DEADLINE_CRITICAL,
      ).toISOString(),
    );
    expect(DEFAULT_HEARTBEAT_INTERVAL_MS).toBe(30_000);
    expect(DEFAULT_GRACE_MS).toBe(5_000);
  });

  it("does not create a second open incident for a duplicate signal", () => {
    const machine = createSupervisionMachine();
    const first = machine.openIncident({
      ...maple,
      dedupeKey: "maple:dup",
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
    const second = machine.openIncident({
      ...maple,
      dedupeKey: "maple:dup",
      severity: "FINANCIAL_RISK",
      category: "money",
      responsibleComponent: copyAgent(),
      failedOrStalledStep: "reconcile",
      customerImpact: "Money question again.",
      deadlineImpact: "held",
      financialImpact: "sandbox",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    });
    expect(second.incidentId).toBe(first.incidentId);
    expect(machine.listIncidentsForCustomer(maple.customerId)).toHaveLength(1);
    expect(second.history.some((event) => event.type === "duplicate_ignored")).toBe(true);
  });
});
