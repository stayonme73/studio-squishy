import type { ServiceId } from "@/catalog/types";

/** Internal job status spine — individual purchased SKU / job level. */
export type JobSpineStatus =
  | "ready_for_queue"
  | "building_concepts"
  | "ready_for_review"
  | "revision_requested"
  | "approved"
  | "ready_for_delivery"
  | "delivered"
  | "waiting_on_client"
  | "refunded_cancelled";

/** Three production lanes shown in Owner Control Room (catalog lanes map here). */
export type ProductionControlLane = "quick" | "standard" | "heavy";

export type OwnerDeskReason =
  | "approval_before_review"
  | "approval_before_delivery"
  | "deadline_exception"
  | "scope_issue"
  | "revision_limit_reached"
  | "at_risk_job"
  | "heavy_lane_full";

export type JobActivityEventKind =
  | "payment"
  | "intake"
  | "missing_material_request"
  | "reminder"
  | "client_response"
  | "client_upload"
  | "status_change"
  | "review_notice"
  | "approval"
  | "delivery"
  | "refund"
  | "internal_note"
  | "working_file_ref"
  | "deliverable_prepared"
  | "client_review_feedback"
  | "client_revision_request"
  | "client_delivery_approval";

export type JobInternalNote = {
  id: string;
  content: string;
  createdAt: string;
  author: JobActivityActor;
};

export type JobWorkingFileRef = {
  id: string;
  label: string;
  url: string;
  addedAt: string;
  author: JobActivityActor;
};

export type JobDeliverablePrep = {
  deliverableKey: string;
  label: string;
  preparedAt?: string;
  preparedBy?: JobActivityActor;
};

export type JobActivityActor = {
  role: "owner" | "staff" | "client" | "system";
  userId?: string;
  displayName?: string;
};

/** Persisted per purchased job — stored on campaign tasks envelope (schema v7). */
export type PurchasedJobRecord = {
  jobId: string;
  campaignId: string;
  skuId: ServiceId;
  serviceName: string;
  spineStatus: JobSpineStatus;
  productionLane: ProductionControlLane;
  /** Explicit spine override — when set, derivation respects unless terminal. */
  spineStatusSetAt?: string;
  spineStatusSetBy?: JobActivityActor;
  spineStatusReason?: string;
  intakeComplete: boolean;
  productionStartedAt?: string | null;
  waitingOnClientSince?: string | null;
  lastClientResponseAt?: string | null;
  lastReminderSentAt?: string | null;
  returnLane?: ProductionControlLane;
  ownerApprovalPending?: "before_review" | "before_delivery" | null;
  nonRefundable?: boolean;
  refundEligibleAt?: string | null;
  laneQueuedAt?: string;
  /** Required deliverable prep checklist — internal only. */
  deliverablePrep?: readonly JobDeliverablePrep[];
  /** Internal production notes — never shown to client. */
  internalNotes?: readonly JobInternalNote[];
  /** Internal working-file links — never shown to client. */
  workingFileRefs?: readonly JobWorkingFileRef[];
  clientDeadline?: string | null;
  updatedAt: string;
};

export type JobActivityEvent = {
  id: string;
  campaignId: string;
  jobId: string;
  kind: JobActivityEventKind;
  occurredAt: string;
  actor: JobActivityActor;
  spineStatus?: JobSpineStatus;
  reason?: string;
  messageContent?: string;
  messageRef?: string;
};
