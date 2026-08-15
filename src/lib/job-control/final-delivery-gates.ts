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
    files.some(
      (file) =>
        Boolean(file.url.trim()) &&
        (file.deliverableKey === def.key || file.deliverableLabel === def.label),
    ),
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
        Boolean(file.url.trim()) &&
        clientDeliveryFileIsReleased(job, file) &&
        (file.deliverableKey === def.key || file.deliverableLabel === def.label),
    ),
  );
}

/**
 * Authoritative material-use input for system Final Delivery.
 * `ledgerLoaded: false` must never be treated as “no holds.”
 * `ledgerLoaded: true` + empty items = campaign has no material rows (no false block).
 */
export type SystemReleaseMaterialContext = {
  ledgerLoaded: boolean;
  items: readonly CampaignMaterialItem[];
};

export function materialContextFromLedger(
  items: readonly CampaignMaterialItem[],
): SystemReleaseMaterialContext {
  return { ledgerLoaded: true, items };
}

export function materialContextUnavailable(): SystemReleaseMaterialContext {
  return { ledgerLoaded: false, items: [] };
}

function materialUseReleaseBlock(
  job: PurchasedJobRecord,
  materialUse: SystemReleaseMaterialContext,
): GateBlockReason | null {
  if (!materialUse.ledgerLoaded) {
    return {
      code: "materials_ledger_unavailable",
      message:
        "Material-use ledger is unavailable — system Final Delivery cannot be authorized.",
    };
  }
  // Reevaluates live (including contentFingerprint replacement) via materialBlocksProductionUse.
  if (jobHasUnresolvedMaterialUseHold(materialUse.items, job.campaignId, job.skuId)) {
    return {
      code: "material_use_hold",
      message:
        "One or more required materials are not approved for Studio use — Final Delivery remains held.",
    };
  }
  return null;
}

/**
 * Routine Final Delivery authorization — system path.
 * Owner must not click for ordinary matching, hold-free jobs.
 * Customer creative approval cannot waive unresolved material-use holds.
 */
export function canSystemAuthorizeFinalDelivery(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
  materialUse: SystemReleaseMaterialContext,
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

  const materialBlock = materialUseReleaseBlock(job, materialUse);
  if (materialBlock) reasons.push(materialBlock);

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
  materialUse: SystemReleaseMaterialContext,
): { allowed: boolean; reasons: GateBlockReason[] } {
  const gate = canOwnerActOnReleaseGate(job);
  if (!gate.allowed) return gate;

  // Owner exception is not a rights waiver — resolve material-use first.
  const materialBlock = materialUseReleaseBlock(job, materialUse);
  if (materialBlock) {
    return { allowed: false, reasons: [materialBlock] };
  }

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
