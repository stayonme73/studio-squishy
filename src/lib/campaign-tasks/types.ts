import type { ServiceFamilyId, ServiceId } from "@/catalog/types";

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
  updatedAt: string;
  /** Envelope schema version — 3 adds claims + handoffs. */
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

/** QA authority dispositions — validation types only in Slice 3b-a. */
export type QaDisposition =
  | "approve_next_stage"
  | "return_failed_check"
  | "mark_blocked";

export type WorkflowTransitionRequest = {
  taskId: string;
  from: TaskWorkflowState;
  to: TaskWorkflowState;
  actorRole: ProductionRole;
  qaDisposition?: QaDisposition;
};
