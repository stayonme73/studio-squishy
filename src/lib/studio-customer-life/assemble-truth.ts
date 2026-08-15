import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import { resolveCampaignRevisionRounds } from "@/lib/approved-plan-display";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import { needsPaidOperatingRecovery } from "@/lib/studio-paid-activation-recovery/needs-recovery";
import { studioReviewEligibilityV1 } from "@/config/studio-review-eligibility-v1";
import { evaluateReviewEligibility } from "@/lib/studio-review-eligibility";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer/types";

import type {
  CustomerLifeInput,
  CustomerLifePhase,
  CustomerLifeStall,
  CustomerLifeTruth,
} from "./types";

function flyerJob(tasks: CustomerLifeInput["tasks"]) {
  return tasks?.jobRecords?.find((job) => job.skuId === "v2-rtu-flyer") ?? null;
}

function isReceivedMaterial(item: NonNullable<CustomerLifeInput["materials"]>[number]): boolean {
  if (item.contentKind === "file-metadata") {
    return item.uploadStatus === "stored" || item.reviewStatus === "approved_for_use";
  }
  return item.reviewStatus === "submitted" || item.reviewStatus === "approved_for_use";
}

function countReceived(materials: CustomerLifeInput["materials"]): number {
  if (!materials) return 0;
  return materials.filter(isReceivedMaterial).length;
}

function countUnusable(materials: CustomerLifeInput["materials"]): number {
  if (!materials) return 0;
  return materials.filter(
    (item) =>
      item.reviewStatus === "rejected" ||
      item.reviewStatus === "needs_clarification",
  ).length;
}

function resolvePhase(input: {
  hasCampaign: boolean;
  paymentConfirmed: boolean;
  recovering: boolean;
  intakeComplete: boolean;
  blockingMaterials: number;
  productionStarted: boolean;
  qaPassed: boolean;
  reviewEligible: boolean;
  spineStatus: string | null;
}): CustomerLifePhase {
  if (!input.hasCampaign) return "no_project";
  if (!input.paymentConfirmed) return "unpaid";
  if (input.recovering) return "recovering";
  if (input.spineStatus === "delivered" || input.spineStatus === "ready_for_delivery") {
    return input.spineStatus === "delivered" ? "delivered" : "approved";
  }
  if (input.spineStatus === "approved") return "approved";
  if (input.spineStatus === "revision_requested") return "revision";
  if (input.reviewEligible || input.spineStatus === "ready_for_review") {
    return "ready_for_review";
  }
  if (!input.intakeComplete) return "awaiting_intake";
  if (input.blockingMaterials > 0) return "awaiting_materials";
  if (input.productionStarted && !input.qaPassed) return "producing";
  if (input.qaPassed && !input.reviewEligible) return "internal_qa";
  if (input.productionStarted) return "producing";
  return "producing";
}

export function assembleCustomerLifeTruth(
  input: CustomerLifeInput,
): CustomerLifeTruth {
  const campaign = input.campaign;
  const job = flyerJob(input.tasks);
  const paymentConfirmed = Boolean(
    campaign?.paymentReceivedAt && campaign.paymentTruth?.status === "confirmed",
  );
  const recovering = campaign ? needsPaidOperatingRecovery(campaign) : false;
  const intakeComplete = campaign ? isIntakeComplete(campaign) : false;
  const blockingMaterialsCount =
    campaign?.materialsSummary?.blockingRequiredCount ??
    input.materials?.filter(
      (item) =>
        item.requirementLevel === "required" &&
        item.reviewStatus !== "approved_for_use",
    ).length ??
    0;
  const productionStarted = Boolean(job?.productionStartedAt);
  const qaRecords = input.tasks?.qaRecords ?? [];
  const qaPassed = qaRecords.some(
    (record) =>
      record.action === "qa_pass" && record.taskId.includes("v2-rtu-flyer"),
  );
  let reviewEligible = false;
  if (job && input.tasks) {
    const decision = evaluateReviewEligibility({
      jobId: job.jobId,
      campaignId: job.campaignId,
      skuId: job.skuId,
      tasks: input.tasks.tasks,
      qaRecords,
    });
    reviewEligible =
      decision.outcome === studioReviewEligibilityV1.outcomes.eligibleForReview;
  }
  if (job?.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW") {
    reviewEligible = true;
  }

  const included = campaign ? resolveCampaignRevisionRounds(campaign) : 0;
  const used = campaign?.revisionRoundsUsed ?? 0;
  const accounting = campaign
    ? deriveCorrectionAccounting({
        campaign,
        envelope: {
          jobCorrectionUses: input.tasks?.jobCorrectionUses,
          jobCorrectionExtraGrants: input.tasks?.jobCorrectionExtraGrants,
        },
      })
    : null;
  const remaining = accounting?.remaining ?? Math.max(0, included - used);

  const approval = job?.customerApprovedArtifactAuthorization;
  const stalls: CustomerLifeStall[] = [];
  if (recovering) {
    stalls.push({
      id: "activation_pending_retry",
      summary: studioPaidActivationRecoveryV1.customerCopy.recoveringLead,
      recoveryClass: "automatic",
    });
  }
  if (paymentConfirmed && !intakeComplete) {
    stalls.push({
      id: "awaiting_intake",
      summary: "Project Intake is still needed from the customer.",
      recoveryClass: "waiting_on_customer",
    });
  }
  if (paymentConfirmed && intakeComplete && blockingMaterialsCount > 0) {
    stalls.push({
      id: "awaiting_materials",
      summary: "Required materials are still blocking the next step.",
      recoveryClass: "waiting_on_customer",
    });
  }
  if (productionStarted && !qaPassed && job?.spineStatus !== "waiting_on_client") {
    stalls.push({
      id: "production_without_qa",
      summary: "Production started but internal QA is not on the record yet.",
      recoveryClass: "retryable",
    });
  }
  if (qaPassed && !reviewEligible) {
    stalls.push({
      id: "qa_without_review",
      summary: "QA passed but Review eligibility is not open.",
      recoveryClass: "retryable",
    });
  }
  if (job?.spineStatus === "revision_requested" && !productionStarted) {
    stalls.push({
      id: "revision_not_started",
      summary: "A revision was requested but production has not restarted.",
      recoveryClass: "retryable",
    });
  }
  const submittedAwaitingReview = (input.materials ?? []).filter(
    (item) =>
      item.requirementLevel === "required" &&
      item.reviewStatus === "submitted",
  ).length;
  if (submittedAwaitingReview > 0) {
    stalls.push({
      id: "upload_awaiting_team_review",
      summary:
        "A customer upload is on the record and is waiting for Studio use review. Uploaded is not approved for use.",
      recoveryClass: "retryable",
    });
  }
  const flyerObserver = campaign?.dispatchExecution?.designRendererObserver?.results.find(
    (result) => result.skuId === DESIGN_RENDERER_PROOF_SKU,
  );
  if (flyerObserver?.ok && !flyerObserver.pngContentSha256) {
    stalls.push({
      id: "tool_success_no_artifact",
      summary:
        "The production tool reported success but no flyer file identity is on the record.",
      recoveryClass: "retryable",
    });
  }
  const qaFailed = qaRecords.some(
    (record) =>
      record.taskId.includes("v2-rtu-flyer") &&
      (record.action === "qa_fail" || record.action === "qa_block"),
  );
  if (qaFailed && !qaPassed) {
    stalls.push({
      id: "qa_failed_unresolved",
      summary: "Internal quality check rejected the current flyer. Correction is still open.",
      recoveryClass: "retryable",
    });
  }
  const queuedNotices = (input.tasks?.jobCommunicationRecords ?? []).filter(
    (record) =>
      record.deliveryStatus === "pending_owner_send" &&
      record.channel === "in_app_outbox",
  ).length;
  if (queuedNotices > 0) {
    stalls.push({
      id: "notice_queued_email_not_confirmed",
      summary:
        "A customer notice is recorded on the project. Board is the source of truth. Email delivery is not confirmed.",
      recoveryClass: "retryable",
    });
  }

  const spineStatus = job?.spineStatus ?? null;
  const phase = resolvePhase({
    hasCampaign: Boolean(campaign),
    paymentConfirmed,
    recovering,
    intakeComplete,
    blockingMaterials: blockingMaterialsCount,
    productionStarted,
    qaPassed,
    reviewEligible,
    spineStatus,
  });

  return {
    campaignId: campaign?.campaignId ?? null,
    phase,
    paymentConfirmed,
    intakeComplete,
    blockingMaterialsCount,
    receivedMaterialCount: countReceived(input.materials),
    unusableMaterialCount: countUnusable(input.materials),
    activationPendingRetry: recovering,
    productionStarted,
    qaPassed,
    reviewEligible,
    revisionRequested: spineStatus === "revision_requested",
    revisionAllowanceIncluded: included,
    revisionAllowanceRemaining: remaining >= 0 ? remaining : Math.max(0, included - used),
    approvedVersionLabel: approval?.workVersionId ?? approval?.artifactIds?.[0] ?? null,
    approvedContentSha256: approval?.contentSha256s?.[0] ?? null,
    finalDeliveryReady: spineStatus === "delivered" || spineStatus === "ready_for_delivery",
    spineStatus,
    serviceName: job?.serviceName ?? "Make Me a Flyer",
    stalls,
    ownerActionRequired: false,
  };
}
