import type { ServiceFamilyId, ServiceId } from "@/catalog/types";

import type {
  CampaignExceptionEvent,
  CampaignExceptionRecord,
} from "./exceptions-types";
import type {
  JobActivityEvent,
  JobCommunicationRecord,
  PurchasedJobRecord,
} from "@/lib/job-control/types";

export type {
  CampaignExceptionEvent,
  CampaignExceptionRecord,
  CampaignExceptionStatus,
  CampaignExceptionKind,
} from "./exceptions-types";

export type TaskPhase =
  | "strategy"
  | "strategy_content_direction"
  | "review_strategy"
  | "copy"
  | "creative"
  | "creative_copy"
  | "creative_production"
  | "qa"
  | "delivery_prep";

/** Internal production roles — no AI employee identities. */
export type ProductionRole =
  | "producer_dispatcher"
  | "strategy"
  | "copy"
  | "creative_production"
  | "qa"
  | "owner"
  | "client_input";

/** Persisted workflow position on a task. */
export type TaskWorkflowState =
  | "unstarted"
  | "in_progress"
  | "ready_for_qa"
  | "needs_revision"
  | "blocked"
  | "complete"
  | "cancelled";

/** Locked API / customer-facing task status vocabulary. */
export type TaskEffectiveStatus =
  | "not_ready"
  | "ready"
  | "in_progress"
  | "ready_for_qa"
  | "needs_revision"
  | "blocked"
  | "complete"
  | "cancelled";

/** @deprecated Use TaskEffectiveStatus — kept for gradual migration. */
export type TaskStatus = TaskEffectiveStatus;

/** Computed readiness layer — not independently persisted. */
export type TaskReadiness = "gates_pending" | "eligible" | "material_blocked";

/** Template family — maps catalog families to shared production pipelines. */
export type ProductionTaskFamilyId =
  | "brand_identity_messaging"
  | "campaign_launch_monthly"
  | "social"
  | "copy_channels"
  | "video_audio"
  | "landing_page"
  | "optimization"
  | "marketing_assets";

export type CampaignTaskItem = {
  id: string;
  title: string;
  phase: TaskPhase;
  /** Effective status — computed on read from readiness + workflow. */
  status: TaskEffectiveStatus;
  relatedServiceIds: readonly ServiceId[];
  familyId: ProductionTaskFamilyId;
  catalogFamilyId: ServiceFamilyId;
  serviceName: string;
  dependsOn: readonly string[];
  blockedReason?: string;
  /** Present for monthly-cycle SKUs — one current-cycle set in Slice 3a. */
  cycleLabel?: string;

  /** Persisted workflow state — defaults to unstarted for legacy JSON. */
  workflowState?: TaskWorkflowState;
  /** Set at generate from roles.ts. */
  responsibleRole?: ProductionRole;

  revisionOfTaskId?: string;
  revisionIndex?: number;

  workflowBlockedReason?: string;

  /** Active claim — one claimant at a time; `claimedAt` is the optimistic concurrency token. */
  claimedByUserId?: string;
  claimedByDisplayName?: string;
  claimedAt?: string;
  /** Producer override when role differs from template default. */
  assignedRole?: ProductionRole;
  lastHandoffId?: string;
};

export type TaskHandoffAction = "submit_for_handoff" | "release_claim" | "reassign";

export type TaskHandoffRecord = {
  id: string;
  taskId: string;
  campaignId: string;
  createdAt: string;
  fromUserId: string;
  fromDisplayName: string;
  fromRole: ProductionRole;
  toRole: ProductionRole;
  transition: {
    from: TaskWorkflowState;
    to: TaskWorkflowState;
  };
  completedSummary: string;
  sourceContext: string;
  nextSteps: string;
  openQuestions?: string;
  risks?: string;
  workRef?: string;
  /** Kitchen V1 — pins exact production version on handoff (sm-001 production phases). */
  workVersionId?: string;
  internalNotes?: string;
  action: TaskHandoffAction;
  reassignmentReason?: string;
  reassignmentFlags?: {
    changesPriority?: boolean;
    changesDeadlineCommitment?: boolean;
    changesClientFacingScope?: boolean;
    createsMaterialRisk?: boolean;
  };
};

export type HandoffPayload = {
  completedSummary: string;
  sourceContext: string;
  nextSteps: string;
  openQuestions?: string;
  risks?: string;
  workRef?: string;
  /** Kitchen V1 — required for new sm-001 production phase handoffs. */
  workVersionId?: string;
  internalNotes?: string;
};

export type ReassignmentFlags = {
  changesPriority?: boolean;
  changesDeadlineCommitment?: boolean;
  changesClientFacingScope?: boolean;
  createsMaterialRisk?: boolean;
};

export type FrozenPlanSnapshot = {
  version: number;
  planFingerprint: string;
  frozenAt: string;
};

export type CampaignTasksRecord = {
  campaignId: string;
  tasks: CampaignTaskItem[];
  planFingerprint: string;
  planVersion?: number;
  frozenPlanSnapshots?: FrozenPlanSnapshot[];
  planChangePendingOwnerApproval?: boolean;
  /** Append-only handoff ledger — never edit or remove entries. */
  handoffs?: TaskHandoffRecord[];
  /** Append-only QA ledger — never edit or remove entries (schema v4). */
  qaRecords?: QaRecord[];
  /** Exception entities — status may update; entries are never removed (schema v5). */
  exceptionRecords?: CampaignExceptionRecord[];
  /** Append-only exception audit trail (schema v5). */
  exceptionEvents?: CampaignExceptionEvent[];
  /** Job-level spine records — one per purchased production SKU (schema v7). */
  jobRecords?: PurchasedJobRecord[];
  /** Append-only job activity timeline (schema v7). */
  jobActivityEvents?: JobActivityEvent[];
  /** Job-scoped client review feedback sessions (schema v8). */
  jobReviewFeedback?: import("@/lib/job-control/review-feedback-types").JobReviewFeedback[];
  /** Durable client communication outbox / receipts (schema v9). */
  jobCommunicationRecords?: JobCommunicationRecord[];
  /** Owner decision desk — interaction-backed folders (schema v11). */
  ownerDecisionInteractions?: import("./owner-decision-interaction-types").OwnerDecisionInteractionRecord[];
  /** Schema v10 adds internal job Work Packets on PurchasedJobRecord. Schema v11 adds ownerDecisionInteractions. */
  updatedAt: string;
  /** Envelope schema version — 11 adds owner decision interaction records. */
  version: number;
};

export type ServerTasksEnvelope = CampaignTasksRecord & {
  syncedAt: string;
};

export type TaskReadinessContext = {
  hasApprovedPlan: boolean;
  directionApproved: boolean;
  projectDetailsSubmitted: boolean;
};

/** QA authority dispositions — used by transition guards and QA PATCH actions. */
export type QaDisposition =
  | "approve_next_stage"
  | "return_failed_check"
  | "mark_blocked";

export type QaAction = "qa_pass" | "qa_fail" | "qa_block";

export type QaFailCategory =
  | "production_correction"
  | "missing_client_fact"
  | "scope_change";

export type QaBlockCategory = "compliance_concern" | "direction_disagreement";

export type QaRecord = {
  id: string;
  taskId: string;
  campaignId: string;
  createdAt: string;
  actorUserId: string;
  actorDisplayName: string;
  actorRole: ProductionRole;
  action: QaAction;
  category?: QaFailCategory | QaBlockCategory;
  checks?: readonly string[];
  notes?: string;
  routedTaskId?: string;
  missingFactDescription?: string;
  missingFactReason?: string;
  /** Kitchen V1 — pins exact production version for QA (sm-001 production phases). */
  workVersionId?: string;
};

export type WorkflowTransitionRequest = {
  taskId: string;
  from: TaskWorkflowState;
  to: TaskWorkflowState;
  actorRole: ProductionRole;
  qaDisposition?: QaDisposition;
  /** Authorized reopen of completed upstream work via qa_fail only. */
  authorizedQaFailReopen?: boolean;
};
