import { createPostgresSupervisionRepository } from "./postgres-adapter";
import { createSupervisionPostgresEngine } from "./postgres-engine";
import type { SupervisionLiveClient } from "./postgres-live-client";
import { coalesceSupervisionOps, type SupervisionQueuedOp } from "./postgres-rpc";
import type {
  HeartbeatRecord,
  SupervisionRepository,
  SweepClaim,
  SweepEvaluationRecord,
} from "./repository";
import { AppendOnlyViolationError } from "./repository";
import type { IncidentEvent, MachineIncident, ProviderPortStatus, WorkLease } from "./types";

export function createLivePostgresSupervisionRepository(
  client: SupervisionLiveClient,
): SupervisionRepository & {
  flush: () => Promise<void>;
  tryClaimSweepAsync: (input: {
    claimId: string;
    holder: string;
    at: string;
    ttlMs: number;
  }) => Promise<{ claimed: boolean; claim: SweepClaim | null }>;
} {
  const engine = createSupervisionPostgresEngine();
  const inner = createPostgresSupervisionRepository(engine);
  const pending: SupervisionQueuedOp[] = [];
  let loaded = false;

  function queue(op: SupervisionQueuedOp): void {
    pending.push(op);
  }

  const repo: SupervisionRepository & {
    flush: () => Promise<void>;
    tryClaimSweepAsync: (input: {
      claimId: string;
      holder: string;
      at: string;
      ttlMs: number;
    }) => Promise<{ claimed: boolean; claim: SweepClaim | null }>;
  } = {
    kind: "supabase-postgres",
    async load() {
      if (loaded) return;
      const snapshot = await client.hydrate();
      engine.loadSnapshot(snapshot as Parameters<typeof engine.loadSnapshot>[0]);
      loaded = true;
    },
    saveLease(lease: WorkLease) {
      inner.saveLease(lease);
      queue({ op: "upsert_lease", lease });
    },
    getLease(leaseId) {
      return inner.getLease(leaseId);
    },
    listLeases() {
      return inner.listLeases();
    },
    saveIncident(incident: MachineIncident) {
      inner.saveIncident(incident);
      queue({ op: "save_incident", incident });
    },
    getIncident(incidentId) {
      return inner.getIncident(incidentId);
    },
    listIncidents() {
      return inner.listIncidents();
    },
    appendIncidentEvent(incidentId: string, event: IncidentEvent) {
      inner.appendIncidentEvent(incidentId, event);
      queue({ op: "append_incident_event", incidentId, event });
    },
    listIncidentEvents(incidentId) {
      return inner.listIncidentEvents(incidentId);
    },
    replaceIncidentEvents() {
      throw new AppendOnlyViolationError();
    },
    rememberIdempotency(leaseId, idempotencyKey) {
      const accepted = inner.rememberIdempotency(leaseId, idempotencyKey);
      if (accepted) queue({ op: "remember_idempotency", leaseId, idempotencyKey });
      return accepted;
    },
    hasIdempotency(leaseId, idempotencyKey) {
      return inner.hasIdempotency(leaseId, idempotencyKey);
    },
    appendHeartbeat(record: HeartbeatRecord) {
      inner.appendHeartbeat(record);
      queue({ op: "append_heartbeat", heartbeat: record });
    },
    listHeartbeats() {
      return inner.listHeartbeats();
    },
    saveCoverage(providers: readonly ProviderPortStatus[]) {
      inner.saveCoverage(providers);
      queue({ op: "save_coverage", providers: [...providers] });
    },
    getCoverage() {
      return inner.getCoverage();
    },
    tryClaimSweep(input) {
      return inner.tryClaimSweep(input);
    },
    async tryClaimSweepAsync(input) {
      const result = await client.tryClaimSweep(input);
      if (result.claimed) {
        engine.tryClaimSweep(input);
      }
      return result;
    },
    recordSweepEvaluation(record: SweepEvaluationRecord) {
      inner.recordSweepEvaluation(record);
      queue({ op: "record_sweep_evaluation", evaluation: record });
    },
    listSweepEvaluations() {
      return inner.listSweepEvaluations();
    },
    getMeta() {
      return inner.getMeta();
    },
    markRestored(at) {
      inner.markRestored(at);
      queue({ op: "mark_restored", at });
    },
    dueNextChecks(at) {
      return engine.dueNextChecks(at);
    },
    async flush() {
      if (pending.length === 0) return;
      const snapshot = pending.splice(0, pending.length);
      const ops = coalesceSupervisionOps(snapshot);
      if (ops.length === 0) return;
      try {
        await client.applyOps(ops);
      } catch (error) {
        pending.unshift(...snapshot);
        throw error;
      }
    },
  };
  return repo;
}
