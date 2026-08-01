/**
 * UPDATE-HISTORY-1 — customer-safe Update History projection.
 * Reuses JobActivityEvent authority. Does not create a second event store.
 */

import { formatReceiptDateTime } from "./review-handoff-receipts";
import type { JobActivityActor, JobActivityEvent, JobActivityEventKind } from "./types";

export type CustomerUpdateHistoryItem = {
  id: string;
  occurredAt: string;
  occurredAtLabel: string | null;
  headline: string;
  detail: string | null;
  actorLabel: string;
  versionLabel: string | null;
  actionRequired: string | null;
  /** Source activity kind — for tests / debugging; not shown as internal jargon. */
  sourceKind: JobActivityEventKind;
};

/** True internals — never shown, even remapped. */
const NEVER_SHOW = new Set<JobActivityEventKind>([
  "internal_note",
  "working_file_ref",
  "deliverable_prepared",
  "file_reference_added",
  "file_visibility_changed",
  "client_delivery_file_added",
  "work_packet_assigned",
  "work_packet_returned",
  /** Refund UI is a separate Payment-room package — do not surface here. */
  "refund",
]);

/**
 * Kinds remapped for customers. Includes kinds previously filtered from
 * ClientReviewView.activity so Update History can tell a truthful Studio-update story.
 */
const CUSTOMER_HISTORY_KINDS = new Set<JobActivityEventKind>([
  "payment",
  "intake",
  "missing_material_request",
  "reminder",
  "client_response",
  "client_upload",
  "status_change",
  "review_notice",
  "approval",
  "delivery",
  "client_review_feedback",
  "client_review_received",
  "client_revision_request",
  "client_delivery_approval",
  "owner_final_release",
  "file_version_updated",
  "file_released",
  "file_download_available",
  "delivery_completed",
  /**
   * Chat lives in Project Communication. Generic client_communication activity
   * lines are not Update History — keep domains separate (UPDATE-HISTORY-INSPECT-1).
   */
]);

function actorLabel(actor: JobActivityActor): string {
  if (actor.role === "client") {
    return actor.displayName?.trim() || "You";
  }
  if (actor.role === "system") {
    return "The Studio";
  }
  return actor.displayName?.trim() || "The Studio";
}

function extractVersionLabel(event: JobActivityEvent): string | null {
  const reason = event.reason?.trim() ?? "";
  const versionMatch = reason.match(/\bVersion\s+([^\s·|,;]+)/i);
  if (versionMatch?.[1]) return `Version ${versionMatch[1]}`;
  if (/version label not provided/i.test(reason)) return null;
  return null;
}

function mapHeadline(event: JobActivityEvent): string | null {
  switch (event.kind) {
    case "payment":
      return "Payment received";
    case "intake":
      return "Project intake received";
    case "missing_material_request":
      return "The Studio requested materials";
    case "reminder":
      return "Reminder from The Studio";
    case "client_response":
      return "You responded to The Studio";
    case "client_upload":
      return "You uploaded materials";
    case "status_change": {
      switch (event.spineStatus) {
        case "ready_for_review":
          return "Studio submitted work for your review";
        case "revision_requested":
          return "Revision requested — Studio is updating your work";
        case "building_concepts":
          return "The Studio is building your concepts";
        case "ready_for_queue":
          return "Your project returned to the Studio queue";
        case "approved":
          return "Work approved for delivery";
        case "ready_for_delivery":
          return "Final delivery is being prepared";
        case "delivered":
          return "Your deliverables are ready";
        case "waiting_on_client":
          return "Waiting on you";
        default:
          return event.reason?.trim() || "Project status updated";
      }
    }
    case "review_notice":
      return "Studio sent a review notice";
    case "approval":
      return event.actor.role === "client"
        ? "You recorded an approval"
        : "Studio confirmed an approval step";
    case "delivery":
      return "Delivery update";
    case "delivery_completed":
      return "Delivery completed";
    case "client_review_received":
      return "You received this submission";
    case "client_review_feedback":
      return "Your review feedback was recorded";
    case "client_revision_request":
      return "You returned feedback to The Studio";
    case "client_delivery_approval":
      return "You approved this work for delivery";
    case "owner_final_release":
      return "Studio released final files";
    case "file_version_updated":
      return "Studio updated a file version";
    case "file_released":
      return "Studio released files for you";
    case "file_download_available":
      return "Files are ready to download";
    default:
      return null;
  }
}

function mapActionRequired(event: JobActivityEvent): string | null {
  if (event.kind === "status_change" && event.spineStatus === "ready_for_review") {
    return "Review this version and either return feedback or approve it";
  }
  if (event.kind === "file_released" || event.kind === "file_download_available") {
    return "Open your files when you are ready";
  }
  if (event.kind === "missing_material_request") {
    return "Provide the requested materials";
  }
  if (event.kind === "status_change" && event.spineStatus === "waiting_on_client") {
    return "Respond so The Studio can continue";
  }
  return null;
}

function mapDetail(event: JobActivityEvent): string | null {
  const reason = event.reason?.trim();
  if (!reason) return null;
  // Avoid dumping internal jargon when headline already covers the spine.
  if (event.kind === "status_change" && event.spineStatus === "ready_for_review") {
    if (/review room/i.test(reason)) return null;
  }
  return reason;
}

/**
 * Project customer-visible Update History from authoritative job activity.
 * Newest first. Skips unsupported kinds rather than inventing events.
 */
export function projectCustomerUpdateHistory(
  events: readonly JobActivityEvent[],
  jobId: string,
): CustomerUpdateHistoryItem[] {
  const items: CustomerUpdateHistoryItem[] = [];

  for (const event of events) {
    if (event.jobId !== jobId) continue;
    if (NEVER_SHOW.has(event.kind)) continue;
    if (!CUSTOMER_HISTORY_KINDS.has(event.kind)) continue;

    const headline = mapHeadline(event);
    if (!headline) continue;

    items.push({
      id: event.id,
      occurredAt: event.occurredAt,
      occurredAtLabel: formatReceiptDateTime(event.occurredAt),
      headline,
      detail: mapDetail(event),
      actorLabel: actorLabel(event.actor),
      versionLabel: extractVersionLabel(event),
      actionRequired: mapActionRequired(event),
      sourceKind: event.kind,
    });
  }

  return items.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
