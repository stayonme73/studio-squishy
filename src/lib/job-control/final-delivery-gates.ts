import type { PurchasedJobRecord } from "./types";
import { resolveRequiredDeliverableKeys } from "./production-workspace-gates";

export type GateBlockReason = {
  code: string;
  message: string;
};

export function allRequiredClientDeliveryFilesPresent(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
): boolean {
  if (requiredDeliverables.length === 0) return true;
  const keys = resolveRequiredDeliverableKeys(requiredDeliverables);
  const files = job.clientDeliveryFiles ?? [];
  return keys.every((def) =>
    files.some((file) => file.deliverableKey === def.key && file.url.trim()),
  );
}

export function canOwnerFinalRelease(
  job: PurchasedJobRecord,
): { allowed: boolean; reasons: GateBlockReason[] } {
  const reasons: GateBlockReason[] = [];

  if (job.spineStatus !== "approved") {
    reasons.push({
      code: "wrong_status",
      message: "Job must be client-approved before Owner final release.",
    });
  }

  if (job.ownerApprovalPending !== "before_delivery") {
    reasons.push({
      code: "not_pending",
      message: "No final release approval pending for this job.",
    });
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canMarkJobDelivered(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
): { allowed: boolean; reasons: GateBlockReason[] } {
  const reasons: GateBlockReason[] = [];

  if (job.spineStatus !== "ready_for_delivery") {
    reasons.push({
      code: "wrong_status",
      message: "Job must be Ready for Delivery before marking delivered.",
    });
  }

  if (!allRequiredClientDeliveryFilesPresent(job, requiredDeliverables)) {
    reasons.push({
      code: "missing_client_files",
      message: "All required deliverables need a client delivery file before delivery.",
    });
  }

  return { allowed: reasons.length === 0, reasons };
}
