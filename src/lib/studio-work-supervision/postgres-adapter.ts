import { cloneJson } from "./clock";
import {
  createSupervisionPostgresEngine,
  type SupervisionPostgresEngine,
} from "./postgres-engine";
import { SUPERVISION_POSTGRES_PROVIDER } from "./provider-class";
import {
  SUPERVISION_STORE_SCHEMA_VERSION,
  type HeartbeatRecord,
  type SupervisionRepository,
  type SupervisionStoreMeta,
  type SweepEvaluationRecord,
} from "./repository";
import type { ProviderPortStatus } from "./types";

export function createPostgresSupervisionRepository(
  engine: SupervisionPostgresEngine = createSupervisionPostgresEngine(),
): SupervisionRepository {
  const repo: SupervisionRepository = {
    kind: "supabase-postgres",
    load() {
      /* Engine rows are the store. */
    },
    saveLease(lease) {
      engine.saveLease(lease);
    },
    getLease(leaseId) {
      return engine.getLease(leaseId);
    },
    listLeases() {
      return engine.listLeases();
    },
    saveIncident(incident) {
      engine.saveIncident(incident);
    },
    getIncident(incidentId) {
      return engine.getIncident(incidentId);
    },
    listIncidents() {
      return engine.listIncidents();
    },
    appendIncidentEvent(incidentId, event) {
      engine.appendIncidentEvent(incidentId, event);
    },
    listIncidentEvents(incidentId) {
      return engine.listIncidentEvents(incidentId);
    },
    replaceIncidentEvents() {
      engine.replaceIncidentEvents();
    },
    rememberIdempotency(leaseId, idempotencyKey) {
      return engine.rememberIdempotency(leaseId, idempotencyKey);
    },
    hasIdempotency(leaseId, idempotencyKey) {
      return engine.hasIdempotency(leaseId, idempotencyKey);
    },
    appendHeartbeat(record) {
      engine.appendHeartbeat(record);
    },
    listHeartbeats() {
      return cloneJson(engine.heartbeats);
    },
    saveCoverage(providers) {
      engine.coverage = cloneJson([...providers]) as ProviderPortStatus[];
    },
    getCoverage() {
      return cloneJson(engine.coverage);
    },
    tryClaimSweep(input) {
      return engine.tryClaimSweep(input);
    },
    recordSweepEvaluation(record: SweepEvaluationRecord) {
      engine.recordSweepEvaluation(record);
    },
    listSweepEvaluations() {
      return cloneJson(engine.evaluations);
    },
    getMeta() {
      return cloneJson(engine.meta) as SupervisionStoreMeta;
    },
    markRestored(at) {
      engine.markRestored(at);
    },
  };
  engine.meta.schemaVersion = SUPERVISION_STORE_SCHEMA_VERSION;
  engine.meta.provider = SUPERVISION_POSTGRES_PROVIDER;
  return repo;
}

export function sharedPostgresPair() {
  const engine = createSupervisionPostgresEngine();
  return {
    engine,
    processA: createPostgresSupervisionRepository(engine),
    processB: createPostgresSupervisionRepository(engine),
  };
}
