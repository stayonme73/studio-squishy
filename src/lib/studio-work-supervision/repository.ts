import type {
  IncidentEvent,
  MachineIncident,
  ProviderPortStatus,
  WorkLease,
} from "./types";

export const SUPERVISION_STORE_SCHEMA_VERSION = 1 as const;
export const SUPERVISION_STORE_PROVIDER = "studio-data-json" as const;

export type SupervisionRepositoryKind = "memory" | "durable-file";

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
  schemaVersion: typeof SUPERVISION_STORE_SCHEMA_VERSION;
  provider: typeof SUPERVISION_STORE_PROVIDER;
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
  load(): void;
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
  recordSweepEvaluation(record: SweepEvaluationRecord): void;
  listSweepEvaluations(): SweepEvaluationRecord[];
  getMeta(): SupervisionStoreMeta;
  markRestored(at: string): void;
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

export function assertDurableRepository(
  repository: SupervisionRepository,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const production = env.NODE_ENV === "production";
  const requireDurable = env.STUDIO_SUPERVISION_REQUIRE_DURABLE === "1" || production;
  if (requireDurable && repository.kind !== "durable-file") {
    throw new VolatileMemoryForbiddenError();
  }
}
