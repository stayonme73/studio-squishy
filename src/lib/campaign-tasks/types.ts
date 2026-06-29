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
  updatedAt: string;
  /** Envelope schema version — 2 adds workflow fields. */
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
