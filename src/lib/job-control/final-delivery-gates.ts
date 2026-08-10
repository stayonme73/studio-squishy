import {
  evaluateApprovalMatchForRelease,
  evaluateDeliveryEligibility,
  isEligibleForDelivery,
} from "@/lib/studio-approved-delivery";
import { clientDeliveryFileIsReleased } from "@/lib/file-registry/job-files";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { jobHasUnresolvedMaterialUseHold } from "@/lib/studio-material-use";

import type { PurchasedJobRecord } from "./types";
import { resolveRequiredDeliverableKeys } from "./production-workspace-gates";

export type GateBlockReason = {
  code: string;
  message: string;
};

/** Required CDF rows exist with URLs (release status may still be pending). */
export function allRequiredClientDeliveryFilesAssembled(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
): boolean {
  if (requiredDeliverables.length === 0) return true;
  const keys = resolveRequiredDeliverableKeys(requiredDeliverables);
  const files = job.clientDeliveryFiles ?? [];
  return keys.every((def) =>
    files.some((file) => file.deliverableKey === def.key && Boolean(file.url.trim())),
  );
}

export function allRequiredClientDeliveryFilesPresent(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
): boolean {
  if (requiredDeliverables.length === 0) return true;
  const keys = resolveRequiredDeliverableKeys(requiredDeliverables);
  const files = job.clientDeliveryFiles ?? [];
  return keys.every((def) =>
    files.some(
      (file) =>
        file.deliverableKey === def.key &&
        file.url.trim() &&
        clientDeliveryFileIsReleased(job, file),
    ),
  );
}

/**
 * Routine Final Delivery authorization — system path.
 * Owner must not click for ordinary matching, hold-free jobs.
 */
export function canSystemAuthorizeFinalDelivery(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
  materials: readonly CampaignMaterialItem[] = [],
): { allowed: boolean; reasons: GateBlockReason[] } {
  const reasons: GateBlockReason[] = [];

  if (job.spineStatus !== "approved") {
    reasons.push({
      code: "wrong_status",
      message: "Job must be client-approved before system final delivery authorization.",
    });
  }

  if (job.ownerApprovalPending != null) {
    reasons.push({
      code: "release_hold",
      message:
        "A Studio Owner release hold is pending — system cannot authorize routine Final Delivery.",
    });
  }

  if (job.customerApprovedArtifactAuthorization?.status !== "CUSTOMER_APPROVED") {
    reasons.push({
      code: "no_approval",
      message: "Customer has not approved a specific Review package for delivery.",
    });
  }

  if (!allRequiredClientDeliveryFilesAssembled(job, requiredDeliverables)) {
    reasons.push({
      code: "missing_client_files",
      message: "All required deliverables need a client delivery file before Final Delivery opens.",
    });
  }

  // Customer creative approval cannot waive unresolved material use-rights holds.
  if (
    materials.length > 0 &&
    jobHasUnresolvedMaterialUseHold(materials, job.campaignId, job.skuId)
  ) {
    reasons.push({
      code: "material_use_hold",
      message:
        "One or more required materials are not approved for Studio use — Final Delivery remains held.",
    });
  }

  if (reasons.length > 0) {
    return { allowed: false, reasons };
  }

  const stampedHint = job; // caller should stamp before/after; match uses pin + CDF fields
  const match = evaluateApprovalMatchForRelease({ job: stampedHint });
  if (!isEligibleForDelivery(match)) {
    return {
      allowed: false,
      reasons: match.reasons.map((message) => ({
        code: match.outcome,
        message,
      })),
    };
  }

  return { allowed: true, reasons: [] };
}

/**
 * Genuine Owner exception path only — requires ownerApprovalPending === "before_delivery".
 * Not on the routine approve → Final Delivery path.
 */
export function canOwnerActOnReleaseGate(
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
      message: "No Owner release exception is pending for this job.",
    });
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canOwnerFinalRelease(
  job: PurchasedJobRecord,
): { allowed: boolean; reasons: GateBlockReason[] } {
  const gate = canOwnerActOnReleaseGate(job);
  if (!gate.allowed) return gate;

  const match = evaluateApprovalMatchForRelease({ job });
  if (!isEligibleForDelivery(match)) {
    return {
      allowed: false,
      reasons: match.reasons.map((message) => ({
        code: match.outcome,
        message,
      })),
    };
  }

  return { allowed: true, reasons: [] };
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

  const eligibility = evaluateDeliveryEligibility({ job });
  if (!isEligibleForDelivery(eligibility)) {
    for (const message of eligibility.reasons) {
      reasons.push({ code: eligibility.outcome, message });
    }
  }

  return { allowed: reasons.length === 0, reasons };
}
