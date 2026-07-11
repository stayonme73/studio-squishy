import type { FieldChangeToken } from "@/lib/customer-field-tokens";
import type { RequestTargetKey } from "@/lib/customer-field-tokens";

export type CustomerRequestStatus =
  | "request_received"
  | "needs_studio_review"
  | "needs_clarification"
  | "approved_for_apply"
  | "applied"
  | "rejected"
  | "held";

export type RequestClassification = "information_update" | "project_change" | null;

export type ActivitySourceType =
  | "information_update_request"
  | "materials_submit"
  | "staff_classify"
  | "staff_apply"
  | "staff_reject"
  | "staff_clarify"
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
};

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
