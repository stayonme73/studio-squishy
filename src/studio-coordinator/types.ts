import type { CampaignRecord } from "@/config/studio-board";
import type {
  CustomerInteractionKind,
  DecisionContext,
  DecisionDomain,
  DecisionOutcome,
  IncomingCustomerEventType,
  PlannedEffect,
} from "@/decision-core";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "@/lib/materials/types";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

/** Canonical Studio Coordinator module version — Phase 1. */
export const STUDIO_COORDINATOR_VERSION = "1.0.0";

export type CoordinatorObservationKind =
  | "stalled"
  | "repeated_confusion"
  | "elevated_client_tone"
  | "recurring_production_issue"
  | "unusual_delay";

export type CoordinatorObservation = {
  id: string;
  campaignId: string;
  jobId?: string;
  kind: CoordinatorObservationKind;
  summary: string;
  signalRef: string;
  occurredAt: string;
};

export type LearningCandidateStatus = "pending_review";

export type LearningCandidate = {
  id: string;
  campaignId: string;
  jobId?: string;
  exceptionId?: string;
  situationSummary: string;
  ownerOutcome: string;
  occurredAt: string;
  status: LearningCandidateStatus;
};

export type CoordinatorAuditStep =
  | "received"
  | "context_built"
  | "decision_evaluated"
  | "effects_executed"
  | "observation_recorded"
  | "learning_candidate_recorded"
  | "owner_action_executed";

export type CoordinatorAuditEntry = {
  id: string;
  campaignId: string;
  step: CoordinatorAuditStep;
  occurredAt: string;
  summary: string;
  context?: DecisionContext;
  outcome?: DecisionOutcome;
  effects?: readonly PlannedEffect[];
  observationId?: string;
  learningCandidateId?: string;
};

export type IncomingInteractionRecord = {
  campaignId: string;
  jobId?: string;
  interactionKind: CustomerInteractionKind;
  occurredAt: string;
};

export type CoordinatorSession = {
  auditLog: CoordinatorAuditEntry[];
  observations: CoordinatorObservation[];
  learningCandidates: LearningCandidate[];
  incomingInteractions: IncomingInteractionRecord[];
};

export type CoordinatorExecutionState = {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  materials: readonly CampaignMaterialItem[];
  jobs: readonly PurchasedJobRecord[];
  materialsEnvelope?: ServerMaterialsEnvelope;
};

export type ClientCoordinatorEventType = IncomingCustomerEventType | "communication_sync";

export type ClientCoordinatorEvent = {
  type: ClientCoordinatorEventType;
  campaignId: string;
  jobId?: string;
  occurredAt: string;
  facts: Record<string, unknown>;
};

export type OwnerCoordinatorAction =
  | "resolve_exception"
  | "approve_client_request"
  | "assign_exception"
  | "decline_promotion";

export type OwnerCoordinatorOutcome = {
  campaignId: string;
  exceptionId: string;
  action: OwnerCoordinatorAction;
  occurredAt: string;
  user: StudioUser;
  assignments: CampaignAssignmentsFile;
  payload?: Record<string, unknown>;
};

export type CoordinatorClientSummary = {
  message: string;
  determination: DecisionOutcome["determination"];
  humanReviewRequired: boolean;
};

export type CoordinatorOwnerSummary = {
  message: string;
  action: OwnerCoordinatorAction;
  learningCandidateRecorded: boolean;
};

export type CoordinateClientEventResult = {
  outcome: DecisionOutcome;
  state: CoordinatorExecutionState;
  session: CoordinatorSession;
  summary: CoordinatorClientSummary;
  observations: CoordinatorObservation[];
};

export type CoordinateOwnerOutcomeResult = {
  state: CoordinatorExecutionState;
  session: CoordinatorSession;
  summary: CoordinatorOwnerSummary;
  observations: CoordinatorObservation[];
};

export type EffectExecutionContext = {
  campaignId: string;
  jobId?: string;
  occurredAt: string;
  user: StudioUser;
  assignments: CampaignAssignmentsFile;
  clientId?: string;
  interactionKind?: CustomerInteractionKind;
  taskId?: string;
  payload?: Record<string, unknown>;
};

export type DomainRoute = {
  domain: DecisionDomain;
  buildContext: (event: ClientCoordinatorEvent, state: CoordinatorExecutionState) => DecisionContext;
};

export type InteractionExceptionMapping = {
  interactionKind: CustomerInteractionKind;
  exceptionKind: CampaignExceptionKind;
  title: string;
};
