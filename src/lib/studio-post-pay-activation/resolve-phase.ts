import type { CampaignRecord } from "@/config/studio-board";
import {
  studioPostPayActivationV1,
  type PostPayActivationPhase,
} from "@/config/studio-post-pay-activation-v1";
import { isJobIntakeComplete } from "@/lib/job-control/resolve-jobs";
import { countBlockingRequiredMaterials } from "@/lib/materials/materials-view";
import type { CampaignMaterialItem } from "@/lib/materials/types";

/**
 * Resolve operating phase from existing intake + materials truth.
 * Does not start production. Does not bypass approved_for_use / clarification
 * (blocking count uses materialBlocksProductionUse).
 */
export function resolvePostPayActivationPhase(
  campaign: CampaignRecord,
  materials: readonly CampaignMaterialItem[],
): {
  phase: PostPayActivationPhase;
  intakeComplete: boolean;
  blockingRequiredMaterialsCount: number;
} {
  const intakeComplete = isJobIntakeComplete(campaign);
  const blockingRequiredMaterialsCount = countBlockingRequiredMaterials(
    materials,
    campaign.campaignId,
  );

  if (!intakeComplete) {
    return {
      phase: studioPostPayActivationV1.phases.awaitingIntake,
      intakeComplete,
      blockingRequiredMaterialsCount,
    };
  }

  if (blockingRequiredMaterialsCount > 0) {
    return {
      phase: studioPostPayActivationV1.phases.awaitingMaterials,
      intakeComplete,
      blockingRequiredMaterialsCount,
    };
  }

  return {
    phase: studioPostPayActivationV1.phases.readyForRouting,
    intakeComplete,
    blockingRequiredMaterialsCount,
  };
}

/** True when payment authority is confirmed — the only activation gate. */
export function isPaymentConfirmedForActivation(campaign: CampaignRecord): boolean {
  return Boolean(
    campaign.paymentReceivedAt &&
      campaign.paymentTruth?.status === "confirmed" &&
      campaign.paymentTruth.checkoutSessionId,
  );
}
