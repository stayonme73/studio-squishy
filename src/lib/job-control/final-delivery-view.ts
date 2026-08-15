import type { CampaignRecord } from "@/config/studio-board";
import { findProductionPlanLineForJob } from "@/lib/approved-plan-line";
import { customerVisiblePurchaseLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";

import { canClientAccessJobDelivery, isJobDeliveredToClient } from "./final-delivery-access";
import type { JobClientDeliveryFile, PurchasedJobRecord } from "./types";
import { clientDeliveryFileIsReleased } from "@/lib/file-registry/job-files";
import { resolveClientFacingFileHref } from "@/lib/file-storage/routes";

export type ClientDeliveryFileView = {
  id: string;
  deliverableLabel: string;
  fileName: string;
  fileType: string;
  url: string;
  useInstructions: string | null;
  addedAt: string;
  versionLabel: string | null;
  releasedAt: string | null;
};

export type ClientJobDeliveryView = {
  jobId: string;
  serviceName: string;
  spineStatus: PurchasedJobRecord["spineStatus"];
  deliveredAt: string | null;
  completedDeliverables: readonly string[];
  files: readonly ClientDeliveryFileView[];
};

export type FinalDeliveryView = {
  state: "no_access" | "preparing" | "ready";
  campaignName: string;
  jobs: readonly ClientJobDeliveryView[];
  hasDeliveredJobs: boolean;
  allJobsDelivered: boolean;
};

function formatFileView(file: JobClientDeliveryFile): ClientDeliveryFileView {
  return {
    id: file.id,
    deliverableLabel: file.deliverableLabel,
    fileName: file.fileName,
    fileType: file.fileType,
    url: resolveClientFacingFileHref({
      registryFileId: file.registryFileId,
      url: file.url,
      storageRef: file.storageRef,
      purpose: "download",
    }),
    useInstructions: file.useInstructions ?? null,
    addedAt: file.addedAt,
    versionLabel: file.versionLabel ?? null,
    releasedAt: file.releasedAt ?? null,
  };
}

function completedDeliverablesForJob(
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
): string[] {
  const line = findProductionPlanLineForJob(campaign, job);
  const labels = line?.deliverables ? [...line.deliverables] : [];
  return [...customerVisiblePurchaseLabelsForSku(job.skuId, labels)];
}

function resolveJobDeliveryView(
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
): ClientJobDeliveryView | null {
  if (!canClientAccessJobDelivery(job)) return null;

  const files = (job.clientDeliveryFiles ?? [])
    .filter((file) => clientDeliveryFileIsReleased(job, file))
    .map(formatFileView);
  if (files.length === 0 && !isJobDeliveredToClient(job)) return null;

  return {
    jobId: job.jobId,
    serviceName: job.serviceName,
    spineStatus: job.spineStatus,
    deliveredAt: job.deliveredAt ?? null,
    completedDeliverables: completedDeliverablesForJob(campaign, job),
    files,
  };
}

/** Client-isolated Final Delivery view — only jobs released for delivery on this campaign. */
export function resolveFinalDeliveryView(
  campaign: CampaignRecord | null,
  jobs: readonly PurchasedJobRecord[],
): FinalDeliveryView {
  const base = {
    campaignName: campaign?.campaignName ?? "—",
    jobs: [] as ClientJobDeliveryView[],
    hasDeliveredJobs: false,
    allJobsDelivered: false,
  };

  if (!campaign) {
    return { ...base, state: "no_access" };
  }

  const visibleJobs = jobs
    .filter((job) => job.campaignId === campaign.campaignId)
    .map((job) => resolveJobDeliveryView(campaign, job))
    .filter((entry): entry is ClientJobDeliveryView => entry !== null);

  if (visibleJobs.length === 0) {
    return { ...base, state: "preparing", campaignName: campaign.campaignName };
  }

  const hasDeliveredJobs = visibleJobs.some((job) => job.spineStatus === "delivered");
  const campaignJobs = jobs.filter((job) => job.campaignId === campaign.campaignId);
  const allJobsDelivered =
    campaignJobs.length > 0 && campaignJobs.every((job) => job.spineStatus === "delivered");

  return {
    state: "ready",
    campaignName: campaign.campaignName,
    jobs: visibleJobs,
    hasDeliveredJobs,
    allJobsDelivered,
  };
}

export type FinalDeliveryBoardJobSummary = {
  jobId: string;
  serviceName: string;
  spineStatus: PurchasedJobRecord["spineStatus"];
  deliveredAt: string | null;
  clientCanDownload: boolean;
};

export function resolveFinalDeliveryBoardSummary(
  jobs: readonly PurchasedJobRecord[],
): readonly FinalDeliveryBoardJobSummary[] {
  return jobs.map((job) => ({
    jobId: job.jobId,
    serviceName: job.serviceName,
    spineStatus: job.spineStatus,
    deliveredAt: job.deliveredAt ?? null,
    clientCanDownload:
      canClientAccessJobDelivery(job) && (job.clientDeliveryFiles?.length ?? 0) > 0,
  }));
}
