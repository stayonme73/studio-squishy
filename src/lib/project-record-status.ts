/**
 * Customer-safe per-job status for Project Record.
 * Allowlist only — every field here is deliberately approved for customer display.
 * Never import PurchasedJobRecord's internal-only fields (internalNotes, workingFileRefs,
 * staff attribution, capacity/lane management, refund/eligibility outcomes) into this shape.
 */

import type { ServiceId } from "@/catalog/types";
import { studioCustomerCurrentStatusV1 as currentStatus } from "@/config/studio-customer-current-status-v1";
import type { JobSpineStatus, PurchasedJobRecord } from "@/lib/job-control/types";

export type CustomerJobStatusSummary = {
  jobId: string;
  campaignId: string;
  skuId: ServiceId;
  serviceName: string;
  /** Plain-English translation of JobSpineStatus — never the raw internal status name. */
  statusLabel: string;
  isWaitingOnClient: boolean;
  hasProductionStarted: boolean;
  deliveredAt: string | null;
  clientDeadline: string | null;
};

const SPINE_STATUS_CUSTOMER_LABEL: Record<JobSpineStatus, string> = {
  ready_for_queue: currentStatus.labels.preparingToStart,
  building_concepts: currentStatus.labels.producing,
  ready_for_review: currentStatus.labels.reviewReady,
  revision_requested: currentStatus.labels.revisionUnderway,
  approved: currentStatus.labels.approvedPreparing,
  ready_for_delivery: currentStatus.labels.deliveryReady,
  delivered: currentStatus.labels.delivered,
  waiting_on_client: currentStatus.labels.waitingOnYou,
  refunded_cancelled: "Cancelled",
};

/** Translates a JobSpineStatus into the approved plain-English customer label. */
export function customerStatusLabel(spineStatus: JobSpineStatus): string {
  return SPINE_STATUS_CUSTOMER_LABEL[spineStatus];
}

/** Strips a PurchasedJobRecord down to the explicitly approved customer-safe fields. */
export function buildCustomerJobStatusSummary(job: PurchasedJobRecord): CustomerJobStatusSummary {
  return {
    jobId: job.jobId,
    campaignId: job.campaignId,
    skuId: job.skuId,
    serviceName: job.serviceName,
    statusLabel: customerStatusLabel(job.spineStatus),
    isWaitingOnClient: job.spineStatus === "waiting_on_client",
    hasProductionStarted: Boolean(job.productionStartedAt),
    deliveredAt: job.deliveredAt ?? null,
    clientDeadline: job.clientDeadline ?? null,
  };
}

export function buildCustomerJobStatusSummaries(
  jobs: readonly PurchasedJobRecord[],
): readonly CustomerJobStatusSummary[] {
  return jobs.map(buildCustomerJobStatusSummary);
}

/**
 * Which state the Project Status panel should render. The panel itself is always present in
 * the page (Package 1 completion requirement: stable structure across lifecycle stages) — only
 * its contents change.
 */
export type ProjectStatusPanelState =
  | { kind: "pending-payment" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" }
  | { kind: "loaded"; jobs: readonly CustomerJobStatusSummary[] };

export function resolveProjectStatusPanelState(params: {
  paymentReceivedAt: string | null | undefined;
  loading: boolean;
  error: string | null;
  jobs: readonly CustomerJobStatusSummary[];
}): ProjectStatusPanelState {
  if (!params.paymentReceivedAt) return { kind: "pending-payment" };
  if (params.loading) return { kind: "loading" };
  if (params.error) return { kind: "error" };
  if (params.jobs.length === 0) return { kind: "empty" };
  return { kind: "loaded", jobs: params.jobs };
}
