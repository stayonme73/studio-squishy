/**
 * Machine incident and lease types — Foundation Pass 1.
 * The Machine is the system of record. Workers may heartbeat; they may not
 * declare themselves healthy.
 */

export const INCIDENT_SEVERITIES = [
  "ROUTINE",
  "CUSTOMER_DELAY_RISK",
  "DEADLINE_CRITICAL",
  "FINANCIAL_RISK",
  "RIGHTS_OR_COMPLIANCE_RISK",
  "SECURITY_SUSPECTED",
  "SECURITY_CONFIRMED",
] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_CATEGORIES = [
  "agent",
  "process",
  "provider",
  "customer_work",
  "deadline",
  "money",
  "rights",
  "security",
  "other",
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_STATES = [
  "OPEN",
  "RECOVERING",
  "WAITING",
  "ESCALATED",
  "RESOLVED",
] as const;

export type IncidentState = (typeof INCIDENT_STATES)[number];

export const HEALTH_STATUSES = [
  "ACTIVE",
  "SERVICE_AWAKE",
  "WAITING",
  "BLOCKED",
  "STALLED",
  "COMPLETE",
  "COVERAGE_NOT_CONNECTED",
] as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const LEASE_KINDS = ["FINITE_WORK", "LONG_RUNNING_SERVICE"] as const;
export type LeaseKind = (typeof LEASE_KINDS)[number];

export const COMPONENT_KINDS = [
  "agent",
  "tool",
  "provider",
  "workflow",
  "service",
] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export const OWNER_ACTIONS = [
  "acknowledge",
  "hold",
  "approve_recovery",
  "request_more_information",
  "resolve",
] as const;
export type OwnerActionId = (typeof OWNER_ACTIONS)[number];

export const UNCONNECTED_PROVIDERS = [
  "claude",
  "build_a_bot",
  "make",
  "resend",
] as const;
export type UnconnectedProviderId = (typeof UNCONNECTED_PROVIDERS)[number];

export const WORKER_REPORTED_STATUSES = [
  "working",
  "service_awake",
  "waiting_for_owner",
  "blocked",
  "complete",
] as const;
export type WorkerReportedStatus = (typeof WORKER_REPORTED_STATUSES)[number];

export const WORKER_PROVIDER_IDS = [
  "machine",
  "scout",
  "claude",
  "cody",
  "build_a_bot",
  "production_worker",
  "fixture",
] as const;
export type WorkerProviderId = (typeof WORKER_PROVIDER_IDS)[number];

export type AssignedWorker = {
  providerId: WorkerProviderId | string;
  workerId: string;
  label: string;
};

export type ResponsibleComponent = {
  kind: ComponentKind;
  id: string;
  label: string;
};

export type EvidenceRef = {
  id: string;
  kind: "log" | "lease" | "heartbeat" | "note" | "fixture";
  summary: string;
  recordedAt: string;
};

export type RecoveryAttempt = {
  attemptId: string;
  at: string;
  strategy: string;
  result: "pending" | "success" | "failure";
  detail: string;
};

export type LeaseMismatch = {
  code: "branch_commit_mismatch";
  expectedBranch: string | null;
  expectedCommit: string | null;
  reportedBranch: string | null;
  reportedCommit: string | null;
  detail: string;
};

export type IncidentEvent = {
  eventId: string;
  at: string;
  type: string;
  actor: "machine" | "worker" | "owner";
  summary: string;
  payload: Record<string, string | number | boolean | null>;
};

export type ExactBlocker = {
  code: string;
  detail: string;
};

export type WorkLease = {
  leaseId: string;
  kind: LeaseKind;
  coverageConnected: boolean;
  subject: ResponsibleComponent;
  assignedWorker: AssignedWorker;
  packageId: string;
  branch: string | null;
  commit: string | null;
  customerId: string;
  customerLabel: string;
  projectId: string;
  campaignId: string;
  step: string;
  heartbeatIntervalMs: number;
  graceMs: number;
  issuedAt: string;
  lastHeartbeatAt: string;
  lastHealthyAt: string | null;
  expectedCompletionAt: string | null;
  expectedUpdateAt: string | null;
  completedAt: string | null;
  blocker: ExactBlocker | null;
  waitingReason: string | null;
  reportedStatus: WorkerReportedStatus | null;
  mismatch: LeaseMismatch | null;
  evidence: EvidenceRef[];
  health: HealthStatus;
  openIncidentId: string | null;
  serviceNeedsHealthCheck: boolean;
};

export type MachineIncident = {
  incidentId: string;
  dedupeKey: string;
  leaseId: string | null;
  customerId: string;
  customerLabel: string;
  projectId: string;
  campaignId: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  responsibleComponent: ResponsibleComponent;
  failedOrStalledStep: string;
  startedAt: string;
  lastHealthyAt: string;
  lastHeartbeatAt: string;
  customerImpact: string;
  deadlineImpact: string;
  financialImpact: string;
  rightsOrComplianceImpact: string;
  securityOrBreachImpact: string;
  containmentPerformed: string;
  recoveryAttempts: RecoveryAttempt[];
  currentResponsibleParty: string;
  whoMustBeContacted: string;
  ownerDecisionRequired: string;
  nextAutomaticAction: string;
  nextCheckAt: string;
  ifOwnerDoesNothing: string;
  evidence: EvidenceRef[];
  history: IncidentEvent[];
  state: IncidentState;
  ownerEscalated: boolean;
};

export type ProviderPortStatus = {
  id: UnconnectedProviderId;
  label: string;
  status: "NOT_CONNECTED";
  healthyDisplayAllowed: false;
};

export type IssueLeaseInput = {
  leaseId?: string;
  kind: LeaseKind;
  coverageConnected?: boolean;
  subject: ResponsibleComponent;
  assignedWorker?: AssignedWorker;
  packageId?: string;
  branch?: string | null;
  commit?: string | null;
  customerId: string;
  customerLabel: string;
  projectId: string;
  campaignId: string;
  step: string;
  heartbeatIntervalMs?: number;
  graceMs?: number;
  expectedCompletionAt?: string | null;
  expectedUpdateAt?: string | null;
};

export type HeartbeatInput = {
  leaseId: string;
  idempotencyKey: string;
  at?: string;
  reportedStatus?: WorkerReportedStatus;
  evidenceSummary?: string;
  branch?: string | null;
  commit?: string | null;
  customerId?: string;
  projectId?: string;
  blocker?: ExactBlocker;
  waitingReason?: string;
};

export type SweepResult = {
  evaluatedAt: string;
  claimed: boolean;
  claimId: string | null;
  skippedBecauseClaimHeld: boolean;
  leaseHealth: Record<string, HealthStatus>;
  incidentsOpenedOrUpdated: string[];
  recoveries: Array<{
    incidentId: string;
    result: RecoveryAttempt["result"];
    strategy: string;
  }>;
  overdueNextChecks: string[];
  mismatches: string[];
  sweepEvaluations: Array<{
    leaseId: string;
    incidentId: string | null;
    health: HealthStatus;
  }>;
};

export type OpenIncidentInput = {
  incidentId?: string;
  dedupeKey: string;
  leaseId?: string | null;
  customerId: string;
  customerLabel: string;
  projectId: string;
  campaignId: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  responsibleComponent: ResponsibleComponent;
  failedOrStalledStep: string;
  customerImpact: string;
  deadlineImpact: string;
  financialImpact: string;
  rightsOrComplianceImpact: string;
  securityOrBreachImpact: string;
  containmentPerformed?: string;
  currentResponsibleParty?: string;
  whoMustBeContacted?: string;
  ownerDecisionRequired?: string;
  evidence?: EvidenceRef[];
  lastHealthyAt?: string;
  lastHeartbeatAt?: string;
};

export type Clock = {
  now: () => Date;
};

export type IdFactory = (kind: string) => string;

export type SupervisionSnapshot = {
  leases: WorkLease[];
  incidents: MachineIncident[];
  providers: ProviderPortStatus[];
  recordSource: "fixture" | "live";
};

export class SupervisionIsolationError extends Error {
  readonly code = "CUSTOMER_PROJECT_ISOLATION" as const;
  constructor(message = "Heartbeat customer or project does not match the lease.") {
    super(message);
    this.name = "SupervisionIsolationError";
  }
}

export class UnknownLeaseError extends Error {
  readonly code = "UNKNOWN_LEASE" as const;
  constructor(leaseId: string) {
    super(`Unknown lease ${leaseId}`);
    this.name = "UnknownLeaseError";
  }
}
