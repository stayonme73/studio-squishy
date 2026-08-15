import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import type { ProductionRole } from "@/lib/campaign-tasks/types";
import type {
  JobActivityEventKind,
  JobCommunicationEventType,
  JobSpineStatus,
} from "@/lib/job-control/types";

/** Projection contract — references authoritative production truth; not a second store. */
export type KitchenOperationalEventCategory =
  | "production"
  | "materials"
  | "qa"
  | "handoff"
  | "customer_operational"
  | "policy_decision"
  | "escalation"
  | "communication_outbox"
  | "delivery_review"
  | "unknown";

export type KitchenCommsVisibility = "internal_only" | "customer_safe_candidate";

export type KitchenCommsActionKind =
  | "information_only"
  | "role_action"
  | "manager_review"
  | "owner_decision";

export type KitchenCommsLifecycle =
  | "new"
  | "routed"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "historical";

export type KitchenOwnerEscalationVerdict =
  | "owner_required"
  | "owner_not_required"
  | "owner_authority_unclear";

/**
 * Projection over raw pending_owner_send.
 * Transport clearance requires existing job-control template authority —
 * Kitchen does not invent that whitelist.
 */
export type KitchenOutboxDisposition =
  | "awaiting_authorized_transport"
  | "owner_decision_required"
  | "sent"
  | "test_sent"
  | "cancelled"
  | "unknown";

export type KitchenCommsRecipient =
  | { kind: "production_role"; role: ProductionRole }
  | { kind: "owner" }
  | { kind: "manager" }
  | { kind: "client" }
  | { kind: "system" }
  | { kind: "unassigned"; note: string };

export type KitchenOperationalEvent = {
  eventId: string;
  occurredAt: string;
  campaignId: string;
  jobId: string | null;
  taskId: string | null;
  workPacketId: string | null;
  category: KitchenOperationalEventCategory;
  eventType: string;
  sourceComponent: string;
  initiatingActor: {
    role: string;
    userId?: string;
    displayName?: string;
  };
  recipients: readonly KitchenCommsRecipient[];
  visibility: KitchenCommsVisibility;
  actionKind: KitchenCommsActionKind;
  lifecycle: KitchenCommsLifecycle;
  ownerEscalation: KitchenOwnerEscalationVerdict;
  actionRequired: boolean;
  resolved: boolean;
  internalSummary: string;
  customerSafeSummary: string | null;
  correlation: {
    activityEventId?: string;
    communicationRecordId?: string;
    exceptionId?: string;
    qaRecordId?: string;
    handoffId?: string;
    ownerInteractionId?: string;
    materialItemId?: string;
  };
  references: {
    spineStatus?: JobSpineStatus;
    exceptionKind?: CampaignExceptionKind;
    activityKind?: JobActivityEventKind;
    communicationEventType?: JobCommunicationEventType;
  };
  uncertainty?: string | null;
};

export type KitchenCommsLedger = {
  campaignId: string;
  refreshedAt: string;
  active: readonly KitchenOperationalEvent[];
  history: readonly KitchenOperationalEvent[];
  ownerRequiredCount: number;
  awaitingTransportCount: number;
  unresolvedRoleActionCount: number;
  ownerAuthorityUnclearCount: number;
};
