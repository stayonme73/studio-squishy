import { SUPERVISION_POSTGRES_SCHEMA_VERSION } from "./provider-class";
import type { SupervisionPostgresEngine } from "./postgres-engine";
import { AppendOnlyViolationError, type HeartbeatRecord, type SweepEvaluationRecord } from "./repository";
import type { IncidentEvent, MachineIncident, ProviderPortStatus, WorkLease } from "./types";

export type SupervisionRpcName =
  | "supervision_verify_schema"
  | "supervision_hydrate"
  | "supervision_due_next_checks"
  | "supervision_upsert_lease"
  | "supervision_accept_heartbeat"
  | "supervision_upsert_incident_with_events"
  | "supervision_record_recovery"
  | "supervision_try_claim_sweep"
  | "supervision_record_sweep_evaluation"
  | "supervision_save_coverage"
  | "supervision_mark_restored"
  | "supervision_apply_ops";

export type SupervisionQueuedOp =
  | { op: "upsert_lease"; lease: WorkLease }
  | { op: "accept_heartbeat"; lease: WorkLease; heartbeat: HeartbeatRecord }
  | { op: "remember_idempotency"; leaseId: string; idempotencyKey: string }
  | { op: "append_heartbeat"; heartbeat: HeartbeatRecord }
  | { op: "upsert_incident_with_events"; incident: MachineIncident; events: IncidentEvent[] }
  | { op: "append_incident_event"; incidentId: string; event: IncidentEvent }
  | { op: "save_incident"; incident: MachineIncident }
  | { op: "record_sweep_evaluation"; evaluation: SweepEvaluationRecord; lease?: WorkLease }
  | { op: "record_recovery"; incident: MachineIncident }
  | { op: "save_coverage"; providers: ProviderPortStatus[] }
  | { op: "mark_restored"; at: string };

export function coalesceSupervisionOps(ops: SupervisionQueuedOp[]): SupervisionQueuedOp[] {
  const out: SupervisionQueuedOp[] = [];
  for (const op of ops) {
    const last = out.at(-1);
    if (
      op.op === "append_heartbeat" &&
      last?.op === "remember_idempotency" &&
      last.leaseId === op.heartbeat.leaseId &&
      last.idempotencyKey === op.heartbeat.idempotencyKey
    ) {
      out.pop();
      out.push({ op: "accept_heartbeat", lease: undefined as unknown as WorkLease, heartbeat: op.heartbeat });
      continue;
    }
    if (op.op === "upsert_lease") {
      const prev = out.at(-1);
      if (prev?.op === "accept_heartbeat" && prev.heartbeat.leaseId === op.lease.leaseId) {
        prev.lease = op.lease;
        continue;
      }
      if (
        prev?.op === "record_sweep_evaluation" &&
        prev.evaluation.leaseId === op.lease.leaseId
      ) {
        prev.lease = op.lease;
        continue;
      }
    }
    if (op.op === "save_incident") {
      const events: IncidentEvent[] = [];
      while (out.at(-1)?.op === "append_incident_event") {
        const prev = out.pop() as Extract<SupervisionQueuedOp, { op: "append_incident_event" }>;
        if (prev.incidentId === op.incident.incidentId) events.unshift(prev.event);
        else {
          out.push(prev);
          break;
        }
      }
      const prev = out.at(-1);
      if (prev?.op === "upsert_incident_with_events" && prev.incident.incidentId === op.incident.incidentId) {
        prev.incident = op.incident;
        prev.events.push(...events);
        continue;
      }
      out.push({
        op: "upsert_incident_with_events",
        incident: op.incident,
        events: events.length > 0 ? events : op.incident.history.slice(-1),
      });
      continue;
    }
    out.push(op);
  }
  return out.filter((op) => {
    if (op.op === "accept_heartbeat") return Boolean(op.lease?.leaseId);
    return true;
  });
}

export function applySupervisionRpc(
  engine: SupervisionPostgresEngine,
  name: string,
  args: Record<string, unknown>,
): unknown {
  switch (name) {
    case "supervision_verify_schema": {
      const version = Number(engine.meta.schemaVersion);
      const compatible = version === SUPERVISION_POSTGRES_SCHEMA_VERSION;
      return {
        ok: compatible,
        schemaVersion: version,
        provider: engine.meta.provider,
        expected: SUPERVISION_POSTGRES_SCHEMA_VERSION,
      };
    }
    case "supervision_hydrate":
      return engine.toSnapshot();
    case "supervision_due_next_checks":
      return engine.dueNextChecks(String(args.p_at ?? args.at));
    case "supervision_upsert_lease":
      engine.saveLease(args.p_lease as WorkLease);
      return { ok: true };
    case "supervision_accept_heartbeat":
      return engine.acceptHeartbeat(
        args.p_lease as WorkLease,
        args.p_heartbeat as HeartbeatRecord,
      );
    case "supervision_upsert_incident_with_events": {
      const incident = args.p_incident as MachineIncident;
      const events = (args.p_events as IncidentEvent[]) ?? [];
      engine.upsertIncidentWithEvents(incident, events);
      return { ok: true };
    }
    case "supervision_record_recovery": {
      const incident = args.p_incident as MachineIncident;
      engine.upsertIncidentWithEvents(incident, incident.history.slice(-2));
      return { ok: true };
    }
    case "supervision_try_claim_sweep":
      return engine.tryClaimSweep({
        claimId: String(args.p_claim_id),
        holder: String(args.p_holder),
        at: String(args.p_at),
        ttlMs: Number(args.p_ttl_ms),
      });
    case "supervision_record_sweep_evaluation": {
      engine.recordSweepEvaluation(args.p_evaluation as SweepEvaluationRecord);
      if (args.p_lease) engine.saveLease(args.p_lease as WorkLease);
      return { ok: true };
    }
    case "supervision_save_coverage":
      engine.coverage = args.p_providers as ProviderPortStatus[];
      return { ok: true };
    case "supervision_mark_restored":
      engine.markRestored(String(args.p_at));
      return { ok: true };
    case "supervision_apply_ops": {
      const ops = args.p_ops as SupervisionQueuedOp[];
      const results: unknown[] = [];
      for (const op of ops) {
        results.push(applyQueuedOp(engine, op));
      }
      return { ok: true, results };
    }
    default:
      throw new Error(`Unknown supervision RPC ${name}`);
  }
}

function applyQueuedOp(engine: SupervisionPostgresEngine, op: SupervisionQueuedOp): unknown {
  switch (op.op) {
    case "upsert_lease":
      engine.saveLease(op.lease);
      return { ok: true };
    case "accept_heartbeat":
      return engine.acceptHeartbeat(op.lease, op.heartbeat);
    case "remember_idempotency":
      return { accepted: engine.rememberIdempotency(op.leaseId, op.idempotencyKey) };
    case "append_heartbeat":
      engine.appendHeartbeat(op.heartbeat);
      return { ok: true };
    case "upsert_incident_with_events":
      engine.upsertIncidentWithEvents(op.incident, op.events);
      return { ok: true };
    case "append_incident_event":
      engine.appendIncidentEvent(op.incidentId, op.event);
      return { ok: true };
    case "save_incident":
      engine.saveIncident(op.incident);
      return { ok: true };
    case "record_sweep_evaluation":
      engine.recordSweepEvaluation(op.evaluation);
      if (op.lease) engine.saveLease(op.lease);
      return { ok: true };
    case "record_recovery":
      engine.upsertIncidentWithEvents(op.incident, op.incident.history);
      return { ok: true };
    case "save_coverage":
      engine.coverage = op.providers;
      return { ok: true };
    case "mark_restored":
      engine.markRestored(op.at);
      return { ok: true };
    default:
      throw new AppendOnlyViolationError("Unknown queued supervision op.");
  }
}
