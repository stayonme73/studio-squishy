import type {
  IncidentEvent,
  MachineIncident,
  ProviderPortStatus,
  WorkLease,
} from "./types";
import {
  isLaunchRuntime,
  SUPERVISION_JSON_PROVIDER,
  SUPERVISION_POSTGRES_PROVIDER,
  type SupervisionRepositoryKind,
} from "./provider-class";

export const SUPERVISION_STORE_SCHEMA_VERSION = 1 as const;
export const SUPERVISION_STORE_PROVIDER = SUPERVISION_JSON_PROVIDER;
export type { SupervisionRepositoryKind };

export type SweepClaim = {
  claimId: string;
  claimedAt: string;
  holder: string;
  expiresAt: string;
};

export type SweepEvaluationRecord = {
  evaluationId: string;
  claimId: string;
  at: string;
  leaseId: string;
  incidentId: string | null;
  health: string;
};

export type SupervisionStoreMeta = {
  schemaVersion: number;
  provider: typeof SUPERVISION_JSON_PROVIDER | typeof SUPERVISION_POSTGRES_PROVIDER;
  restoredAt: string | null;
  lastSweepClaim: SweepClaim | null;
};

export type HeartbeatRecord = {
  leaseId: string;
  idempotencyKey: string;
  at: string;
  reportedStatus: string | null;
  customerId: string;
  projectId: string;
};

export type SupervisionRepository = {
  kind: SupervisionRepositoryKind;
  load(): void | Promise<void>;
  saveLease(lease: WorkLease): void;
  getLease(leaseId: string): WorkLease | undefined;
  listLeases(): WorkLease[];
  saveIncident(incident: MachineIncident): void;
  getIncident(incidentId: string): MachineIncident | undefined;
  listIncidents(): MachineIncident[];
  appendIncidentEvent(incidentId: string, event: IncidentEvent): void;
  listIncidentEvents(incidentId: string): IncidentEvent[];
  replaceIncidentEvents(incidentId: string, events: IncidentEvent[]): void;
  rememberIdempotency(leaseId: string, idempotencyKey: string): boolean;
  hasIdempotency(leaseId: string, idempotencyKey: string): boolean;
  appendHeartbeat(record: HeartbeatRecord): void;
  listHeartbeats(): HeartbeatRecord[];
  saveCoverage(providers: readonly ProviderPortStatus[]): void;
  getCoverage(): ProviderPortStatus[];
  tryClaimSweep(input: {
    claimId: string;
    holder: string;
    at: string;
    ttlMs: number;
  }): { claimed: boolean; claim: SweepClaim | null };
  tryClaimSweepAsync?: (input: {
    claimId: string;
    holder: string;
    at: string;
    ttlMs: number;
  }) => Promise<{ claimed: boolean; claim: SweepClaim | null }>;
  recordSweepEvaluation(record: SweepEvaluationRecord): void;
  listSweepEvaluations(): SweepEvaluationRecord[];
  getMeta(): SupervisionStoreMeta;
  markRestored(at: string): void;
  flush?: () => void | Promise<void>;
  dueNextChecks?: (at: string) => { leaseIds: string[]; incidentIds: string[] };
};

export class AppendOnlyViolationError extends Error {
  readonly code = "APPEND_ONLY_VIOLATION" as const;
  constructor(message = "Incident events cannot be overwritten or deleted.") {
    super(message);
    this.name = "AppendOnlyViolationError";
  }
}

export class DurablePersistenceUnavailableError extends Error {
  readonly code = "DURABLE_PERSISTENCE_UNAVAILABLE" as const;
  constructor(message: string) {
    super(message);
    this.name = "DurablePersistenceUnavailableError";
  }
}

export class VolatileMemoryForbiddenError extends Error {
  readonly code = "VOLATILE_MEMORY_FORBIDDEN" as const;
  constructor(
    message = "Production supervision cannot fall back to volatile memory.",
  ) {
    super(message);
    this.name = "VolatileMemoryForbiddenError";
  }
}

export class SchemaMismatchError extends Error {
  readonly code = "SCHEMA_MISMATCH" as const;
  constructor(
    message = "Supervision Postgres schema is missing or incompatible.",
  ) {
    super(message);
    this.name = "SchemaMismatchError";
  }
}

export class LiveStoreUnhealthyError extends Error {
  readonly code = "LIVE_STORE_UNHEALTHY" as const;
  constructor(message = "Supervision Postgres is unavailable.") {
    super(message);
    this.name = "LiveStoreUnhealthyError";
  }
}

export class LaunchPersistenceForbiddenError extends Error {
  readonly code = "LAUNCH_PERSISTENCE_FORBIDDEN" as const;
  constructor(
    message = "Launch runtime cannot use memory or JSON-file supervision storage.",
  ) {
    super(message);
    this.name = "LaunchPersistenceForbiddenError";
  }
}

export function assertDurableRepository(
  repository: SupervisionRepository,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (isLaunchRuntime(env)) {
    if (repository.kind !== "supabase-postgres") {
      throw new LaunchPersistenceForbiddenError();
    }
    return;
  }
  const requireDurable = env.STUDIO_SUPERVISION_REQUIRE_DURABLE === "1";
  if (requireDurable && repository.kind === "memory") {
    throw new VolatileMemoryForbiddenError();
  }
  if (env.NODE_ENV === "production" && repository.kind === "memory") {
    throw new VolatileMemoryForbiddenError();
  }
}
