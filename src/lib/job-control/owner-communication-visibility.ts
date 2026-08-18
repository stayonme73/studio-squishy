import type { JobCommunicationDeliveryStatus, JobCommunicationRecord } from "./types";

import { classifyCommunicationDeliveryForOwnerDesk } from "@/lib/campaign-tasks/owner-console-decision-boundary";

/**
 * Owner-desk communication visibility.
 *
 * Successful lifecycle notices must not flood the desk.
 * `pending_owner_send` is stale "Tagia must send" residue — Machine outbox,
 * not an Owner decision. Live Resend inbox certification remains deferred.
 *
 * `delivery_failed` is useful visibility when durable records already say
 * contact failed. This package does not invent a send-now Owner task.
 */
export function isOwnerWorthyCommunicationProblem(
  status: JobCommunicationDeliveryStatus,
): boolean {
  return classifyCommunicationDeliveryForOwnerDesk(status) === "useful_owner_visibility";
}

export function resolveOwnerCommunicationProblems(
  records: readonly JobCommunicationRecord[] | undefined,
): readonly JobCommunicationRecord[] {
  return (records ?? []).filter((record) =>
    isOwnerWorthyCommunicationProblem(record.deliveryStatus),
  );
}

export function isRoutineCommunicationNoise(
  status: JobCommunicationDeliveryStatus,
): boolean {
  return classifyCommunicationDeliveryForOwnerDesk(status) === "routine_off_desk";
}
