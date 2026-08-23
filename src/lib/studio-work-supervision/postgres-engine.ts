import { cloneJson } from "./clock";
import { UNCONNECTED_PROVIDER_PORTS } from "./policy";
import {
  AppendOnlyViolationError,
  type HeartbeatRecord,
  type SweepClaim,
  type SweepEvaluationRecord,
  type SupervisionStoreMeta,
} from "./repository";
import type { IncidentEvent, MachineIncident, ProviderPortStatus, WorkLease } from "./types";
import { SUPERVISION_POSTGRES_PROVIDER } from "./provider-class";

type LeaseRow = {
  leaseId: string;
  customerId: string;
  projectId: string;
  campaignId: string;
  health: string;
  kind: string;
  lastHeartbeatAt: string;
  lastHealthyAt: string | null;
  payload: WorkLease;
};

type IncidentRow = {
  incidentId: string;
  leaseId: string | null;
  customerId: string;
  projectId: string;
  campaignId: string;
  dedupeKey: string;
  state: string;
  ownerEscalated: boolean;
  nextCheckAt: string;
  payload: MachineIncident;
};

export class SupervisionPostgresEngine {
  readonly leases = new Map<string, LeaseRow>();
  readonly incidents = new Map<string, IncidentRow>();
  readonly events = new Map<string, IncidentEvent[]>();
  readonly recovery = new Map<string, MachineIncident["recoveryAttempts"]>();
  readonly idempotency = new Set<string>();
  readonly heartbeats: HeartbeatRecord[] = [];
  coverage: ProviderPortStatus[] = cloneJson([...UNCONNECTED_PROVIDER_PORTS]);
  readonly evaluations: SweepEvaluationRecord[] = [];
  sweepClaim: SweepClaim | null = null;
  meta: SupervisionStoreMeta = {
    schemaVersion: 1,
    provider: SUPERVISION_POSTGRES_PROVIDER,
    restoredAt: null,
    lastSweepClaim: null,
  };

  validateTimestamp(value: string, field: string): void {
    if (!value || Number.isNaN(Date.parse(value))) {
      throw new Error(`${field} must be an ISO-8601 timestamp.`);
    }
  }

  saveLease(lease: WorkLease): void {
    this.validateTimestamp(lease.issuedAt, "issuedAt");
    this.validateTimestamp(lease.lastHeartbeatAt, "lastHeartbeatAt");
    this.leases.set(lease.leaseId, {
      leaseId: lease.leaseId,
      customerId: lease.customerId,
      projectId: lease.projectId,
      campaignId: lease.campaignId,
      health: lease.health,
      kind: lease.kind,
      lastHeartbeatAt: lease.lastHeartbeatAt,
      lastHealthyAt: lease.lastHealthyAt,
      payload: cloneJson(lease),
    });
  }

  getLease(leaseId: string): WorkLease | undefined {
    const row = this.leases.get(leaseId);
    return row ? cloneJson(row.payload) : undefined;
  }

  listLeases(): WorkLease[] {
    return [...this.leases.values()].map((row) => cloneJson(row.payload));
  }

  saveIncident(incident: MachineIncident): void {
    this.validateTimestamp(incident.startedAt, "startedAt");
    this.validateTimestamp(incident.nextCheckAt, "nextCheckAt");
    const openDuplicate = [...this.incidents.values()].find(
      (row) =>
        row.incidentId !== incident.incidentId &&
        row.customerId === incident.customerId &&
        row.dedupeKey === incident.dedupeKey &&
        row.state !== "RESOLVED" &&
        incident.state !== "RESOLVED",
    );
    if (openDuplicate) {
      throw new Error("Open incident dedupe constraint violated.");
    }
    this.incidents.set(incident.incidentId, {
      incidentId: incident.incidentId,
      leaseId: incident.leaseId,
      customerId: incident.customerId,
      projectId: incident.projectId,
      campaignId: incident.campaignId,
      dedupeKey: incident.dedupeKey,
      state: incident.state,
      ownerEscalated: incident.ownerEscalated,
      nextCheckAt: incident.nextCheckAt,
      payload: cloneJson({ ...incident, history: [] }),
    });
    this.recovery.set(incident.incidentId, cloneJson(incident.recoveryAttempts));
    if (!this.events.has(incident.incidentId) && incident.history.length > 0) {
      this.events.set(incident.incidentId, cloneJson(incident.history));
    }
  }

  getIncident(incidentId: string): MachineIncident | undefined {
    const row = this.incidents.get(incidentId);
    if (!row) return undefined;
    const history = this.events.get(incidentId) ?? [];
    const recoveryAttempts = this.recovery.get(incidentId) ?? [];
    return cloneJson({ ...row.payload, history, recoveryAttempts });
  }

  listIncidents(): MachineIncident[] {
    return [...this.incidents.keys()]
      .map((id) => this.getIncident(id))
      .filter((incident): incident is MachineIncident => Boolean(incident));
  }

  appendIncidentEvent(incidentId: string, event: IncidentEvent): void {
    this.validateTimestamp(event.at, "event.at");
    const list = this.events.get(incidentId) ?? [];
    if (list.some((row) => row.eventId === event.eventId)) {
      throw new AppendOnlyViolationError("Incident event ids cannot be reused.");
    }
    list.push(cloneJson(event));
    this.events.set(incidentId, list);
  }

  listIncidentEvents(incidentId: string): IncidentEvent[] {
    return cloneJson(this.events.get(incidentId) ?? []);
  }

  replaceIncidentEvents(): never {
    throw new AppendOnlyViolationError();
  }

  rememberIdempotency(leaseId: string, idempotencyKey: string): boolean {
    const key = `${leaseId}:${idempotencyKey}`;
    if (this.idempotency.has(key)) return false;
    this.idempotency.add(key);
    return true;
  }

  hasIdempotency(leaseId: string, idempotencyKey: string): boolean {
    return this.idempotency.has(`${leaseId}:${idempotencyKey}`);
  }

  appendHeartbeat(record: HeartbeatRecord): void {
    this.validateTimestamp(record.at, "heartbeat.at");
    this.heartbeats.push(cloneJson(record));
  }

  tryClaimSweep(input: {
    claimId: string;
    holder: string;
    at: string;
    ttlMs: number;
  }): { claimed: boolean; claim: SweepClaim | null } {
    this.validateTimestamp(input.at, "claim.at");
    const now = Date.parse(input.at);
    if (
      this.sweepClaim &&
      Date.parse(this.sweepClaim.expiresAt) > now &&
      this.sweepClaim.holder !== input.holder
    ) {
      return { claimed: false, claim: cloneJson(this.sweepClaim) };
    }
    this.sweepClaim = {
      claimId: input.claimId,
      claimedAt: input.at,
      holder: input.holder,
      expiresAt: new Date(now + input.ttlMs).toISOString(),
    };
    this.meta.lastSweepClaim = cloneJson(this.sweepClaim);
    return { claimed: true, claim: cloneJson(this.sweepClaim) };
  }

  recordSweepEvaluation(record: SweepEvaluationRecord): void {
    if (this.evaluations.some((row) => row.evaluationId === record.evaluationId)) {
      throw new AppendOnlyViolationError("Sweep evaluations cannot be overwritten.");
    }
    this.evaluations.push(cloneJson(record));
  }

  markRestored(at: string): void {
    this.validateTimestamp(at, "restoredAt");
    this.meta.restoredAt = at;
  }
}

export function createSupervisionPostgresEngine(): SupervisionPostgresEngine {
  return new SupervisionPostgresEngine();
}
