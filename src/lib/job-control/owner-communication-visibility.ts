import type { JobCommunicationDeliveryStatus, JobCommunicationRecord } from "./types";

import { classifyCommunicationDeliveryForOwnerDesk } from "@/lib/campaign-tasks/owner-console-decision-boundary";
import { studioResendLifecycleAndWatchdogV1 } from "@/config/studio-resend-lifecycle-and-watchdog-v1";

/**
 * Owner-desk communication visibility.
 *
 * Successful lifecycle notices must not flood the desk.
 * `pending_owner_send` means Machine is still responsible for transport.
 * A delivery failure stays off the desk while bounded retries remain.
 * Only an exhausted failure is useful visibility, and it is not a send-now task.
 */
export function isOwnerWorthyCommunicationProblem(
  status: JobCommunicationDeliveryStatus,
): boolean {
  return classifyCommunicationDeliveryForOwnerDesk(status) === "useful_owner_visibility";
}

export function isMaterialCustomerEmailFailure(record: JobCommunicationRecord): boolean {
  if (!isOwnerWorthyCommunicationProblem(record.deliveryStatus)) return false;
  return (
    (record.transportAttempts ?? 0) >=
    studioResendLifecycleAndWatchdogV1.retry.maxAttempts
  );
}

export function resolveOwnerCommunicationProblems(
  records: readonly JobCommunicationRecord[] | undefined,
): readonly JobCommunicationRecord[] {
  return (records ?? []).filter((record) => isMaterialCustomerEmailFailure(record));
}

export function isRoutineCommunicationNoise(
  status: JobCommunicationDeliveryStatus,
): boolean {
  return classifyCommunicationDeliveryForOwnerDesk(status) === "routine_off_desk";
}
