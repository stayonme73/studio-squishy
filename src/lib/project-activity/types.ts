import type { FieldChangeToken } from "@/lib/customer-field-tokens";
import type { RequestTargetKey } from "@/lib/customer-field-tokens";
import type { ProjectChangeDelta } from "@/lib/project-change/types";

export type CustomerRequestStatus =
  | "request_received"
  | "needs_studio_review"
  | "needs_clarification"
  | "approved_for_apply"
  | "applied"
  | "rejected"
  | "held";

export type RequestClassification = "information_update" | "project_change" | null;

/** Customer consent for an owner-requested project change approval. */
export type ProjectChangeConsentStatus = "none" | "pending" | "granted" | "declined";

/** Typed owner outcome on a linked project change request — not derived from copy. */
export type ProjectChangeOwnerDecision = "approved" | "declined" | "held" | "approval_requested";

export type ActivitySourceType =
  | "information_update_request"
  | "materials_submit"
  | "staff_classify"
  | "staff_apply"
  | "staff_reject"
  | "staff_clarify"
  | "staff_escalate"
  | "owner_decision"
  | "customer_consent"
  | "system_apply"
  | "system";

export type ProjectActivityAuditEventKind =
  | "request_received"
  | "request_classified"
  | "clarification_requested"
  | "customer_response_received"
  | "update_applied"
  | "update_rejected"
  | "stale_field_token_conflict"
  | "escalated_to_project_change"
  | "project_change_escalated"
  | "owner_decision_recorded"
  | "customer_approval_requested"
  | "customer_approval_granted"
  | "customer_approval_declined"
  | "project_change_applied"
  | "project_change_closed"
  | "material_submitted"
  | "material_approved"
  | "material_needs_clarification";

export type InformationUpdateRequest = {
  id: string;
  campaignId: string;
  idempotencyKey: string;
  targetKey: RequestTargetKey;
  targetLabel: string;
  previousValueCaptured: string | null;
  requestedValue: string;
  note?: string;
  fieldTokenAtCapture: FieldChangeToken | null;
  status: CustomerRequestStatus;
  classification: RequestClassification;
  /** Staff-only assist hint — never customer-visible */
  suggestedClassification?: RequestClassification;
  submittedBy: { userId: string; displayName?: string };
  submittedAt: string;
  classifiedAt?: string;
  classifiedBy?: string;
  appliedAt?: string;
  appliedBy?: string;
  rejectionReason?: string;
  /** Linked Owner Desk scope_change exception — set when escalation bridge runs. */
  projectChangeExceptionId?: string;
  escalatedAt?: string;
  /** Owner-requested client approval for a classified project change. */
  consentStatus?: ProjectChangeConsentStatus;
  consentRequestedAt?: string;
  consentRespondedAt?: string;
  ownerDecision?: ProjectChangeOwnerDecision;
  ownerDecisionAt?: string;
  /** Typed delta applied to approvedStudioPlan — set when apply completes. */
  appliedChange?: ProjectChangeDelta;
};

export type PendingCustomerRequest = Pick<
  InformationUpdateRequest,
  "status" | "classification" | "consentStatus"
>;

export type ProjectActivityAuditEvent = {
  id: string;
  campaignId: string;
  occurredAt: string;
  kind: ProjectActivityAuditEventKind;
  sourceType: ActivitySourceType;
  sourceId: string;
  actor: { role: "customer" | "staff" | "system"; userId?: string; displayName?: string };
  requestId?: string;
  headline: string;
  detail?: string;
  payload?: Record<string, unknown>;
};

export type ProjectActivityEnvelope = {
  campaignId: string;
  events: readonly ProjectActivityAuditEvent[];
  requests: readonly InformationUpdateRequest[];
  updatedAt: string;
  version: number;
};

export type CustomerTimelineItem = {
  id: string;
  occurredAt: string;
  headline: string;
  detail?: string;
  kind: ProjectActivityAuditEventKind;
  /** Present on request-linked events — used to confirm a specific submission. */
  requestId?: string;
};
