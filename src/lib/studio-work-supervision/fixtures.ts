import { createFrozenClock } from "./clock";
import { createSupervisionMachine, type SupervisionMachine } from "./machine";
import { UNCONNECTED_PROVIDER_PORTS } from "./policy";
import type { MachineIncident, SupervisionSnapshot, WorkLease } from "./types";

const FIXTURE_NOW = "2026-08-23T12:00:00.000Z";

const maple = {
  customerId: "cust_fixture_maple",
  customerLabel: "Maple & Pine Books (fixture)",
  projectId: "proj_fixture_maple_launch",
  campaignId: "camp_fixture_maple_launch",
};

const harbor = {
  customerId: "cust_fixture_harbor",
  customerLabel: "Harbor Lantern Co. (fixture)",
  projectId: "proj_fixture_harbor_spring",
  campaignId: "camp_fixture_harbor_spring",
};

function agent(id: string, label: string) {
  return { kind: "agent" as const, id, label };
}

export type FoundationFixturePack = {
  clock: ReturnType<typeof createFrozenClock>;
  machine: SupervisionMachine;
  snapshot: SupervisionSnapshot;
  healthyFinite: WorkLease;
  healthyService: WorkLease;
  staleIncident: MachineIncident;
  deadServiceIncident: MachineIncident;
  blockedIncident: MachineIncident;
  recoveredRoutine: MachineIncident;
  failedRecovery: MachineIncident;
  deadlineIncident: MachineIncident;
  financialIncident: MachineIncident;
  rightsIncident: MachineIncident;
  securityIncident: MachineIncident;
  unconnectedLease: WorkLease;
};

export function buildFoundationFixturePack(): FoundationFixturePack {
  const clock = createFrozenClock(FIXTURE_NOW);
  const machine = createSupervisionMachine({ clock });

  const healthyFinite = machine.issueLease({
    leaseId: "lease_fixture_finite_healthy",
    kind: "FINITE_WORK",
    ...maple,
    subject: agent("agent_copy", "Copy agent (fixture)"),
    step: "draft_homepage_headline",
  });
  machine.recordHeartbeat({
    leaseId: healthyFinite.leaseId,
    idempotencyKey: "hb-finite-1",
  });

  const healthyService = machine.issueLease({
    leaseId: "lease_fixture_service_healthy",
    kind: "LONG_RUNNING_SERVICE",
    ...maple,
    subject: { kind: "service", id: "svc_intake_watch", label: "Intake watch (fixture)" },
    step: "listen_for_intake_files",
  });
  machine.recordHeartbeat({
    leaseId: healthyService.leaseId,
    idempotencyKey: "hb-service-1",
  });

  const staleLease = machine.issueLease({
    leaseId: "lease_fixture_stale",
    kind: "FINITE_WORK",
    heartbeatIntervalMs: 30_000,
    graceMs: 5_000,
    ...maple,
    subject: agent("agent_layout", "Layout agent (fixture)"),
    step: "assemble_social_set",
  });
  const deadLease = machine.issueLease({
    leaseId: "lease_fixture_dead_service",
    kind: "LONG_RUNNING_SERVICE",
    heartbeatIntervalMs: 30_000,
    graceMs: 5_000,
    ...harbor,
    subject: { kind: "service", id: "svc_render", label: "Render service (fixture)" },
    step: "keep_renderer_awake",
  });
  const blockedLease = machine.issueLease({
    leaseId: "lease_fixture_blocked",
    kind: "FINITE_WORK",
    ...harbor,
    subject: agent("agent_print", "Print agent (fixture)"),
    step: "send_to_print_vendor",
  });
  machine.markBlocked(
    blockedLease.leaseId,
    "vendor_api_unreachable",
    "Print vendor API returned connection refused.",
  );

  const unconnectedLease = machine.issueLease({
    leaseId: "lease_fixture_unconnected",
    kind: "LONG_RUNNING_SERVICE",
    coverageConnected: false,
    ...maple,
    subject: { kind: "provider", id: "claude", label: "Claude verifier" },
    step: "verify_incident",
  });

  const recoverLease = machine.issueLease({
    leaseId: "lease_fixture_recover",
    kind: "FINITE_WORK",
    heartbeatIntervalMs: 30_000,
    graceMs: 5_000,
    ...maple,
    subject: agent("agent_qa", "QA agent (fixture)"),
    step: "proofread_email",
  });
  const failLease = machine.issueLease({
    leaseId: "lease_fixture_fail",
    kind: "FINITE_WORK",
    heartbeatIntervalMs: 30_000,
    graceMs: 5_000,
    ...harbor,
    subject: agent("agent_ship", "Ship agent (fixture)"),
    step: "upload_final_files",
  });

  clock.advanceMs(40_000);
  machine.evaluateLeases();

  const staleIncident = machine.getIncident(
    machine.getLease(staleLease.leaseId)!.openIncidentId!,
  )!;
  const deadServiceIncident = machine.getIncident(
    machine.getLease(deadLease.leaseId)!.openIncidentId!,
  )!;
  const blockedIncident = machine.getIncident(
    machine.getLease(blockedLease.leaseId)!.openIncidentId!,
  )!;
  const recoveredRoutine = machine.attemptRecovery(
    machine.getLease(recoverLease.leaseId)!.openIncidentId!,
    "success",
    "reissue_lease",
    "Worker resumed and heartbeat returned.",
  );
  const failedRecovery = machine.attemptRecovery(
    machine.getLease(failLease.leaseId)!.openIncidentId!,
    "failure",
    "retry_upload",
    "Upload host still refused the connection.",
  );

  const deadlineIncident = machine.openIncident({
    incidentId: "inc_fixture_deadline",
    dedupeKey: "harbor:deadline:spring-mailer",
    ...harbor,
    severity: "DEADLINE_CRITICAL",
    category: "deadline",
    responsibleComponent: agent("agent_mailer", "Mailer agent (fixture)"),
    failedOrStalledStep: "approve_print_proof_before_drop_date",
    customerImpact: "Spring mailer may miss the promised drop date.",
    deadlineImpact: "Promised date is inside the remaining production window.",
    financialImpact: "Reprint cost possible if the drop is missed.",
    rightsOrComplianceImpact: "none proven",
    securityOrBreachImpact: "none proven",
  });
  const financialIncident = machine.openIncident({
    incidentId: "inc_fixture_financial",
    dedupeKey: "harbor:money:duplicate-charge-signal",
    ...harbor,
    severity: "FINANCIAL_RISK",
    category: "money",
    responsibleComponent: { kind: "workflow", id: "wf_checkout", label: "Checkout workflow (fixture)" },
    failedOrStalledStep: "reconcile_sandbox_payment",
    customerImpact: "Payment truth is uncertain on this fixture campaign.",
    deadlineImpact: "Work is held until money truth is clear.",
    financialImpact: "Possible duplicate sandbox charge; not live money.",
    rightsOrComplianceImpact: "none proven",
    securityOrBreachImpact: "none proven",
  });
  const rightsIncident = machine.openIncident({
    incidentId: "inc_fixture_rights",
    dedupeKey: "maple:rights:likeness-hold",
    ...maple,
    severity: "RIGHTS_OR_COMPLIANCE_RISK",
    category: "rights",
    responsibleComponent: { kind: "workflow", id: "wf_rights", label: "Rights hold workflow (fixture)" },
    failedOrStalledStep: "clear_external_likeness",
    customerImpact: "A likeness cannot be used until rights are cleared.",
    deadlineImpact: "Design is held on that asset.",
    financialImpact: "none proven",
    rightsOrComplianceImpact: "Likeness hold — Owner judgment required.",
    securityOrBreachImpact: "none proven",
  });
  const securityIncident = machine.openIncident({
    incidentId: "inc_fixture_security",
    dedupeKey: "maple:security:suspected-session",
    ...maple,
    severity: "SECURITY_SUSPECTED",
    category: "security",
    responsibleComponent: { kind: "service", id: "svc_session", label: "Session service (fixture)" },
    failedOrStalledStep: "review_unexpected_session_spike",
    customerImpact:
      "Session anomaly on a fixture campaign. No customer data was exposed in this drill.",
    deadlineImpact: "Related work is paused pending containment review.",
    financialImpact: "none proven",
    rightsOrComplianceImpact: "none proven",
    securityOrBreachImpact: "Suspected — not confirmed. Drill only. No real breach.",
    evidence: [
      {
        id: "ev_fixture_security_1",
        kind: "fixture",
        summary: "Controlled drill: unexpected session count in fixture store.",
        recordedAt: FIXTURE_NOW,
      },
    ],
  });

  return {
    clock,
    machine,
    snapshot: machine.snapshot(),
    healthyFinite: machine.getLease(healthyFinite.leaseId)!,
    healthyService: machine.getLease(healthyService.leaseId)!,
    staleIncident,
    deadServiceIncident,
    blockedIncident,
    recoveredRoutine,
    failedRecovery,
    deadlineIncident,
    financialIncident,
    rightsIncident,
    securityIncident,
    unconnectedLease: machine.getLease(unconnectedLease.leaseId)!,
  };
}

export function unconnectedProviderStatus() {
  return [...UNCONNECTED_PROVIDER_PORTS];
}
