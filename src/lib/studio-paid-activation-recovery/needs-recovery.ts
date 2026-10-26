import type { CampaignRecord } from "@/config/studio-board";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import { studioPostPayActivationV1 } from "@/config/studio-post-pay-activation-v1";
import { studioRoutingHandoffV1 } from "@/config/studio-routing-handoff-v1";
import { isJobIntakeComplete } from "@/lib/job-control/resolve-jobs";

import { sealedPostPayStructureMissing } from "./apply-sealed-structures";

export function isPaymentConfirmedForRecovery(
  campaign: CampaignRecord,
): boolean {
  return Boolean(
    campaign.paymentReceivedAt && campaign.paymentTruth?.status === "confirmed",
  );
}

function selectedSkuCount(campaign: CampaignRecord): number {
  return (
    campaign.paymentTruth?.selectedServiceIds?.length ??
    campaign.approvedStudioPlan?.selectedServiceIds?.length ??
    0
  );
}

/**
 * Paid operating chain is incomplete or marked pending_retry.
 * Deferred routing/dispatch while Intake is actually incomplete is healthy.
 * Submitted Intake still frozen in awaiting_intake is not — Machine must
 * re-evaluate activation and dispatch without Owner clicking Production.
 */
export function needsPaidOperatingRecovery(campaign: CampaignRecord): boolean {
  if (!isPaymentConfirmedForRecovery(campaign)) return false;

  const activation = campaign.postPayActivation;
  if (!activation) return true;
  if (activation.status === studioPostPayActivationV1.activationStatuses.pendingRetry) {
    return true;
  }

  if (campaign.routingHandoff?.status === studioRoutingHandoffV1.handoffStatuses.pendingRetry) {
    return true;
  }

  if (campaign.dispatchExecution?.status === studioDispatchV1.envelopeStatuses.pendingRetry) {
    return true;
  }

  if (sealedPostPayStructureMissing(campaign)) return true;

  if (
    activation.status === studioPostPayActivationV1.activationStatuses.activated &&
    selectedSkuCount(campaign) > 0 &&
    activation.jobIds.length === 0
  ) {
    return true;
  }

  const intakeSubmitted = isJobIntakeComplete(campaign);
  if (
    intakeSubmitted &&
    (activation.phase === studioPostPayActivationV1.phases.awaitingIntake ||
      activation.intakeComplete === false)
  ) {
    return true;
  }

  return false;
}
