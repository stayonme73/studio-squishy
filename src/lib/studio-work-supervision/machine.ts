import { cloneJson, createSequenceIdFactory, createSystemClock, isoNow } from "./clock";
import {
  DEFAULT_GRACE_MS,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  UNCONNECTED_PROVIDER_PORTS,
  ifOwnerDoesNothingCopy,
  isSecuritySeverity,
  nextCheckAt,
  ownerMustBeInterrupted,
} from "./policy";
import type {
  Clock,
  HealthStatus,
  HeartbeatInput,
  IdFactory,
  IncidentEvent,
  IncidentSeverity,
  IncidentState,
  IssueLeaseInput,
  MachineIncident,
  OpenIncidentInput,
  OwnerActionId,
  RecoveryAttempt,
  SupervisionSnapshot,
  WorkLease,
} from "./types";

export type SupervisionMachine = {
  issueLease: (input: IssueLeaseInput) => WorkLease;
  recordHeartbeat: (input: HeartbeatInput) => { lease: WorkLease; ignored: boolean };
  markWaiting: (leaseId: string, reason: string) => WorkLease;
  markBlocked: (leaseId: string, code: string, detail: string) => WorkLease;
  completeFiniteWork: (leaseId: string) => WorkLease;
  evaluateLeases: () => WorkLease[];
  openIncident: (input: OpenIncidentInput) => MachineIncident;
  attemptRecovery: (
    incidentId: string,
    result: "success" | "failure",
    strategy: string,
    detail: string,
  ) => MachineIncident;
  applyOwnerAction: (incidentId: string, action: OwnerActionId, note: string) => MachineIncident;
  getLease: (leaseId: string) => WorkLease | undefined;
  getIncident: (incidentId: string) => MachineIncident | undefined;
  listIncidentsForCustomer: (customerId: string) => MachineIncident[];
  snapshot: () => SupervisionSnapshot;
};

function snapshotLease(lease: WorkLease): WorkLease {
  return cloneJson(lease);
}

function snapshotIncident(incident: MachineIncident): MachineIncident {
  return cloneJson(incident);
}

function pushHistory(
  incident: MachineIncident,
  ids: IdFactory,
  clock: Clock,
  type: string,
  actor: IncidentEvent["actor"],
  summary: string,
  payload: IncidentEvent["payload"] = {},
): void {
  incident.history.push({
    eventId: ids("evt"),
    at: isoNow(clock),
    type,
    actor,
    summary,
    payload,
  });
}

function computeState(incident: MachineIncident): IncidentState {
  const last = incident.history.at(-1);
  if (last?.type === "resolved") return "RESOLVED";

  const lastOwner = [...incident.history].reverse().find((event) => event.actor === "owner");
  if (lastOwner?.type === "owner_hold" || lastOwner?.type === "owner_request_more_information") {
    return "WAITING";
  }
  if (lastOwner?.type === "owner_approve_recovery") return "RECOVERING";
  if (incident.ownerEscalated) return "ESCALATED";

  const lastRecovery = [...incident.history]
    .reverse()
    .find((event) => event.type === "recovery_attempted");
  if (lastRecovery && lastRecovery.payload.result !== "success") return "RECOVERING";
  return "OPEN";
}

function refreshIncident(incident: MachineIncident, clock: Clock): void {
  incident.state = computeState(incident);
  incident.nextCheckAt = nextCheckAt(clock.now(), incident.severity);
  incident.ifOwnerDoesNothing = ifOwnerDoesNothingCopy(
    incident.severity,
    incident.nextCheckAt,
  );
}

function ownerDecisionFor(severity: IncidentSeverity): string {
  switch (severity) {
    case "SECURITY_SUSPECTED":
      return "Review containment, confirm whether this is a breach, and say who must be notified.";
    case "SECURITY_CONFIRMED":
      return "Direct the containment and notification path. Do not treat this as routine.";
    case "FINANCIAL_RISK":
      return "Decide the money action (hold, refund path, or release) with the evidence on this record.";
    case "DEADLINE_CRITICAL":
      return "Decide whether to change the promise date, add capacity, or tell the customer now.";
    case "RIGHTS_OR_COMPLIANCE_RISK":
      return "Decide whether work stays held and who must clear rights or compliance.";
    case "CUSTOMER_DELAY_RISK":
      return "Decide whether the customer should be told, and whether scope or timeline must change.";
    default:
      return "Review the failed recovery and decide whether to retry, reassign, or stop this work.";
  }
}

function contactFor(severity: IncidentSeverity): string {
  if (isSecuritySeverity(severity)) return "Owner immediately; do not use playful channels.";
  if (severity === "FINANCIAL_RISK") return "Owner; finance path if money movement is required.";
  if (severity === "RIGHTS_OR_COMPLIANCE_RISK") {
    return "Owner; rights/compliance reviewer if named.";
  }
  if (severity === "DEADLINE_CRITICAL" || severity === "CUSTOMER_DELAY_RISK") {
    return "Owner if recovery failed; otherwise the Machine continues recovery.";
  }
  return "none — routine recovery stays with the Machine";
}

function computeHealth(lease: WorkLease, now: Date): HealthStatus {
  if (!lease.coverageConnected) return "COVERAGE_NOT_CONNECTED";
  if (lease.completedAt) return "COMPLETE";
  const staleAfter =
    Date.parse(lease.lastHeartbeatAt) + lease.heartbeatIntervalMs + lease.graceMs;
  const stale = now.getTime() > staleAfter;
  if (lease.kind === "LONG_RUNNING_SERVICE") {
    return stale ? "STALLED" : "SERVICE_AWAKE";
  }
  if (lease.blocker) return stale ? "STALLED" : "BLOCKED";
  if (lease.waitingReason) return stale ? "STALLED" : "WAITING";
  return stale ? "STALLED" : "ACTIVE";
}

function defaultsForLease(lease: WorkLease): Pick<
  OpenIncidentInput,
  | "severity"
  | "category"
  | "customerImpact"
  | "deadlineImpact"
  | "financialImpact"
  | "rightsOrComplianceImpact"
  | "securityOrBreachImpact"
  | "failedOrStalledStep"
  | "dedupeKey"
> {
  if (!lease.coverageConnected) {
    return {
      severity: "ROUTINE",
      category: "provider",
      dedupeKey: `${lease.leaseId}:coverage_not_connected`,
      failedOrStalledStep: lease.step,
      customerImpact: "Coverage is not connected. Status must not display as healthy.",
      deadlineImpact: "Unknown until coverage is connected.",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    };
  }
  if (lease.kind === "LONG_RUNNING_SERVICE") {
    return {
      severity: "ROUTINE",
      category: "process",
      dedupeKey: `${lease.leaseId}:dead_service`,
      failedOrStalledStep: lease.step,
      customerImpact: "A long-running Studio service stopped heartbeating.",
      deadlineImpact: "Service outage may delay work that depends on this service.",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    };
  }
  if (lease.blocker) {
    return {
      severity: "CUSTOMER_DELAY_RISK",
      category: "process",
      dedupeKey: `${lease.leaseId}:blocked:${lease.blocker.code}`,
      failedOrStalledStep: lease.step,
      customerImpact: `Work is blocked: ${lease.blocker.detail}`,
      deadlineImpact: "Delay possible while the blocker remains.",
      financialImpact: "none proven",
      rightsOrComplianceImpact: "none proven",
      securityOrBreachImpact: "none proven",
    };
  }
  return {
    severity: "ROUTINE",
    category: "agent",
    dedupeKey: `${lease.leaseId}:stale_heartbeat`,
    failedOrStalledStep: lease.step,
    customerImpact: "Finite work missed its heartbeat while it was expected to be active.",
    deadlineImpact: "Delay possible if the stall continues.",
    financialImpact: "none proven",
    rightsOrComplianceImpact: "none proven",
    securityOrBreachImpact: "none proven",
  };
}

function ownerHistoryType(action: OwnerActionId): string {
  switch (action) {
    case "acknowledge":
      return "owner_acknowledge";
    case "hold":
      return "owner_hold";
    case "approve_recovery":
      return "owner_approve_recovery";
    case "request_more_information":
      return "owner_request_more_information";
    case "resolve":
      return "resolved";
  }
}

export function createSupervisionMachine(options?: {
  clock?: Clock;
  ids?: IdFactory;
}): SupervisionMachine {
  const clock = options?.clock ?? createSystemClock();
  const ids = options?.ids ?? createSequenceIdFactory();
  const leases = new Map<string, WorkLease>();
  const incidents = new Map<string, MachineIncident>();
  const seenHeartbeatKeys = new Set<string>();

  function requireLease(leaseId: string): WorkLease {
    const lease = leases.get(leaseId);
    if (!lease) throw new Error(`Unknown lease ${leaseId}`);
    return lease;
  }

  function requireIncident(incidentId: string): MachineIncident {
    const incident = incidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident ${incidentId}`);
    return incident;
  }

  const machine: SupervisionMachine = {
    issueLease(input) {
      const now = isoNow(clock);
      const coverageConnected = input.coverageConnected ?? true;
      const kind = input.kind;
      const lease: WorkLease = {
        leaseId: input.leaseId ?? ids("lease"),
        kind,
        coverageConnected,
        subject: { ...input.subject },
        customerId: input.customerId,
        customerLabel: input.customerLabel,
        projectId: input.projectId,
        campaignId: input.campaignId,
        step: input.step,
        heartbeatIntervalMs: input.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
        graceMs: input.graceMs ?? DEFAULT_GRACE_MS,
        issuedAt: now,
        lastHeartbeatAt: now,
        lastHealthyAt: coverageConnected ? now : null,
        expectedCompletionAt: input.expectedCompletionAt ?? null,
        completedAt: null,
        blocker: null,
        waitingReason: null,
        health: coverageConnected
          ? kind === "LONG_RUNNING_SERVICE"
            ? "SERVICE_AWAKE"
            : "ACTIVE"
          : "COVERAGE_NOT_CONNECTED",
        openIncidentId: null,
      };
      leases.set(lease.leaseId, lease);
      return snapshotLease(lease);
    },

    recordHeartbeat(input) {
      const key = `${input.leaseId}:${input.idempotencyKey}`;
      const lease = requireLease(input.leaseId);
      if (seenHeartbeatKeys.has(key)) {
        return { lease: snapshotLease(lease), ignored: true };
      }
      seenHeartbeatKeys.add(key);
      const at = input.at ?? isoNow(clock);
      lease.lastHeartbeatAt = at;
      if (lease.coverageConnected && !lease.blocker && !lease.waitingReason && !lease.completedAt) {
        lease.lastHealthyAt = at;
        lease.health = lease.kind === "LONG_RUNNING_SERVICE" ? "SERVICE_AWAKE" : "ACTIVE";
      }
      if (lease.openIncidentId) {
        const incident = incidents.get(lease.openIncidentId);
        if (incident && incident.state !== "RESOLVED") {
          incident.lastHeartbeatAt = at;
          if (lease.lastHealthyAt) incident.lastHealthyAt = lease.lastHealthyAt;
          pushHistory(
            incident,
            ids,
            clock,
            "heartbeat_recorded",
            "worker",
            "Worker heartbeat recorded.",
            { leaseId: lease.leaseId, idempotencyKey: input.idempotencyKey },
          );
        }
      }
      return { lease: snapshotLease(lease), ignored: false };
    },

    markWaiting(leaseId, reason) {
      const lease = requireLease(leaseId);
      lease.waitingReason = reason;
      lease.blocker = null;
      lease.health = "WAITING";
      return snapshotLease(lease);
    },

    markBlocked(leaseId, code, detail) {
      const lease = requireLease(leaseId);
      lease.blocker = { code, detail };
      lease.waitingReason = null;
      lease.health = "BLOCKED";
      return snapshotLease(lease);
    },

    completeFiniteWork(leaseId) {
      const lease = requireLease(leaseId);
      if (lease.kind !== "FINITE_WORK") {
        throw new Error("Only finite work can complete.");
      }
      const now = isoNow(clock);
      lease.completedAt = now;
      lease.lastHealthyAt = now;
      lease.lastHeartbeatAt = now;
      lease.blocker = null;
      lease.waitingReason = null;
      lease.health = "COMPLETE";
      if (lease.openIncidentId) {
        const incident = incidents.get(lease.openIncidentId);
        if (incident && incident.severity === "ROUTINE" && incident.state !== "RESOLVED") {
          pushHistory(
            incident,
            ids,
            clock,
            "resolved",
            "machine",
            "Finite work completed. Routine incident closed.",
            { leaseId },
          );
          incident.ownerEscalated = false;
          incident.ownerDecisionRequired = "none";
          refreshIncident(incident, clock);
          lease.openIncidentId = null;
        }
      }
      return snapshotLease(lease);
    },

    evaluateLeases() {
      const now = clock.now();
      for (const lease of leases.values()) {
        lease.health = computeHealth(lease, now);
        const shouldOpen =
          lease.health === "STALLED" ||
          lease.health === "BLOCKED" ||
          lease.health === "COVERAGE_NOT_CONNECTED";
        if (!shouldOpen) continue;
        const defaults = defaultsForLease(lease);
        const incident = machine.openIncident({
          ...defaults,
          leaseId: lease.leaseId,
          customerId: lease.customerId,
          customerLabel: lease.customerLabel,
          projectId: lease.projectId,
          campaignId: lease.campaignId,
          responsibleComponent: lease.subject,
          lastHealthyAt: lease.lastHealthyAt ?? lease.issuedAt,
          lastHeartbeatAt: lease.lastHeartbeatAt,
          containmentPerformed:
            lease.health === "COVERAGE_NOT_CONNECTED"
              ? "Unconnected provider hidden from healthy display."
              : "Machine isolated the lease; worker cannot self-certify health.",
        });
        lease.openIncidentId = incident.incidentId;
      }
      return [...leases.values()].map(snapshotLease);
    },

    openIncident(input) {
      const existing = [...incidents.values()].find(
        (row) =>
          row.dedupeKey === input.dedupeKey &&
          row.customerId === input.customerId &&
          row.state !== "RESOLVED",
      );
      if (existing) {
        pushHistory(
          existing,
          ids,
          clock,
          "duplicate_ignored",
          "machine",
          "Duplicate incident signal ignored; existing record kept.",
          { dedupeKey: input.dedupeKey },
        );
        return snapshotIncident(existing);
      }

      const now = isoNow(clock);
      const severity = input.severity;
      const escalateNow = ownerMustBeInterrupted({
        severity,
        recoveryFailed: false,
        ownerJudgmentRequired: severity !== "ROUTINE" && severity !== "CUSTOMER_DELAY_RISK",
      });
      const incident: MachineIncident = {
        incidentId: input.incidentId ?? ids("inc"),
        dedupeKey: input.dedupeKey,
        leaseId: input.leaseId ?? null,
        customerId: input.customerId,
        customerLabel: input.customerLabel,
        projectId: input.projectId,
        campaignId: input.campaignId,
        severity,
        category: input.category,
        responsibleComponent: { ...input.responsibleComponent },
        failedOrStalledStep: input.failedOrStalledStep,
        startedAt: now,
        lastHealthyAt: input.lastHealthyAt ?? now,
        lastHeartbeatAt: input.lastHeartbeatAt ?? now,
        customerImpact: input.customerImpact,
        deadlineImpact: input.deadlineImpact,
        financialImpact: input.financialImpact,
        rightsOrComplianceImpact: input.rightsOrComplianceImpact,
        securityOrBreachImpact: input.securityOrBreachImpact,
        containmentPerformed:
          input.containmentPerformed ??
          (isSecuritySeverity(severity)
            ? "Suspected security path isolated. Playful presentation disabled. No breach confirmed without evidence."
            : "none yet"),
        recoveryAttempts: [],
        currentResponsibleParty: input.currentResponsibleParty ?? "Machine",
        whoMustBeContacted: input.whoMustBeContacted ?? contactFor(severity),
        ownerDecisionRequired:
          input.ownerDecisionRequired ?? (escalateNow ? ownerDecisionFor(severity) : "none"),
        nextAutomaticAction: escalateNow
          ? "Hold the incident on the Owner desk and recheck on schedule."
          : "Attempt routine recovery without paging Tagia.",
        nextCheckAt: nextCheckAt(clock.now(), severity),
        ifOwnerDoesNothing: "",
        evidence: input.evidence ? cloneJson(input.evidence) : [],
        history: [],
        state: "OPEN",
        ownerEscalated: escalateNow,
      };
      pushHistory(incident, ids, clock, "incident_opened", "machine", "Incident opened by the Machine.", {
        severity,
        dedupeKey: input.dedupeKey,
      });
      if (escalateNow) {
        pushHistory(
          incident,
          ids,
          clock,
          "owner_escalated",
          "machine",
          "Owner interruption required by severity and escalation rules.",
          { severity },
        );
      }
      refreshIncident(incident, clock);
      incidents.set(incident.incidentId, incident);
      return snapshotIncident(incident);
    },

    attemptRecovery(incidentId, result, strategy, detail) {
      const incident = requireIncident(incidentId);
      if (incident.state === "RESOLVED") {
        throw new Error("Cannot recover a resolved incident.");
      }
      const attempt: RecoveryAttempt = {
        attemptId: ids("rec"),
        at: isoNow(clock),
        strategy,
        result,
        detail,
      };
      incident.recoveryAttempts.push(attempt);
      pushHistory(
        incident,
        ids,
        clock,
        "recovery_attempted",
        "machine",
        `Recovery ${result}: ${strategy}`,
        { result, strategy },
      );
      const escalate = ownerMustBeInterrupted({
        severity: incident.severity,
        recoveryFailed: result === "failure",
        ownerJudgmentRequired: incident.ownerDecisionRequired !== "none",
      });
      if (result === "success" && incident.severity === "ROUTINE" && !escalate) {
        pushHistory(
          incident,
          ids,
          clock,
          "resolved",
          "machine",
          "Routine recovery succeeded. Owner was not interrupted.",
          { strategy },
        );
        incident.ownerEscalated = false;
        incident.ownerDecisionRequired = "none";
        incident.currentResponsibleParty = "Machine";
        incident.nextAutomaticAction = "None. Incident is resolved. History is preserved.";
        if (incident.leaseId) {
          const lease = leases.get(incident.leaseId);
          if (lease) lease.openIncidentId = null;
        }
      } else if (result === "failure") {
        incident.ownerEscalated = true;
        incident.currentResponsibleParty = "Owner";
        incident.ownerDecisionRequired = ownerDecisionFor(incident.severity);
        incident.whoMustBeContacted = contactFor(incident.severity);
        incident.nextAutomaticAction =
          "Wait for Owner action. Recheck on schedule if Tagia does nothing.";
        pushHistory(
          incident,
          ids,
          clock,
          "owner_escalated",
          "machine",
          "Recovery failed. Complete Owner incident is on the desk.",
          { strategy },
        );
      }
      refreshIncident(incident, clock);
      return snapshotIncident(incident);
    },

    applyOwnerAction(incidentId, action, note) {
      const incident = requireIncident(incidentId);
      if (!incident.ownerEscalated && incident.severity === "ROUTINE") {
        throw new Error("Owner controls are not authorized on unescalated routine incidents.");
      }
      pushHistory(incident, ids, clock, ownerHistoryType(action), "owner", note, { action });
      if (action === "resolve") {
        incident.currentResponsibleParty = "Owner";
        incident.nextAutomaticAction = "None. Owner resolved. History is preserved.";
      }
      if (action === "hold") {
        incident.currentResponsibleParty = "Owner";
        incident.nextAutomaticAction = "Remain on hold until Owner releases or the next check.";
      }
      if (action === "approve_recovery") {
        incident.currentResponsibleParty = "Machine";
        incident.nextAutomaticAction = "Run the Owner-approved recovery path.";
      }
      if (action === "request_more_information") {
        incident.currentResponsibleParty = "Machine";
        incident.nextAutomaticAction =
          "Collect the requested information and return to the Owner desk.";
      }
      refreshIncident(incident, clock);
      return snapshotIncident(incident);
    },

    getLease(leaseId) {
      const lease = leases.get(leaseId);
      return lease ? snapshotLease(lease) : undefined;
    },

    getIncident(incidentId) {
      const incident = incidents.get(incidentId);
      return incident ? snapshotIncident(incident) : undefined;
    },

    listIncidentsForCustomer(customerId) {
      return [...incidents.values()]
        .filter((incident) => incident.customerId === customerId)
        .map(snapshotIncident);
    },

    snapshot() {
      return {
        leases: [...leases.values()].map(snapshotLease),
        incidents: [...incidents.values()].map(snapshotIncident),
        providers: cloneJson([...UNCONNECTED_PROVIDER_PORTS]),
      };
    },
  };

  return machine;
}
