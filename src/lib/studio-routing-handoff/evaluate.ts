import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import {
  studioRoutingHandoffV1,
  type RoutingOutcome,
} from "@/config/studio-routing-handoff-v1";
import { resolveControlLaneForSku } from "@/lib/job-control/lane-map";
import {
  blockingMaterialsForSku,
  isJobIntakeComplete,
} from "@/lib/job-control/resolve-jobs";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { ProductionCapabilityReadiness } from "@/lib/studio-kitchen-production/types";
import { studioPostPayActivationV1 } from "@/config/studio-post-pay-activation-v1";

import type { JobRoutingDecision } from "./types";

export function buildRoutingDecisionId(jobId: string): string {
  return `rd:${jobId}`;
}

export function buildRoutingFactFingerprint(input: {
  jobId: string;
  skuId: string;
  checkoutSessionId: string;
  selectedServiceIds: readonly string[];
  intakeComplete: boolean;
  blockingMaterialsCount: number;
  deadline: string;
  amountDueTodayCents: number;
  planApprovedAt: string;
  capabilityReadiness: string;
  ownerApprovalPending: boolean;
}): string {
  const skus = [...input.selectedServiceIds].sort().join(",");
  return [
    "rh1",
    input.jobId,
    input.skuId,
    input.checkoutSessionId,
    skus,
    input.intakeComplete ? "1" : "0",
    String(input.blockingMaterialsCount),
    input.deadline || "-",
    String(input.amountDueTodayCents),
    input.planApprovedAt || "-",
    input.capabilityReadiness || "-",
    input.ownerApprovalPending ? "1" : "0",
  ].join(":");
}

function readinessAllowsDispatch(
  readiness: ProductionCapabilityReadiness,
): boolean {
  return (
    readiness === "contract_ready" ||
    readiness === "contract_ready_integration_required"
  );
}

/**
 * Pure per-job routing evaluation. No producer selection. No tool invocation.
 */
export function evaluateJobRoutingDecision(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  materials: readonly CampaignMaterialItem[];
  evaluatedAt?: string;
}): JobRoutingDecision {
  const { campaign, job, materials } = input;
  const now = input.evaluatedAt ?? new Date().toISOString();
  const skuId = job.skuId as ServiceId;
  const checkoutSessionId = campaign.paymentTruth?.checkoutSessionId ?? "";
  const selectedServiceIds =
    campaign.paymentTruth?.selectedServiceIds ??
    campaign.approvedStudioPlan?.selectedServiceIds ??
    [];
  const intakeComplete = isJobIntakeComplete(campaign) && job.intakeComplete;
  const blockingMaterialsCount = blockingMaterialsForSku(
    materials,
    skuId,
    campaign.campaignId,
  ).length;
  const deadline =
    campaign.targetCompletionDate?.trim() ||
    campaign.estimatedCompletion?.trim() ||
    "";
  const amountDueTodayCents =
    campaign.approvedStudioPlan?.amountDueTodayCents ?? 0;
  const planApprovedAt = campaign.approvedStudioPlan?.approvedAt ?? "";
  const ownerApprovalPending = Boolean(job.ownerApprovalPending);
  const controlLane = resolveControlLaneForSku(skuId);

  const contractResult = resolveServiceProductionContract(skuId);
  const capabilityReadiness =
    contractResult.status === "resolved"
      ? contractResult.contract.readiness
      : null;
  const productionFamilyId =
    contractResult.status === "resolved"
      ? contractResult.contract.productionFamilyId
      : null;

  const fingerprint = buildRoutingFactFingerprint({
    jobId: job.jobId,
    skuId,
    checkoutSessionId,
    selectedServiceIds,
    intakeComplete,
    blockingMaterialsCount,
    deadline,
    amountDueTodayCents,
    planApprovedAt,
    capabilityReadiness: capabilityReadiness ?? contractResult.status,
    ownerApprovalPending,
  });

  const base = {
    decisionId: buildRoutingDecisionId(job.jobId),
    jobId: job.jobId,
    campaignId: campaign.campaignId,
    skuId,
    productionFamilyId,
    controlLane,
    capabilityReadiness,
    factFingerprint: fingerprint,
    evaluatedAt: now,
    ownerActionRequired: false as const,
  };

  const activationReady =
    campaign.postPayActivation?.status === "activated" &&
    campaign.postPayActivation.phase ===
      studioPostPayActivationV1.phases.readyForRouting;

  if (!activationReady) {
    return {
      ...base,
      status: studioRoutingHandoffV1.outcomes.waitingForPrerequisite,
      readyForDispatch: false,
      reason: "Campaign is not in ready_for_routing activation phase.",
      blocker: `activation_phase:${campaign.postPayActivation?.phase ?? "none"}`,
    };
  }

  if (!intakeComplete) {
    return {
      ...base,
      status: studioRoutingHandoffV1.outcomes.waitingForPrerequisite,
      readyForDispatch: false,
      reason: "Required intake is incomplete.",
      blocker: "intake_incomplete",
    };
  }

  if (blockingMaterialsCount > 0) {
    return {
      ...base,
      status: studioRoutingHandoffV1.outcomes.waitingForPrerequisite,
      readyForDispatch: false,
      reason: "Required materials still block production use.",
      blocker: `blocking_materials:${blockingMaterialsCount}`,
    };
  }

  if (ownerApprovalPending) {
    return {
      ...base,
      status: studioRoutingHandoffV1.outcomes.ownerPolicyReview,
      readyForDispatch: false,
      reason: "Job has a pending Owner policy approval gate.",
      blocker: "owner_approval_pending",
    };
  }

  if (contractResult.status === "unknown_sku") {
    return {
      ...base,
      status: studioRoutingHandoffV1.outcomes.routingBlocked,
      readyForDispatch: false,
      reason: contractResult.message,
      blocker: "unknown_sku",
    };
  }

  if (contractResult.status === "not_active_customer_facing") {
    return {
      ...base,
      status: studioRoutingHandoffV1.outcomes.routingBlocked,
      readyForDispatch: false,
      reason: contractResult.message,
      blocker: "not_active_customer_facing",
    };
  }

  const readiness = contractResult.contract.readiness;
  if (!readinessAllowsDispatch(readiness)) {
    return {
      ...base,
      status: studioRoutingHandoffV1.outcomes.routingBlocked,
      readyForDispatch: false,
      reason: `Capability readiness "${readiness}" is not dispatch-eligible.`,
      blocker: `capability_readiness:${readiness}`,
    };
  }

  const status: RoutingOutcome = studioRoutingHandoffV1.outcomes.readyForDispatch;
  return {
    ...base,
    status,
    readyForDispatch: true,
    reason: `Capability family ${contractResult.contract.productionFamilyId} is dispatch-eligible.`,
    blocker: null,
  };
}
