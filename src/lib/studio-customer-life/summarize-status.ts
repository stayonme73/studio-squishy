import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";

import type { CustomerLifeTruth } from "./types";

const LATER_PROJECT_PHASES = new Set([
  "ready_for_review",
  "revision",
  "approved",
  "delivered",
]);

/**
 * One current-state sentence from assembled Machine truth.
 * Later authoritative phases suppress obsolete earlier facts.
 * Email transport is secondary and never the project status.
 */
export function summarizeCustomerLifeStatus(truth: CustomerLifeTruth): string {
  const copy = studioCustomerLifeV1.customerCopy;

  const withEmailIfReviewOpen = (primary: string): string => {
    if (truth.phase !== "ready_for_review" || !truth.noticeTransportPending) {
      return primary;
    }
    return `${primary} ${copy.statusEmailRetryingSecondary}`;
  };

  switch (truth.phase) {
    case "no_project":
      return copy.noProjectYet;
    case "unpaid":
      return copy.paymentNotConfirmed;
    case "awaiting_intake":
      return copy.statusAwaitingIntake;
    case "awaiting_materials":
      return truth.unusableMaterialCount > 0
        ? copy.unusableMaterial
        : copy.statusAwaitingMaterials;
    case "recovering":
      return copy.recovering;
    case "producing":
      return truth.productionStarted ? copy.holdingProduction : copy.statusProductionReady;
    case "internal_qa":
      return truth.qaState === "failed" || truth.qaState === "blocked"
        ? copy.statusQaCorrection
        : copy.holdingQa;
    case "ready_for_review":
      return withEmailIfReviewOpen(copy.statusReviewReady);
    case "revision":
      return copy.holdingRevision;
    case "approved":
      return truth.finalDeliveryReady ? copy.finalReady : copy.statusApprovedPreparing;
    case "delivered":
      return copy.finalReady;
    default:
      return copy.unknownFromRecord;
  }
}

export function statusSummaryHasObsoleteContradiction(text: string): boolean {
  const lower = text.toLowerCase();
  const later =
    lower.includes("ready for review") ||
    lower.includes("revision is in progress") ||
    lower.includes("final files are ready");
  if (!later) return false;
  return (
    lower.includes("has not been assigned") ||
    lower.includes("work has not started") ||
    lower.includes("intake is still needed") ||
    lower.includes("no received upload") ||
    lower.includes("getting your project ready")
  );
}

export function laterProjectPhaseOverridesRecovery(
  phase: CustomerLifeTruth["phase"],
): boolean {
  return LATER_PROJECT_PHASES.has(phase);
}
