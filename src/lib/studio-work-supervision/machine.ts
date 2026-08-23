import { studioWorkSupervisionAndIncidentEscalationV1 as cfg } from "@/config/studio-work-supervision-and-incident-escalation-v1";

import { cloneJson, createSequenceIdFactory, createSystemClock, isoNow } from "./clock";
import {
  AUTHORIZED_ROUTINE_RECOVERY_STRATEGY,
  DEFAULT_GRACE_MS,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  ROUTINE_RECOVERY_WINDOW_MS,
  UNCONNECTED_PROVIDER_PORTS,
  ifOwnerDoesNothingCopy,
  isSecuritySeverity,
  isUnconnectedProviderId,
  nextCheckAt,
  ownerMustBeInterrupted,
  routineRecoveryAuthorized,
} from "./policy";
import type {
  AssignedWorker,
  Clock,
  HealthStatus,
  HeartbeatInput,
  IdFactory,
  IncidentEvent,
  IncidentSeverity,
  IncidentState,
  IssueLeaseInput,
  LeaseMismatch,
  MachineIncident,
  OpenIncidentInput,
  OwnerActionId,
  RecoveryAttempt,
  SupervisionSnapshot,
  SweepResult,
  WorkLease,
} from "./types";
import { SupervisionIsolationError, UnknownLeaseError } from "./types";

export type SupervisionMachine = {
  issueLease: (input: IssueLeaseInput) => WorkLease;
  registerWorker: (input: IssueLeaseInput) => WorkLease;
  recordHeartbeat: (input: HeartbeatInput) => { lease: WorkLease; ignored: boolean };
  markWaiting: (leaseId: string, reason: string) => WorkLease;
  markBlocked: (leaseId: string, code: string, detail: string) => WorkLease;
  completeFiniteWork: (leaseId: string) => WorkLease;
  evaluateLeases: () => WorkLease[];
  sweep: () => SweepResult;
  openIncident: (input: OpenIncidentInput) => MachineIncident;
  attemptRecovery: (
    incidentId: string,
    result: "pending" | "success" | "failure",
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
    incident.ownerEscalated,
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

function contactFor(severity: IncidentSeverity, recoveryFailed = false): string {
  if (isSecuritySeverity(severity)) return "Owner immediately; do not use playful channels.";
  if (severity === "FINANCIAL_RISK") return "Owner; finance path if money movement is required.";
  if (severity === "RIGHTS_OR_COMPLIANCE_RISK") {
    return "Owner; rights/compliance reviewer if named.";
  }
  if (severity === "DEADLINE_CRITICAL" || severity === "CUSTOMER_DELAY_RISK") {
    return "Owner if recovery failed; otherwise the Machine continues recovery.";
  }
  if (recoveryFailed) return "Owner. Authorized routine recovery failed.";
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

function assignedWorkerFrom(input: IssueLeaseInput): AssignedWorker {
  if (input.assignedWorker) return { ...input.assignedWorker };
  return {
    providerId: input.subject.kind === "provider" ? input.subject.id : "fixture",
    workerId: input.subject.id,
    label: input.subject.label,
  };
}

function coverageFor(input: IssueLeaseInput, worker: AssignedWorker): boolean {
  if (isUnconnectedProviderId(input.subject.id) || isUnconnectedProviderId(worker.providerId)) {
    return false;
  }
  return input.coverageConnected ?? true;
}

function detectMismatch(lease: WorkLease, input: HeartbeatInput): LeaseMismatch | null {
  const reportedBranch = input.branch ?? null;
  const reportedCommit = input.commit ?? null;
  if (reportedBranch == null && reportedCommit == null) return null;
  const branchMismatch =
    reportedBranch != null && lease.branch != null && reportedBranch !== lease.branch;
  const commitMismatch =
    reportedCommit != null && lease.commit != null && reportedCommit !== lease.commit;
  if (!branchMismatch && !commitMismatch) return null;
  return {
    code: "branch_commit_mismatch",
    expectedBranch: lease.branch,
    expectedCommit: lease.commit,
    reportedBranch,
    reportedCommit,
    detail: `Worker reported branch ${reportedBranch ?? "(none)"} commit ${reportedCommit ?? "(none)"}; lease expects branch ${lease.branch ?? "(none)"} commit ${lease.commit ?? "(none)"}.`,
  };
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
  if (lease.mismatch) {
    return {
      severity: "CUSTOMER_DELAY_RISK",
      category: "process",
      dedupeKey: `${lease.leaseId}:branch_commit_mismatch`,
      failedOrStalledStep: lease.step,
      customerImpact: `Worker is on the wrong branch or commit. ${lease.mismatch.detail}`,
      deadlineImpact: "Delay possible until the worker matches the assigned lease.",
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
    if (!lease) throw new UnknownLeaseError(leaseId);
    return lease;
  }

  function requireIncident(incidentId: string): MachineIncident {
    const incident = incidents.get(incidentId);
    if (!incident) throw new Error(`Unknown incident ${incidentId}`);
    return incident;
  }

  function openLeaseIncident(lease: WorkLease, extra?: Partial<OpenIncidentInput>): MachineIncident {
    const defaults = defaultsForLease(lease);
    const incident = machine.openIncident({
      ...defaults,
      ...extra,
      leaseId: lease.leaseId,
      customerId: lease.customerId,
      customerLabel: lease.customerLabel,
      projectId: lease.projectId,
      campaignId: lease.campaignId,
      responsibleComponent: lease.subject,
      lastHealthyAt: extra?.lastHealthyAt ?? lease.lastHealthyAt ?? lease.issuedAt,
      lastHeartbeatAt: extra?.lastHeartbeatAt ?? lease.lastHeartbeatAt,
      containmentPerformed:
        extra?.containmentPerformed ??
        (lease.health === "COVERAGE_NOT_CONNECTED"
          ? "Unconnected provider hidden from healthy display."
          : "Machine isolated the lease; worker cannot self-certify health."),
    });
    lease.openIncidentId = incident.incidentId;
    return incident;
  }

  function applyComputedHealth(lease: WorkLease, at: string): void {
    lease.health = computeHealth(lease, new Date(at));
    if (lease.health === "ACTIVE" || lease.health === "SERVICE_AWAKE" || lease.health === "COMPLETE") {
      lease.lastHealthyAt = at;
    }
  }

  const machine: SupervisionMachine = {
    issueLease(input) {
      const now = isoNow(clock);
      const worker = assignedWorkerFrom(input);
      const coverageConnected = coverageFor(input, worker);
      const kind = input.kind;
      const heartbeatIntervalMs = input.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
      const graceMs = input.graceMs ?? DEFAULT_GRACE_MS;
      const lease: WorkLease = {
        leaseId: input.leaseId ?? ids("lease"),
        kind,
        coverageConnected,
        subject: { ...input.subject },
        assignedWorker: worker,
        packageId: input.packageId ?? cfg.packageId,
        branch: input.branch ?? null,
        commit: input.commit ?? null,
        customerId: input.customerId,
        customerLabel: input.customerLabel,
        projectId: input.projectId,
        campaignId: input.campaignId,
        step: input.step,
        heartbeatIntervalMs,
        graceMs,
        issuedAt: now,
        lastHeartbeatAt: now,
        lastHealthyAt: coverageConnected ? now : null,
        expectedCompletionAt: input.expectedCompletionAt ?? null,
        expectedUpdateAt:
          input.expectedUpdateAt ??
          new Date(Date.parse(now) + heartbeatIntervalMs).toISOString(),
        completedAt: null,
        blocker: null,
        waitingReason: null,
        reportedStatus: null,
        mismatch: null,
        evidence: [],
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

    registerWorker(input) {
      return machine.issueLease(input);
    },

    recordHeartbeat(input) {
      const key = `${input.leaseId}:${input.idempotencyKey}`;
      const lease = requireLease(input.leaseId);
      if (input.customerId && input.customerId !== lease.customerId) {
        throw new SupervisionIsolationError(
          "Heartbeat customer does not match the lease.",
        );
      }
      if (input.projectId && input.projectId !== lease.projectId) {
        throw new SupervisionIsolationError(
          "Heartbeat project does not match the lease.",
        );
      }
      if (seenHeartbeatKeys.has(key)) {
        return { lease: snapshotLease(lease), ignored: true };
      }
      seenHeartbeatKeys.add(key);
      const at = input.at ?? isoNow(clock);
      lease.lastHeartbeatAt = at;
      lease.expectedUpdateAt = new Date(
        Date.parse(at) + lease.heartbeatIntervalMs,
      ).toISOString();
      if (input.reportedStatus) lease.reportedStatus = input.reportedStatus;
      const mismatch = detectMismatch(lease, input);
      if (mismatch) lease.mismatch = mismatch;
      if (input.evidenceSummary) {
        lease.evidence.push({
          id: ids("ev"),
          kind: "heartbeat",
          summary: input.evidenceSummary,
          recordedAt: at,
        });
      }

      if (input.reportedStatus === "waiting_for_owner") {
        lease.waitingReason =
          input.waitingReason ?? "Worker reported waiting for Owner.";
        lease.blocker = null;
      } else if (input.reportedStatus === "blocked") {
        lease.blocker = input.blocker ?? {
          code: "worker_reported_blocked",
          detail: input.evidenceSummary ?? "Worker reported blocked work.",
        };
        lease.waitingReason = null;
      } else if (
        input.reportedStatus === "working" ||
        input.reportedStatus === "service_awake"
      ) {
        lease.waitingReason = null;
        lease.blocker = null;
      } else if (input.reportedStatus === "complete" && lease.kind === "FINITE_WORK") {
        lease.waitingReason = null;
        lease.blocker = null;
        lease.completedAt = at;
      }

      applyComputedHealth(lease, at);

      if (lease.openIncidentId) {
        const incident = incidents.get(lease.openIncidentId);
        if (incident && incident.state !== "RESOLVED") {
          incident.lastHeartbeatAt = at;
          if (lease.lastHealthyAt) incident.lastHealthyAt = lease.lastHealthyAt;
          if (input.evidenceSummary) {
            incident.evidence.push({
              id: ids("ev"),
              kind: "heartbeat",
              summary: input.evidenceSummary,
              recordedAt: at,
            });
          }
          pushHistory(
            incident,
            ids,
            clock,
            "heartbeat_recorded",
            "worker",
            "Worker heartbeat recorded. Machine recomputed health.",
            {
              leaseId: lease.leaseId,
              idempotencyKey: input.idempotencyKey,
              reportedStatus: input.reportedStatus ?? "",
              health: lease.health,
            },
          );
        }
      }
      return { lease: snapshotLease(lease), ignored: false };
    },

    markWaiting(leaseId, reason) {
      const lease = requireLease(leaseId);
      lease.waitingReason = reason;
      lease.blocker = null;
      lease.reportedStatus = "waiting_for_owner";
      lease.health = computeHealth(lease, clock.now());
      return snapshotLease(lease);
    },

    markBlocked(leaseId, code, detail) {
      const lease = requireLease(leaseId);
      lease.blocker = { code, detail };
      lease.waitingReason = null;
      lease.reportedStatus = "blocked";
      lease.health = computeHealth(lease, clock.now());
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
      lease.reportedStatus = "complete";
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
          lease.health === "COVERAGE_NOT_CONNECTED" ||
          Boolean(lease.mismatch);
        const alreadyOpen =
          lease.openIncidentId &&
          incidents.get(lease.openIncidentId)?.state !== "RESOLVED";
        if (!shouldOpen || alreadyOpen) continue;
        openLeaseIncident(lease, {
          ownerDecisionRequired: lease.mismatch
            ? "Confirm the worker is on the assigned branch and commit, or reassign the lease."
            : undefined,
        });
      }
      return [...leases.values()].map(snapshotLease);
    },

    sweep() {
      const now = clock.now();
      const evaluatedAt = now.toISOString();
      const incidentsOpenedOrUpdated = new Set<string>();
      const recoveries: SweepResult["recoveries"] = [];
      const overdueNextChecks: string[] = [];
      const mismatches: string[] = [];

      machine.evaluateLeases();

      for (const lease of leases.values()) {
        if (lease.mismatch) mismatches.push(lease.leaseId);
        if (lease.openIncidentId) incidentsOpenedOrUpdated.add(lease.openIncidentId);
      }

      for (const incident of incidents.values()) {
        if (incident.state === "RESOLVED") continue;
        if (Date.parse(incident.nextCheckAt) < now.getTime()) {
          overdueNextChecks.push(incident.incidentId);
          pushHistory(
            incident,
            ids,
            clock,
            "overdue_next_check",
            "machine",
            "Next check was overdue. Machine evaluated the lease again.",
            { nextCheckAt: incident.nextCheckAt },
          );
          refreshIncident(incident, clock);
          incidentsOpenedOrUpdated.add(incident.incidentId);
        }

        const lease = incident.leaseId ? leases.get(incident.leaseId) : undefined;
        if (!lease) continue;
        if (!routineRecoveryAuthorized({ severity: incident.severity, category: incident.category })) {
          continue;
        }
        if (lease.mismatch) continue;

        const healthyNow =
          lease.health === "ACTIVE" ||
          lease.health === "SERVICE_AWAKE" ||
          lease.health === "COMPLETE";
        const lastRecovery = incident.recoveryAttempts.at(-1);

        if (healthyNow && incident.state !== "RESOLVED") {
          const recovered = machine.attemptRecovery(
            incident.incidentId,
            "success",
            AUTHORIZED_ROUTINE_RECOVERY_STRATEGY,
            "Fresh heartbeat returned inside the authorized recovery window.",
          );
          recoveries.push({
            incidentId: recovered.incidentId,
            result: "success",
            strategy: AUTHORIZED_ROUTINE_RECOVERY_STRATEGY,
          });
          incidentsOpenedOrUpdated.add(recovered.incidentId);
          continue;
        }

        if (!healthyNow && lease.health === "STALLED" && !lastRecovery) {
          const pending = machine.attemptRecovery(
            incident.incidentId,
            "pending",
            AUTHORIZED_ROUTINE_RECOVERY_STRATEGY,
            "Machine requested a fresh heartbeat. Owner is not interrupted yet.",
          );
          recoveries.push({
            incidentId: pending.incidentId,
            result: "pending",
            strategy: AUTHORIZED_ROUTINE_RECOVERY_STRATEGY,
          });
          incidentsOpenedOrUpdated.add(pending.incidentId);
          continue;
        }

        if (
          !healthyNow &&
          lease.health === "STALLED" &&
          lastRecovery?.result === "pending" &&
          now.getTime() - Date.parse(lastRecovery.at) >= ROUTINE_RECOVERY_WINDOW_MS
        ) {
          const failed = machine.attemptRecovery(
            incident.incidentId,
            "failure",
            AUTHORIZED_ROUTINE_RECOVERY_STRATEGY,
            "Authorized routine recovery did not restore a heartbeat in time.",
          );
          recoveries.push({
            incidentId: failed.incidentId,
            result: "failure",
            strategy: AUTHORIZED_ROUTINE_RECOVERY_STRATEGY,
          });
          incidentsOpenedOrUpdated.add(failed.incidentId);
        }
      }

      const leaseHealth: SweepResult["leaseHealth"] = {};
      for (const lease of leases.values()) {
        leaseHealth[lease.leaseId] = lease.health;
      }

      return {
        evaluatedAt,
        leaseHealth,
        incidentsOpenedOrUpdated: [...incidentsOpenedOrUpdated],
        recoveries,
        overdueNextChecks,
        mismatches,
      };
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
      const ownerJudgmentRequired = Boolean(
        input.ownerDecisionRequired && input.ownerDecisionRequired !== "none",
      )
        ? true
        : severity !== "ROUTINE" && severity !== "CUSTOMER_DELAY_RISK";
      const escalateNow = ownerMustBeInterrupted({
        severity,
        recoveryFailed: false,
        ownerJudgmentRequired,
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
      if (result === "pending") {
        incident.nextAutomaticAction =
          "Wait for a fresh worker heartbeat inside the authorized recovery window. Owner is not interrupted.";
        refreshIncident(incident, clock);
        return snapshotIncident(incident);
      }
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
        incident.whoMustBeContacted = contactFor(incident.severity, true);
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
