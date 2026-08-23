import { WORKER_SELF_CERTIFY_KEYS } from "./contract";
import {
  LEASE_KINDS,
  WORKER_REPORTED_STATUSES,
  type ExactBlocker,
  type IssueLeaseInput,
  type WorkerReportedStatus,
} from "./types";

export class WorkerSelfCertifyError extends Error {
  readonly code = "WORKER_SELF_CERTIFY_FORBIDDEN" as const;
  constructor() {
    super("Workers may report evidence. The Machine computes health. Self-certify fields are forbidden.");
    this.name = "WorkerSelfCertifyError";
  }
}

export class IngestValidationError extends Error {
  readonly code = "INGEST_VALIDATION" as const;
  constructor(message: string) {
    super(message);
    this.name = "IngestValidationError";
  }
}

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new IngestValidationError("JSON body must be an object.");
  }
  return value as JsonObject;
}

export function rejectSelfCertify(body: JsonObject): void {
  for (const key of WORKER_SELF_CERTIFY_KEYS) {
    if (key in body) throw new WorkerSelfCertifyError();
  }
}

function optionalString(body: JsonObject, key: string): string | undefined {
  const value = body[key];
  if (value == null) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new IngestValidationError(`${key} must be a non-empty string.`);
  }
  return value.trim();
}

function requiredString(body: JsonObject, key: string): string {
  const value = optionalString(body, key);
  if (!value) throw new IngestValidationError(`${key} is required.`);
  return value;
}

function optionalNumber(body: JsonObject, key: string): number | undefined {
  const value = body[key];
  if (value == null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new IngestValidationError(`${key} must be a positive number.`);
  }
  return value;
}

export function parseRegisterBody(value: unknown): IssueLeaseInput {
  const body = asObject(value);
  rejectSelfCertify(body);
  const kind = requiredString(body, "kind");
  if (!LEASE_KINDS.includes(kind as (typeof LEASE_KINDS)[number])) {
    throw new IngestValidationError("kind must be FINITE_WORK or LONG_RUNNING_SERVICE.");
  }
  const subjectId = requiredString(body, "workerId");
  const subjectLabel = optionalString(body, "workerLabel") ?? subjectId;
  const providerId = optionalString(body, "providerId") ?? "scout";
  return {
    leaseId: optionalString(body, "leaseId"),
    kind: kind as IssueLeaseInput["kind"],
    coverageConnected: body.coverageConnected === false ? false : undefined,
    subject: {
      kind: providerId === "machine" ? "service" : "agent",
      id: subjectId,
      label: subjectLabel,
    },
    assignedWorker: {
      providerId,
      workerId: subjectId,
      label: subjectLabel,
    },
    packageId: optionalString(body, "packageId"),
    branch: optionalString(body, "branch") ?? null,
    commit: optionalString(body, "commit") ?? null,
    customerId: requiredString(body, "customerId"),
    customerLabel: requiredString(body, "customerLabel"),
    projectId: requiredString(body, "projectId"),
    campaignId: requiredString(body, "campaignId"),
    step: requiredString(body, "step"),
    heartbeatIntervalMs: optionalNumber(body, "heartbeatIntervalMs"),
    graceMs: optionalNumber(body, "graceMs"),
    expectedCompletionAt: optionalString(body, "expectedCompletionAt") ?? null,
  };
}

export type ParsedHeartbeat = {
  leaseId: string;
  idempotencyKey: string;
  reportedStatus?: WorkerReportedStatus;
  evidenceSummary?: string;
  branch?: string;
  commit?: string;
  customerId?: string;
  projectId?: string;
  blocker?: ExactBlocker;
  waitingReason?: string;
};

export function parseHeartbeatBody(
  value: unknown,
  headerIdempotencyKey: string | null,
): ParsedHeartbeat {
  const body = asObject(value);
  rejectSelfCertify(body);
  const reported = optionalString(body, "reportedStatus");
  if (reported && !WORKER_REPORTED_STATUSES.includes(reported as WorkerReportedStatus)) {
    throw new IngestValidationError(
      "reportedStatus must be working, service_awake, waiting_for_owner, blocked, or complete.",
    );
  }
  const blockerCode = optionalString(body, "blockerCode");
  const blockerDetail = optionalString(body, "blockerDetail");
  const idempotencyKey =
    headerIdempotencyKey?.trim() || optionalString(body, "idempotencyKey");
  if (!idempotencyKey) {
    throw new IngestValidationError("idempotencyKey is required.");
  }
  return {
    leaseId: requiredString(body, "leaseId"),
    idempotencyKey,
    reportedStatus: reported as WorkerReportedStatus | undefined,
    evidenceSummary: optionalString(body, "evidenceSummary"),
    branch: optionalString(body, "branch"),
    commit: optionalString(body, "commit"),
    customerId: optionalString(body, "customerId"),
    projectId: optionalString(body, "projectId"),
    waitingReason: optionalString(body, "waitingReason"),
    blocker:
      blockerCode && blockerDetail
        ? { code: blockerCode, detail: blockerDetail }
        : undefined,
  };
}
