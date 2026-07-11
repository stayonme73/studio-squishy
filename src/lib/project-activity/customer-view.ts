import type { CustomerTimelineItem, ProjectActivityAuditEvent } from "./types";

const CUSTOMER_VISIBLE_KINDS = new Set<ProjectActivityAuditEvent["kind"]>([
  "request_received",
  "stale_field_token_conflict",
  "clarification_requested",
  "customer_response_received",
  "update_applied",
  "update_rejected",
  "escalated_to_project_change",
  "material_submitted",
  "material_approved",
  "material_needs_clarification",
]);

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
  return event.headline;
}

export function countPendingCustomerRequests(
  requests: readonly { status: string }[],
): number {
  return requests.filter((r) =>
    ["request_received", "needs_studio_review", "needs_clarification", "approved_for_apply"].includes(
      r.status,
    ),
  ).length;
}
