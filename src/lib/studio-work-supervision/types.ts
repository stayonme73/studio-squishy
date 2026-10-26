import type {
  StudioIncidentClass,
  StudioSupervisionRole,
} from "@/config/studio-work-supervision-and-incident-escalation-v1";

export type SupervisionRecoveryAction =
  | "none"
  | "retry_transport"
  | "enqueue_customer_notice"
  | "continue_internal_correction"
  | "hold_and_inform_customer"
  | "escalate_studio_manager"
  | "escalate_owner"
  | "hold_owner_unavailable"
  | "fail_closed_refund";

export type CustomerIncidentMessage = {
  whatHappened: string;
  whatStudioIsDoing: string;
  customerMustAct: boolean;
  customerAction: string;
  revisionEntitlementProtected: boolean;
  whatHappensNext: string;
};

export type SupervisionIncident = {
  id: string;
  jobId: string;
  skuId: string;
  class: StudioIncidentClass;
  actor: StudioSupervisionRole;
  recovery: SupervisionRecoveryAction;
  customerMustBeInformed: boolean;
  customerMessage: CustomerIncidentMessage | null;
  ownerRequired: boolean;
  studioManagerRequired: boolean;
  ownerUnavailableHold: boolean;
  recoveryAttemptsUsed: number;
  recoveryAttemptsMax: number;
  wouldAuthorizeSpend: false;
  wouldCallProvider: false;
  reason: string;
};

export type JobSupervisionFacts = {
  jobId: string;
  skuId: string;
  serviceName?: string;
  spineStatus?: string;
  ownerApprovalPending?: "before_review" | "before_delivery" | null;
  lastActivityAt?: string;
  productionAttemptsUsed: number;
  pendingCustomerRevision: boolean;
  unresolvedQaFail: boolean;
  customerInformedOfIncident: boolean;
  waitingOnCustomer: boolean;
  failedTransport: boolean;
  missingAuthorizedNotice: boolean;
  securityPrivacyRightsHold?: boolean;
  studioManagerReviewRequired?: boolean;
};

export type SupervisionEvaluationInput = {
  campaignId: string;
  nowMs: number;
  ownerAvailable: boolean;
  jobs: readonly JobSupervisionFacts[];
};

export type SupervisionEvaluation = {
  campaignId: string;
  incidents: readonly SupervisionIncident[];
  /** Highest-severity actor per job. Never two writers. */
  activeActorByJob: Readonly<Record<string, StudioSupervisionRole>>;
  customerMessages: readonly CustomerIncidentMessage[];
  ownerEscalations: readonly SupervisionIncident[];
  studioManagerReviews: readonly SupervisionIncident[];
  ownerUnavailableHolds: readonly SupervisionIncident[];
  wouldAuthorizeSpend: false;
  wouldCallProvider: false;
};
