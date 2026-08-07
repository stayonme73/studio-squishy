import { JOB_COMMUNICATION_TEMPLATES } from "@/lib/job-control/communication";
import type {
  JobCommunicationDeliveryStatus,
  JobCommunicationEventType,
  JobCommunicationRecord,
} from "@/lib/job-control/types";

import type { KitchenOutboxDisposition } from "./types";

/**
 * Existing job-control template vocabulary — authoritative communication kinds.
 * Source: `JOB_COMMUNICATION_TEMPLATES` in `src/lib/job-control/communication.ts`
 * (not Kitchen-invented policy).
 */
export function isJobControlTemplateCommunicationEventType(
  eventType: JobCommunicationEventType | string,
): eventType is JobCommunicationEventType {
  return Object.prototype.hasOwnProperty.call(JOB_COMMUNICATION_TEMPLATES, eventType);
}

/**
 * Classify outbox delivery without inventing business policy.
 *
 * Authority for "not an owner decision":
 * - Decision Core: outgoing communication is an effect; `humanReviewRequired: false`
 *   for sync-enqueued notices (`evaluators/outgoing-communication.ts`)
 * - Owner Console responsibility map: template + rule outcomes are not Owner Desk decisions
 * - job-control templates + `JOB_CONTROL_POLICY` windows authorize which notices exist
 *
 * `pending_owner_send` remains a transport/storage fact only.
 * It never alone establishes owner_required.
 */
export function classifyOutboxDisposition(
  record: Pick<JobCommunicationRecord, "deliveryStatus" | "eventType">,
): KitchenOutboxDisposition {
  const status: JobCommunicationDeliveryStatus = record.deliveryStatus;

  if (status === "cancelled") return "cancelled";
  if (status === "test_sent") return "test_sent";

  if (status === "pending_owner_send") {
    if (isJobControlTemplateCommunicationEventType(record.eventType)) {
      return "awaiting_authorized_transport";
    }
    // No established template authority — do not invent owner requirement or transport clearance.
    return "unknown";
  }

  return "unknown";
}

export function outboxDispositionLabel(disposition: KitchenOutboxDisposition): string {
  switch (disposition) {
    case "awaiting_authorized_transport":
      return "Authorized communication awaiting delivery transport";
    case "owner_decision_required":
      return "Owner decision required before send";
    case "test_sent":
      return "Test sent";
    case "cancelled":
      return "Cancelled";
    case "unknown":
      return "Delivery disposition unknown — no established template authority";
  }
}
