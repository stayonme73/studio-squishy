import type {
  ApprovedStudioPlanLineItem,
  CampaignRecord,
} from "@/config/studio-board";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import { clientDeliveryFileLabelsForSku } from "@/lib/studio-review-revision/flyer-purchase-delivery-truth";

import type { PurchasedJobRecord } from "@/lib/job-control/types";

/** Resolve stable SKU id from a frozen plan line — prefers skuId, falls back to legacy serviceId. */
export function lineSkuId(line: { skuId?: string; serviceId?: string }): string {
  return (line.skuId ?? line.serviceId)!;
}

/** Match a production job to its frozen approved-plan line item (excludes execution add-ons). */
export function findProductionPlanLineForJob(
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
): ApprovedStudioPlanLineItem | undefined {
  const plan = campaign.approvedStudioPlan;
  if (!plan) return undefined;
  return filterProductionPlanLineItems(plan).find(
    (item) => lineSkuId(item) === job.skuId,
  );
}

/** Required deliverable labels for a job — from frozen plan only, never live catalog. */
export function requiredDeliverablesForJob(
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
): readonly string[] {
  const line = findProductionPlanLineForJob(campaign, job);
  return line?.deliverables ? [...line.deliverables] : [];
}

/** Required Final Delivery files — flyer promised files, not internal QA / supporting slots. */
export function requiredClientDeliveryFileLabelsForJob(
  campaign: CampaignRecord,
  job: PurchasedJobRecord,
): readonly string[] {
  return clientDeliveryFileLabelsForSku(
    job.skuId,
    requiredDeliverablesForJob(campaign, job),
  );
}
