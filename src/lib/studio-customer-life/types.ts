import type { CampaignRecord } from "@/config/studio-board";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

export type CustomerLifeQuestionIntent =
  | "payment"
  | "need_anything"
  | "received_upload"
  | "work_started"
  | "flyer_status"
  | "holding_up"
  | "when_review"
  | "can_changes"
  | "revisions_left"
  | "received_revision"
  | "new_version_ready"
  | "which_version_approved"
  | "final_files"
  | "production_assigned"
  | "qa_status"
  | "current_review_version"
  | "revision_applied"
  | "unknown";

export type CustomerLifePhase =
  | "no_project"
  | "unpaid"
  | "recovering"
  | "awaiting_intake"
  | "awaiting_materials"
  | "producing"
  | "internal_qa"
  | "ready_for_review"
  | "revision"
  | "approved"
  | "delivered";

export type CustomerLifeRecoveryClass =
  | "automatic"
  | "retryable"
  | "waiting_on_customer"
  | "true_owner_decision";

export type CustomerLifeStall = {
  id: string;
  summary: string;
  recoveryClass: CustomerLifeRecoveryClass;
};

export type CustomerLifeWaitingOn = "customer" | "studio" | "none";

export type CustomerLifeQaState = "not_recorded" | "passed" | "failed" | "blocked";

export type CustomerLifeTruth = {
  campaignId: string | null;
  phase: CustomerLifePhase;
  paymentConfirmed: boolean;
  intakeComplete: boolean;
  blockingMaterialsCount: number;
  receivedMaterialCount: number;
  unusableMaterialCount: number;
  storedNotApprovedCount: number;
  approvedForUseCount: number;
  activationPendingRetry: boolean;
  productionStarted: boolean;
  productionAssigned: boolean;
  waitingOn: CustomerLifeWaitingOn;
  waitingOnSummary: string | null;
  qaPassed: boolean;
  qaHappened: boolean;
  qaState: CustomerLifeQaState;
  reviewEligible: boolean;
  revisionRequested: boolean;
  revisionAllowanceIncluded: number;
  revisionAllowanceRemaining: number;
  approvedVersionLabel: string | null;
  approvedContentSha256: string | null;
  currentReviewVersionLabel: string | null;
  revisionChangeApplied: boolean | null;
  finalDeliveryReady: boolean;
  spineStatus: string | null;
  serviceName: string;
  stalls: readonly CustomerLifeStall[];
  ownerActionRequired: false;
};

export type CustomerLifeAnswer = {
  intent: CustomerLifeQuestionIntent;
  text: string;
  known: boolean;
  phase: CustomerLifePhase;
  source: "machine_record" | "none";
};

export type CustomerLifeAskResult = {
  answer: CustomerLifeAnswer;
  truth: CustomerLifeTruth;
};

export type CustomerLifeInput = {
  campaign: CampaignRecord | null;
  materials?: readonly CampaignMaterialItem[];
  tasks?: ServerTasksEnvelope | null;
};
