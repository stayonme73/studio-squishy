import { ownerConsoleCampaignRoute } from "@/config/owner-console";
import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { productionWorkspaceRoute } from "@/config/production-workspace";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
import type { OwnerDecisionInteractionRecord } from "@/lib/campaign-tasks/owner-decision-interaction-types";
import { isCompleteRefundSnapshot } from "@/lib/campaign-tasks/refund-request-intake";
import { isOpenExceptionStatus } from "@/lib/campaign-tasks/exceptions";
import { resolveOwnerReviewRequired } from "@/lib/campaign-tasks/exceptions-view";

import type { LaneJobView, ProductionLaneView } from "./capacity";
import { findHeavyLaneNextUp, isHeavyLaneFull } from "./capacity";
import type { PurchasedJobRecord } from "./types";

export type OwnerDeskItem = {
  id: string;
  reason: keyof typeof OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels;
  reasonLabel: string;
  campaignId: string;
  campaignName: string;
  jobId: string;
  serviceName: string;
  title: string;
  detail: string;
  drillDownHref: string;
  updatedAt: string;
  interactionId?: string;
  refundSnapshot?: import("@/lib/campaign-tasks/owner-decision-interaction-types").RefundRequestSnapshot;
};

const EXCEPTION_REASON_MAP: Partial<
  Record<CampaignExceptionRecord["kind"], OwnerDeskItem["reason"]>
> = {
  scope_change: "scope_issue",
  deadline_commitment: "deadline_exception",
  deadline_risk: "at_risk_job",
  revision_exhausted: "revision_limit_reached",
};

function deskItemFromException(
  record: CampaignExceptionRecord,
  campaignName: string,
  job: PurchasedJobRecord | undefined,
): OwnerDeskItem | null {
  if (!isOpenExceptionStatus(record.status)) return null;
  if (!resolveOwnerReviewRequired(record)) return null;

  const reason = EXCEPTION_REASON_MAP[record.kind];
  if (!reason) return null;

  return {
    id: `desk:exception:${record.id}`,
    reason,
    reasonLabel: OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels[reason],
    campaignId: record.campaignId,
    campaignName,
    jobId: job?.jobId ?? `${record.campaignId}:unknown`,
    serviceName: job?.serviceName ?? "this project",
    title: record.kind === "revision_exhausted" ? "Client Boundary Review" : record.title,
    detail:
      record.kind === "revision_exhausted"
        ? "A revision request needs business judgment because it has become a boundary, scope, goodwill, or relationship issue."
        : record.description ?? record.title,
    drillDownHref: ownerConsoleCampaignRoute(record.campaignId, record.id),
    updatedAt: record.updatedAt,
  };
}

function deskItemFromApprovalGate(
  job: PurchasedJobRecord,
  campaignName: string,
): OwnerDeskItem | null {
  if (job.ownerApprovalPending === "before_review") {
    return {
      id: `desk:review:${job.jobId}`,
      reason: "approval_before_review",
      reasonLabel:
        OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels.approval_before_review,
      campaignId: job.campaignId,
      campaignName,
      jobId: job.jobId,
      serviceName: job.serviceName,
      title: `Owner Support Review — ${job.serviceName}`,
      detail:
        "Production requested Owner support before client review because this is an escalation, repeated failure, or business judgment issue.",
      drillDownHref: productionWorkspaceRoute(job.campaignId, job.jobId),
      updatedAt: job.updatedAt,
    };
  }

  if (job.ownerApprovalPending === "before_delivery") {
    const clientApproved = job.spineStatus === "approved";
    return {
      id: clientApproved ? `desk:client-approved:${job.jobId}` : `desk:delivery:${job.jobId}`,
      reason: "approval_before_delivery",
      reasonLabel:
        OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels.approval_before_delivery,
      campaignId: job.campaignId,
      campaignName,
      jobId: job.jobId,
      serviceName: job.serviceName,
      title: clientApproved
        ? `Final Release Needed — ${job.serviceName}`
        : `Delivery gate — ${job.serviceName}`,
      detail: clientApproved
        ? "Client approved for delivery — Owner final release required before client sees Final Delivery."
        : "Owner approval required before final delivery.",
      drillDownHref: productionWorkspaceRoute(job.campaignId, job.jobId),
      updatedAt: job.updatedAt,
    };
  }

  return null;
}

function deskItemFromRefundRequest(
  interaction: OwnerDecisionInteractionRecord,
  campaignName: string,
  job: PurchasedJobRecord | undefined,
): OwnerDeskItem | null {
  if (interaction.interactionKind !== "refund_request") return null;
  if (interaction.status !== "waiting_owner") return null;
  if (!isCompleteRefundSnapshot(interaction.refundSnapshot)) return null;

  const snapshot = interaction.refundSnapshot;
  const serviceName = job?.serviceName ?? "this project";

  return {
    id: `desk:refund:${interaction.jobId ?? interaction.id}`,
    reason: "refund_eligible",
    reasonLabel: OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels.refund_eligible,
    campaignId: interaction.campaignId,
    campaignName,
    jobId: job?.jobId ?? interaction.jobId ?? `${interaction.campaignId}:unknown`,
    serviceName,
    title: `Refund decision — ${serviceName}`,
    detail: snapshot.reason,
    drillDownHref: productionWorkspaceRoute(interaction.campaignId, job?.jobId ?? interaction.jobId ?? ""),
    updatedAt: interaction.updatedAt,
    interactionId: interaction.id,
    refundSnapshot: snapshot,
  };
}

function deskItemFromComplaint(
  interaction: OwnerDecisionInteractionRecord,
  campaignName: string,
  job: PurchasedJobRecord | undefined,
): OwnerDeskItem | null {
  if (interaction.status !== "waiting_owner") return null;

  return {
    id: `desk:complaint:${interaction.id}`,
    reason: "client_complaint",
    reasonLabel: OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels.client_complaint,
    campaignId: interaction.campaignId,
    campaignName,
    jobId: job?.jobId ?? interaction.jobId ?? `${interaction.campaignId}:unknown`,
    serviceName: job?.serviceName ?? "this project",
    title: "Client complaint — Owner response required",
    detail: interaction.clientMessage,
    drillDownHref: ownerConsoleCampaignRoute(interaction.campaignId),
    updatedAt: interaction.updatedAt,
    interactionId: interaction.id,
  };
}

function deskItemHeavyLaneFull(
  laneViews: readonly ProductionLaneView[],
  nextUp: LaneJobView | null,
  jobs: readonly PurchasedJobRecord[],
): OwnerDeskItem | null {
  if (!isHeavyLaneFull(laneViews) || !nextUp) return null;

  const nextJob = jobs.find((entry) => entry.jobId === nextUp.jobId);
  if (nextJob?.heavyLaneOwnerDecision) return null;

  return {
    id: `desk:heavy-full:${nextUp.jobId}`,
    reason: "heavy_lane_full",
    reasonLabel: OWNER_CONTROL_ROOM_SECTION.ownerDeskReasonLabels.heavy_lane_full,
    campaignId: nextUp.campaignId,
    campaignName: nextUp.campaignName,
    jobId: nextUp.jobId,
    serviceName: nextUp.serviceName,
    title: `Heavy lane full — ${nextUp.serviceName} queued`,
    detail: "Heavy lane at capacity (1/1). Decide whether to bump or wait.",
    drillDownHref: ownerConsoleCampaignRoute(nextUp.campaignId),
    updatedAt: new Date().toISOString(),
  };
}

export type OwnerDeskInput = {
  campaignId: string;
  campaignName: string;
  jobs: readonly PurchasedJobRecord[];
  exceptions: readonly CampaignExceptionRecord[];
  laneViews: readonly ProductionLaneView[];
  ownerDecisionInteractions?: readonly OwnerDecisionInteractionRecord[];
};

export function resolveOwnerDeskItems(inputs: readonly OwnerDeskInput[]): OwnerDeskItem[] {
  const items: OwnerDeskItem[] = [];
  const seen = new Set<string>();

  for (const input of inputs) {
    for (const record of input.exceptions) {
      const linkedJob = record.taskId
        ? input.jobs.find((job) => record.taskId?.startsWith(job.skuId))
        : input.jobs[0];
      const item = deskItemFromException(record, input.campaignName, linkedJob);
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }

    for (const job of input.jobs) {
      const gate = deskItemFromApprovalGate(job, input.campaignName);
      if (gate && !seen.has(gate.id)) {
        seen.add(gate.id);
        items.push(gate);
      }
    }

    for (const interaction of input.ownerDecisionInteractions ?? []) {
      const linkedJob = interaction.jobId
        ? input.jobs.find((job) => job.jobId === interaction.jobId)
        : input.jobs[0];

      const refund = deskItemFromRefundRequest(interaction, input.campaignName, linkedJob);
      if (refund && !seen.has(refund.id)) {
        seen.add(refund.id);
        items.push(refund);
      }

      const complaint = deskItemFromComplaint(interaction, input.campaignName, linkedJob);
      if (complaint && !seen.has(complaint.id)) {
        seen.add(complaint.id);
        items.push(complaint);
      }
    }
  }

  const allLaneViews = inputs.flatMap((entry) => entry.laneViews);
  const allJobs = inputs.flatMap((entry) => entry.jobs);
  const heavyNext = findHeavyLaneNextUp(allLaneViews);
  const heavyFull = deskItemHeavyLaneFull(allLaneViews, heavyNext, allJobs);
  if (heavyFull && !seen.has(heavyFull.id)) {
    items.push(heavyFull);
  }

  return items.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
