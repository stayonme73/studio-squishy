/**
 * Communication receipt over a durable job notice.
 * Does not invent Resend open/read confirmation — the adapter only records send accept.
 */

import type { JobCommunicationRecord } from "@/lib/job-control/types";
import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";

export type LifecycleNoticeReceipt = {
  created: boolean;
  sendAttempted: boolean;
  sent: boolean;
  failed: boolean;
  retryPending: boolean;
  openOrReadConfirmed: false;
};

export function lifecycleNoticeReceipt(
  record: JobCommunicationRecord | null | undefined,
): LifecycleNoticeReceipt {
  if (!record) {
    return {
      created: false,
      sendAttempted: false,
      sent: false,
      failed: false,
      retryPending: false,
      openOrReadConfirmed: false,
    };
  }
  const attempts = record.transportAttempts ?? 0;
  const failed = record.deliveryStatus === "delivery_failed";
  const sent = record.deliveryStatus === "sent";
  const underRetryCap = attempts < cfg.retry.maxAttempts;
  return {
    created: true,
    sendAttempted: attempts > 0,
    sent,
    failed,
    retryPending:
      underRetryCap &&
      (record.deliveryStatus === "pending_owner_send" || failed),
    openOrReadConfirmed: false,
  };
}
