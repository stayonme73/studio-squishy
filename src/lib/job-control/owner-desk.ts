import { ownerConsoleCampaignRoute } from "@/config/owner-console";
import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { productionWorkspaceRoute } from "@/config/production-workspace";
import type { CampaignExceptionRecord } from "@/lib/campaign-tasks/exceptions-types";
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
    serviceName: job?.serviceName ?? "Campaign",
    title: record.title,
    detail: record.description ?? record.title,
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
      title: `Review gate — ${job.serviceName}`,
      detail: "Owner approval required before client review.",
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

function deskItemHeavyLaneFull(
  laneViews: readonly ProductionLaneView[],
  nextUp: LaneJobView | null,
): OwnerDeskItem | null {
  if (!isHeavyLaneFull(laneViews) || !nextUp) return null;

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
  }

  const allLaneViews = inputs.flatMap((entry) => entry.laneViews);
  const heavyNext = findHeavyLaneNextUp(allLaneViews);
  const heavyFull = deskItemHeavyLaneFull(allLaneViews, heavyNext);
  if (heavyFull && !seen.has(heavyFull.id)) {
    items.push(heavyFull);
  }

  return items.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
