import type { ServiceId } from "@/catalog/types";
import type { StudioFileReference, StudioFileStorageReference } from "@/lib/file-registry/types";

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
  | "heavy_lane_full"
  | "refund_eligible"
  | "client_complaint";

export type JobCommunicationEventType =
  | "payment_received"
  | "intake_incomplete_materials_needed"
  | "reminder_48_hour"
  | "waiting_on_client_72_hour"
  | "materials_received_returned_to_queue"
  | "production_started"
  | "ready_for_review"
  | "revision_requested"
  | "revision_ready_again"
  | "approved_for_delivery"
  | "final_delivery_available"
  | "refund_eligibility_14_day"
  | "refund_issued";

export type JobCommunicationChannel = "in_app_outbox" | "test_email";

export type JobCommunicationDeliveryStatus =
  | "pending_owner_send"
  | "test_sent"
  | "cancelled";

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
  | "client_review_received"
  | "client_revision_request"
  | "client_delivery_approval"
  /** Legacy name — system actor = routine Final Delivery auth; owner actor = exception path. */
  | "owner_final_release"
  | "client_delivery_file_added"
  | "file_reference_added"
  | "file_visibility_changed"
  | "file_version_updated"
  | "file_released"
  | "file_download_available"
  | "delivery_completed"
  | "work_packet_assigned"
  | "work_packet_returned"
  | "client_communication";

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
  registryFileId?: string;
  storageRef?: StudioFileStorageReference;
};

/** Team Office roles that can receive an internal job Work Packet. */
export type JobWorkPacketRole =
  | "producer_dispatcher"
  | "strategy"
  | "copy"
  | "creative_production"
  | "qa";

export type JobWorkPacketStatus = "assigned" | "returned";

export type JobWorkPacketFileKind = "draft" | "final";

export type JobWorkPacketAssignmentEvent = {
  id: string;
  assignedAt: string;
  assignedBy: JobActivityActor;
  role: JobWorkPacketRole;
  note?: string;
};

export type JobWorkPacketReturnedFileRef = {
  id: string;
  kind: JobWorkPacketFileKind;
  label: string;
  url: string;
  returnedAt: string;
  returnedBy: JobActivityActor;
  registryFileId?: string;
  storageRef?: StudioFileStorageReference;
  deliverableKey?: string;
  deliverableLabel?: string;
  note?: string;
};

export type JobWorkPacket = {
  id: string;
  jobId: string;
  campaignId: string;
  role: JobWorkPacketRole;
  taskIds: readonly string[];
  status: JobWorkPacketStatus;
  createdAt: string;
  updatedAt: string;
  assignmentEvents: readonly JobWorkPacketAssignmentEvent[];
  returnedFileRefs: readonly JobWorkPacketReturnedFileRef[];
  returnLocation: "production_workspace";
  ownerApprovalRequired: boolean;
};

export type JobDeliverablePrep = {
  deliverableKey: string;
  label: string;
  preparedAt?: string;
  preparedBy?: JobActivityActor;
};

/** Client-visible final file — promoted from production prep, never internal working refs. */
export type JobClientDeliveryFile = {
  id: string;
  registryFileId?: string;
  deliverableKey: string;
  deliverableLabel: string;
  fileName: string;
  fileType: string;
  url: string;
  storageRef?: StudioFileStorageReference;
  versionLabel?: string;
  visibility?: "client_visible";
  releaseStatus?: "pending_release" | "released";
  releasedAt?: string;
  useInstructions?: string;
  addedAt: string;
  addedBy: JobActivityActor;
  /** Exact content identity when known — preferred over filename for delivery match. */
  contentSha256?: string;
  artifactId?: string;
  /** Work version the file belongs to (must match customer approval pin when present). */
  approvedWorkVersionId?: string;
  /** CustomerApprovedArtifactAuthorization.decisionId this file is bound to. */
  approvedAuthorizationDecisionId?: string;
};

export type JobActivityActor = {
  role: "owner" | "staff" | "client" | "system";
  userId?: string;
  displayName?: string;
};

export type JobAcceptanceReviewStatus = "pending" | "accepted" | "blocked";

export type JobAcceptanceReviewRoute =
  | "squishy_decision_core"
  | "production"
  | "client"
  | "owner";

export type JobAcceptanceReview = {
  status: JobAcceptanceReviewStatus;
  reviewedAt?: string;
  reviewedBy?: JobActivityActor;
  clientConfirmed: readonly string[];
  studioConfirmed: readonly string[];
  missingMaterials: readonly string[];
  risks: readonly string[];
  assumptions: readonly string[];
  routeTo?: JobAcceptanceReviewRoute;
  note?: string;
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
  /** Set when Owner acts on refund-eligible desk folder — clears desk item. */
  refundOwnerDecisionAt?: string | null;
  /** Owner heavy-lane queue decision — clears heavy-lane desk item for queued job. */
  heavyLaneOwnerDecision?: "wait" | "bump" | null;
  laneQueuedAt?: string;
  /** Required deliverable prep checklist — internal only. */
  deliverablePrep?: readonly JobDeliverablePrep[];
  /** Internal production notes — never shown to client. */
  internalNotes?: readonly JobInternalNote[];
  /** Internal working-file links — never shown to client. */
  workingFileRefs?: readonly JobWorkingFileRef[];
  /** Internal job Work Packets — Team Office assignment and file-return trail. */
  workPackets?: readonly JobWorkPacket[];
  /** Pre-production mutual understanding gate before production starts. */
  acceptanceReview?: JobAcceptanceReview;
  /**
   * Internal QA authorization pin — set only when opening customer Review.
   * Customer Review access requires this after PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1.
   */
  internalQaReviewAuthorization?: {
    status: "ELIGIBLE_FOR_REVIEW";
    decisionId: string;
    packageId: string;
    skuId: string;
    qaRecordIds: readonly string[];
    workVersionId: string | null;
    contentSha256s: readonly string[];
    artifactIds: readonly string[];
    authorizedAt: string;
  };
  /**
   * Customer creative approval pin — exact Review candidate approved for delivery.
   * Does not authorize Studio release; Owner release gates remain separate.
   */
  customerApprovedArtifactAuthorization?: {
    status: "CUSTOMER_APPROVED";
    decisionId: string;
    schemaVersion: number;
    packageId: string;
    jobId: string;
    campaignId: string;
    skuId: string;
    workVersionId: string | null;
    artifactIds: readonly string[];
    contentSha256s: readonly string[];
    qaRecordIds: readonly string[];
    reviewPackageId: string;
    releaseActivityId: string | null;
    approvedAt: string;
    feedbackSubmissionType: "approved_for_delivery";
    sourceQaDecisionId: string;
  };
  /**
   * Final delivery authorization — set at mark_delivered.
   * Reconstructs customer approval → exact delivered artifact identity.
   */
  finalDeliveryAuthorization?: {
    status: "DELIVERED";
    deliveryId: string;
    approvedAuthorizationDecisionId: string;
    workVersionId: string | null;
    contentSha256s: readonly string[];
    artifactIds: readonly string[];
    clientDeliveryFileIds: readonly string[];
    reviewPackageId: string;
    sourceQaDecisionId: string;
    deliveredAt: string;
    packageId: string;
  };
  /** Canonical File Room registry — metadata and storage refs only, never public provider links. */
  fileRegistry?: readonly StudioFileReference[];
  /** Client-facing final delivery files — shown in Final Delivery only. */
  clientDeliveryFiles?: readonly JobClientDeliveryFile[];
  deliveredAt?: string | null;
  clientDeadline?: string | null;
  updatedAt: string;
};

export type JobCommunicationRecord = {
  id: string;
  campaignId: string;
  clientId: string;
  jobId: string;
  skuId: ServiceId;
  serviceName: string;
  eventType: JobCommunicationEventType;
  templateId: string;
  channel: JobCommunicationChannel;
  sender: JobActivityActor;
  reason: string;
  messageContent: string;
  deliveryStatus: JobCommunicationDeliveryStatus;
  createdAt: string;
  updatedAt: string;
  activityEventId: string;
  testSentAt?: string;
  testSentBy?: JobActivityActor;
  testRecipient?: string;
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
  communicationEventType?: JobCommunicationEventType;
  communicationDeliveryStatus?: JobCommunicationDeliveryStatus;
  communicationChannel?: JobCommunicationChannel;
};
