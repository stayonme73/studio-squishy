import type {
  CustomerTimelineItem,
  PendingCustomerRequest,
  ProjectActivityAuditEvent,
  ProjectActivityEnvelope,
} from "./types";

/** Customer-safe pending consent surface — no internal Owner Desk fields. */
export type CustomerPendingProjectChangeConsent = {
  requestId: string;
  ownerMessage: string;
  requestSummary: string;
};

const CUSTOMER_VISIBLE_KINDS = new Set<ProjectActivityAuditEvent["kind"]>([
  "request_received",
  "stale_field_token_conflict",
  "clarification_requested",
  "customer_response_received",
  "update_applied",
  "update_rejected",
  "escalated_to_project_change",
  "project_change_escalated",
  "owner_decision_recorded",
  "customer_approval_requested",
  "customer_approval_granted",
  "customer_approval_declined",
  "project_change_applied",
  "project_change_closed",
  "material_submitted",
  "material_approved",
  "material_needs_clarification",
]);

const PENDING_REQUEST_STATUSES = new Set<PendingCustomerRequest["status"]>([
  "request_received",
  "needs_studio_review",
  "needs_clarification",
  "approved_for_apply",
  "held",
]);

export function isPendingCustomerRequest(request: PendingCustomerRequest): boolean {
  if (PENDING_REQUEST_STATUSES.has(request.status)) return true;
  return request.consentStatus === "pending";
}

export function isAwaitingProjectChangeConsent(request: PendingCustomerRequest): boolean {
  return request.classification === "project_change" && request.consentStatus === "pending";
}

export function projectActivityToCustomerTimeline(
  events: readonly ProjectActivityAuditEvent[],
): CustomerTimelineItem[] {
  return events
    .filter((event) => CUSTOMER_VISIBLE_KINDS.has(event.kind))
    .map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      headline: customerHeadline(event),
      detail: event.detail,
      kind: event.kind,
      requestId: event.requestId,
    }))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function customerHeadline(event: ProjectActivityAuditEvent): string {
  if (event.kind === "stale_field_token_conflict") {
    return "This request needs Studio review";
  }
  if (event.kind === "request_classified") {
    return "Under review";
  }
  if (event.kind === "owner_decision_recorded") {
    const decision = event.payload?.decision;
    if (decision === "approved") return "Project change approved";
    if (decision === "declined") return "Project change declined";
    if (decision === "held") return "Project change on hold";
    if (decision === "approval_requested") return "The Studio needs your confirmation";
    return event.headline;
  }
  if (event.kind === "customer_approval_requested") {
    return "The Studio needs your confirmation";
  }
  if (event.kind === "customer_approval_granted") {
    return "You confirmed this project change";
  }
  if (event.kind === "customer_approval_declined") {
    return "You declined this project change";
  }
  if (event.kind === "project_change_applied") {
    return "Project change applied";
  }
  if (event.kind === "project_change_closed") {
    return event.headline;
  }
  if (event.kind === "project_change_escalated") {
    return "Submitted for Studio review";
  }
  return event.headline;
}

export function countPendingCustomerRequests(
  requests: readonly PendingCustomerRequest[],
): number {
  return requests.filter(isPendingCustomerRequest).length;
}

export function resolveCustomerPendingProjectChangeConsent(
  envelope: ProjectActivityEnvelope,
): CustomerPendingProjectChangeConsent | null {
  const request = envelope.requests.find(
    (entry) =>
      entry.classification === "project_change" &&
      entry.consentStatus === "pending" &&
      entry.ownerDecision === "approval_requested" &&
      entry.projectChangeExceptionId &&
      entry.status !== "rejected" &&
      entry.status !== "applied",
  );

  if (!request) return null;

  const approvalEvent = [...envelope.events]
    .reverse()
    .find(
      (event) => event.requestId === request.id && event.kind === "customer_approval_requested",
    );

  const receivedEvent = envelope.events.find(
    (event) => event.requestId === request.id && event.kind === "request_received",
  );

  return {
    requestId: request.id,
    ownerMessage:
      approvalEvent?.detail?.trim() ||
      "The Studio needs your confirmation before this change can proceed.",
    requestSummary: receivedEvent?.detail ?? request.requestedValue,
  };
}
