import { cloneJson } from "./clock";
import { UNCONNECTED_PROVIDER_PORTS } from "./policy";
import {
  AppendOnlyViolationError,
  SUPERVISION_STORE_PROVIDER,
  SUPERVISION_STORE_SCHEMA_VERSION,
  type HeartbeatRecord,
  type SupervisionRepository,
  type SupervisionStoreMeta,
  type SweepClaim,
  type SweepEvaluationRecord,
} from "./repository";
import type { IncidentEvent, MachineIncident, ProviderPortStatus, WorkLease } from "./types";

export function createMemorySupervisionRepository(): SupervisionRepository {
  const leases = new Map<string, WorkLease>();
  const incidents = new Map<string, MachineIncident>();
  const events = new Map<string, IncidentEvent[]>();
  const idempotency = new Set<string>();
  const heartbeats: HeartbeatRecord[] = [];
  let coverage: ProviderPortStatus[] = cloneJson([...UNCONNECTED_PROVIDER_PORTS]);
  const evaluations: SweepEvaluationRecord[] = [];
  let meta: SupervisionStoreMeta = {
    schemaVersion: SUPERVISION_STORE_SCHEMA_VERSION,
    provider: SUPERVISION_STORE_PROVIDER,
    restoredAt: null,
    lastSweepClaim: null,
  };
  let sweepClaim: SweepClaim | null = null;

  return {
    kind: "memory",
    load() {
      /* memory starts empty unless tests populate via save* */
    },
    saveLease(lease) {
      leases.set(lease.leaseId, cloneJson(lease));
    },
    getLease(leaseId) {
      const lease = leases.get(leaseId);
      return lease ? cloneJson(lease) : undefined;
    },
    listLeases() {
      return [...leases.values()].map((lease) => cloneJson(lease));
    },
    saveIncident(incident) {
      incidents.set(incident.incidentId, cloneJson(incident));
      if (!events.has(incident.incidentId)) {
        events.set(incident.incidentId, cloneJson(incident.history));
      }
    },
    getIncident(incidentId) {
      const incident = incidents.get(incidentId);
      if (!incident) return undefined;
      const history = events.get(incidentId) ?? incident.history;
      return cloneJson({ ...incident, history });
    },
    listIncidents() {
      return [...incidents.keys()].map((id) => this.getIncident(id)!);
    },
    appendIncidentEvent(incidentId, event) {
      const list = events.get(incidentId) ?? [];
      list.push(cloneJson(event));
      events.set(incidentId, list);
      const incident = incidents.get(incidentId);
      if (incident) {
        incident.history = cloneJson(list);
        incidents.set(incidentId, incident);
      }
    },
    listIncidentEvents(incidentId) {
      return cloneJson(events.get(incidentId) ?? []);
    },
    replaceIncidentEvents() {
      throw new AppendOnlyViolationError();
    },
    rememberIdempotency(leaseId, idempotencyKey) {
      const key = `${leaseId}:${idempotencyKey}`;
      if (idempotency.has(key)) return false;
      idempotency.add(key);
      return true;
    },
    hasIdempotency(leaseId, idempotencyKey) {
      return idempotency.has(`${leaseId}:${idempotencyKey}`);
    },
    appendHeartbeat(record) {
      heartbeats.push(cloneJson(record));
    },
    listHeartbeats() {
      return cloneJson(heartbeats);
    },
    saveCoverage(providers) {
      coverage = cloneJson([...providers]);
    },
    getCoverage() {
      return cloneJson(coverage);
    },
    tryClaimSweep(input) {
      const now = Date.parse(input.at);
      if (sweepClaim && Date.parse(sweepClaim.expiresAt) > now && sweepClaim.holder !== input.holder) {
        return { claimed: false, claim: cloneJson(sweepClaim) };
      }
      sweepClaim = {
        claimId: input.claimId,
        claimedAt: input.at,
        holder: input.holder,
        expiresAt: new Date(now + input.ttlMs).toISOString(),
      };
      meta.lastSweepClaim = cloneJson(sweepClaim);
      return { claimed: true, claim: cloneJson(sweepClaim) };
    },
    recordSweepEvaluation(record) {
      evaluations.push(cloneJson(record));
    },
    listSweepEvaluations() {
      return cloneJson(evaluations);
    },
    getMeta() {
      return cloneJson(meta);
    },
    markRestored(at) {
      meta.restoredAt = at;
    },
  };
}
