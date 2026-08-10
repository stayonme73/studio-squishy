import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { CampaignTaskItem, QaRecord } from "@/lib/campaign-tasks/types";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import {
  evaluateReviewEligibility,
  isEligibleForReview,
} from "@/lib/studio-review-eligibility";

import { hasAcceptedAcceptanceReview } from "./acceptance-review";
import type { ProductionLaneView } from "./capacity";
import { blockingMaterialsForSku } from "./resolve-jobs";
import type { JobDeliverablePrep, PurchasedJobRecord } from "./types";

export type GateBlockReason = {
  code: string;
  message: string;
};

export function resolveRequiredDeliverableKeys(
  deliverables: readonly string[],
): { key: string; label: string }[] {
  return deliverables.map((label, index) => ({
    key: `deliverable-${index}`,
    label,
  }));
}

export function isDeliverablePrepared(
  job: PurchasedJobRecord,
  deliverableKey: string,
): boolean {
  return (job.deliverablePrep ?? []).some(
    (entry) => entry.deliverableKey === deliverableKey && Boolean(entry.preparedAt),
  );
}

export function allRequiredDeliverablesPrepared(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
): boolean {
  if (requiredDeliverables.length === 0) return true;
  const keys = resolveRequiredDeliverableKeys(requiredDeliverables);
  return keys.every((entry) => isDeliverablePrepared(job, entry.key));
}

export function laneHasCapacityForJob(
  job: PurchasedJobRecord,
  laneViews: readonly ProductionLaneView[],
): boolean {
  const lane = job.returnLane ?? job.productionLane;
  const view = laneViews.find((entry) => entry.lane === lane);
  if (!view) return false;
  if (view.availableSlots > 0) return true;
  return view.activeJobs.some((active) => active.jobId === job.jobId);
}

export function canTransitionToBuildingConcepts(
  job: PurchasedJobRecord,
  materials: readonly CampaignMaterialItem[],
  laneViews: readonly ProductionLaneView[],
): { allowed: boolean; reasons: GateBlockReason[] } {
  const reasons: GateBlockReason[] = [];

  if (job.spineStatus !== "ready_for_queue") {
    reasons.push({
      code: "wrong_status",
      message: "Job must be Ready for Queue to start Building Concepts.",
    });
  }

  if (!job.intakeComplete) {
    reasons.push({
      code: "intake_incomplete",
      message: "Client intake must be complete before production starts.",
    });
  }

  if (!hasAcceptedAcceptanceReview(job)) {
    reasons.push({
      code: "acceptance_review_required",
      message:
        "Acceptance Review must be documented before production starts. Route unclear scope, timeline, compliance, pricing, policy, or material issues to Squishy and Decision Core first.",
    });
  }

  if (job.spineStatus === "waiting_on_client") {
    reasons.push({
      code: "waiting_on_client",
      message: "Job is waiting on client — cannot start production.",
    });
  }

  const blocking = blockingMaterialsForSku(materials, job.skuId);
  if (blocking.length > 0) {
    reasons.push({
      code: "materials_incomplete",
      message: `Required materials missing: ${blocking.map((item) => item.label).join(", ")}`,
    });
  }

  if (!laneHasCapacityForJob(job, laneViews)) {
    reasons.push({
      code: "lane_full",
      message: `${job.returnLane ?? job.productionLane} lane has no available capacity.`,
    });
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canSubmitForOwnerApproval(
  job: PurchasedJobRecord,
  requiredDeliverables: readonly string[],
  qaContext?: {
    tasks: readonly CampaignTaskItem[];
    qaRecords: readonly QaRecord[];
    production?: ServerProductionEnvelope | null;
  },
): { allowed: boolean; reasons: GateBlockReason[] } {
  const reasons: GateBlockReason[] = [];

  if (job.spineStatus !== "building_concepts") {
    reasons.push({
      code: "wrong_status",
      message: "Job must be Building Concepts to submit to client Review Room.",
    });
  }

  if (job.ownerApprovalPending === "before_review") {
    reasons.push({
      code: "already_pending",
      message: "Owner support review is already pending for this job.",
    });
  }

  if (!allRequiredDeliverablesPrepared(job, requiredDeliverables)) {
    reasons.push({
      code: "deliverables_unprepared",
      message: "All required deliverables must be marked prepared first.",
    });
  }

  if (qaContext) {
    const eligibility = evaluateReviewEligibility({
      jobId: job.jobId,
      campaignId: job.campaignId,
      skuId: job.skuId,
      tasks: qaContext.tasks,
      qaRecords: qaContext.qaRecords,
      production: qaContext.production,
    });
    if (!isEligibleForReview(eligibility)) {
      reasons.push({
        code: "internal_qa_blocked",
        message: eligibility.reasons[0] ?? "Internal QA has not passed for this review candidate.",
      });
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

export function canOwnerApproveForReview(
  job: PurchasedJobRecord,
  qaContext?: {
    tasks: readonly CampaignTaskItem[];
    qaRecords: readonly QaRecord[];
    production?: ServerProductionEnvelope | null;
  },
): { allowed: boolean; reasons: GateBlockReason[] } {
  const base = canOwnerActOnReviewGate(job);
  if (!base.allowed) return base;
  if (!qaContext) return base;

  const eligibility = evaluateReviewEligibility({
    jobId: job.jobId,
    campaignId: job.campaignId,
    skuId: job.skuId,
    tasks: qaContext.tasks,
    qaRecords: qaContext.qaRecords,
    production: qaContext.production,
  });
  if (!isEligibleForReview(eligibility)) {
    return {
      allowed: false,
      reasons: [
        {
          code: "internal_qa_blocked",
          message:
            eligibility.reasons[0] ??
            "Internal QA has not passed for this review candidate.",
        },
      ],
    };
  }
  return base;
}

export function canOwnerActOnReviewGate(
  job: PurchasedJobRecord,
): { allowed: boolean; reasons: GateBlockReason[] } {
  const reasons: GateBlockReason[] = [];

  if (job.ownerApprovalPending !== "before_review") {
    reasons.push({
      code: "not_pending",
      message: "No Owner support review pending for this job.",
    });
  }

  return { allowed: reasons.length === 0, reasons };
}

export function mergeDeliverablePrep(
  existing: readonly JobDeliverablePrep[] | undefined,
  deliverableKey: string,
  label: string,
  prepared: boolean,
  actor: JobDeliverablePrep["preparedBy"],
  occurredAt: string,
): JobDeliverablePrep[] {
  const prior = [...(existing ?? [])];
  const index = prior.findIndex((entry) => entry.deliverableKey === deliverableKey);
  const next: JobDeliverablePrep = {
    deliverableKey,
    label,
    ...(prepared
      ? { preparedAt: occurredAt, preparedBy: actor }
      : { preparedAt: undefined, preparedBy: undefined }),
  };

  if (index >= 0) {
    prior[index] = next;
  } else {
    prior.push(next);
  }

  return prior;
}
