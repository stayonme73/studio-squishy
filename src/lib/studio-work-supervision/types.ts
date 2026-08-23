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
  result: "success" | "failure";
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
  completedAt: string | null;
  blocker: ExactBlocker | null;
  waitingReason: string | null;
  health: HealthStatus;
  openIncidentId: string | null;
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
  customerId: string;
  customerLabel: string;
  projectId: string;
  campaignId: string;
  step: string;
  heartbeatIntervalMs?: number;
  graceMs?: number;
  expectedCompletionAt?: string | null;
};

export type HeartbeatInput = {
  leaseId: string;
  idempotencyKey: string;
  at?: string;
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
};
