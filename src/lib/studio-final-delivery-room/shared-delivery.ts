import { customerVisibleFileFormatLabel } from "@/config/deliverables";
import type { ClientJobDeliveryView } from "@/lib/job-control/final-delivery-view";

export type ReleasedDeliveryFile = {
  id: string;
  label: string;
  fileName: string;
  formatLabel: string;
  versionLabel: string;
  href: string;
  instructions: string | null;
};

/** What the shared conveyor may show. Built only from a released job view. */
export type ReleasedDeliveryPresentation = {
  customerName: string;
  serviceName: string;
  campaignId: string;
  jobId: string;
  thanks: readonly string[];
  files: readonly ReleasedDeliveryFile[];
};

const CLIP_ONLY_PHRASE = /five finished vertical shorts|Clip-Repurposing-Short-/i;

function releasedSpine(job: ClientJobDeliveryView): boolean {
  return job.spineStatus === "ready_for_delivery" || job.spineStatus === "delivered";
}

export function selectReleasedDeliveryJob(
  jobs: readonly ClientJobDeliveryView[],
  requestedJobId?: string | null,
): ClientJobDeliveryView | null {
  const eligible = jobs.filter((job) => releasedSpine(job) && job.files.length > 0);
  const requested = requestedJobId?.trim();
  if (requested) return eligible.find((job) => job.jobId === requested) ?? null;
  return eligible.length === 1 ? eligible[0]! : null;
}

export function buildReleasedDeliveryPresentation(input: {
  campaignId: string;
  campaignName: string;
  job: ClientJobDeliveryView;
}): ReleasedDeliveryPresentation | null {
  if (!releasedSpine(input.job) || input.job.files.length === 0) return null;
  const campaignName = input.campaignName.trim() || "Your project";
  const serviceName = input.job.serviceName.trim() || "Your Studio service";
  const thanks = [
    `Your ${serviceName} files are ready.`,
    `These are the files released for ${campaignName}.`,
    "Each download is the current released version for that file.",
    "A note about this delivery does not start a revision, a refund, or a new service.",
  ];
  if (thanks.some((line) => CLIP_ONLY_PHRASE.test(line))) return null;
  return {
    customerName: campaignName,
    serviceName,
    campaignId: input.campaignId,
    jobId: input.job.jobId,
    thanks,
    files: input.job.files.map((file) => ({
      id: file.id,
      label: file.deliverableLabel.trim() || file.fileName,
      fileName: file.fileName,
      formatLabel: customerVisibleFileFormatLabel(file.fileType, file.fileName),
      versionLabel: file.versionLabel?.trim() || "Current release",
      href: file.url,
      instructions: file.useInstructions,
    })),
  };
}
