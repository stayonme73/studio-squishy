/**
 * One Campaign Launch Kit purchase dispatches four existing production tools.
 * Design: flyer and graphics. Copy: one email and two texts.
 */

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import {
  CAMPAIGN_LAUNCH_KIT_PACKAGE_ID,
  studioCampaignLaunchKitCurrentDoorContractV1,
} from "@/config/studio-campaign-launch-kit-current-door-contract-v1";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { evaluateJobRoutingDecision } from "@/lib/studio-routing-handoff/evaluate";
import type { JobRoutingDecision } from "@/lib/studio-routing-handoff/types";

import { condensedServiceSku } from "@/config/studio-customer-journey-condense-v1";

import { readCampaignLaunchKitBrief } from "./campaign-launch-kit-brief";

const CONTRACT = studioCampaignLaunchKitCurrentDoorContractV1;
const PARENT = CAMPAIGN_LAUNCH_KIT_PACKAGE_ID;
const PARENT_SERVICE = PARENT as ServiceId;
/** Condensed checkout stores factory SKU on the parent job; composite routing keys off package id. */
const PARENT_FACTORY_SKU = condensedServiceSku(PARENT) as ServiceId;

function isCampaignLaunchKitParentJob(skuId: ServiceId): boolean {
  return skuId === PARENT_SERVICE || skuId === PARENT_FACTORY_SKU;
}

const BRANCHES = [
  CONTRACT.branches.flyer,
  CONTRACT.branches.email,
  CONTRACT.branches.sms,
  CONTRACT.branches.graphics,
] as const;

function parentMaterialsForBranch(
  materials: readonly CampaignMaterialItem[],
  branchSku: ServiceId,
): CampaignMaterialItem[] {
  return materials
    .filter((item) => item.relatedServiceIds.includes(PARENT_SERVICE))
    .map((item) => ({ ...item, relatedServiceIds: [branchSku] }));
}

function branchJob(
  parent: Pick<PurchasedJobRecord, "jobId" | "campaignId" | "intakeComplete" | "ownerApprovalPending">,
  branchId: string,
  capabilitySku: ServiceId,
  intakeComplete: boolean,
): PurchasedJobRecord {
  return {
    jobId: `${parent.jobId}:branch:${branchId}`,
    campaignId: parent.campaignId,
    skuId: capabilitySku,
    serviceName: CONTRACT.customerFacingName,
    spineStatus: "ready_for_queue",
    productionLane: "standard",
    intakeComplete,
    ownerApprovalPending: parent.ownerApprovalPending ?? null,
  } as PurchasedJobRecord;
}

export function campaignLaunchKitCompositeRoutingDecisions(input: {
  campaign: CampaignRecord;
  job: Pick<
    PurchasedJobRecord,
    "jobId" | "campaignId" | "skuId" | "intakeComplete" | "ownerApprovalPending"
  >;
  materials: readonly CampaignMaterialItem[];
  evaluatedAt?: string;
}): JobRoutingDecision[] | null {
  if (!isCampaignLaunchKitParentJob(input.job.skuId)) return null;
  const brief = readCampaignLaunchKitBrief(input.campaign);
  const intakeComplete = Boolean(input.job.intakeComplete && brief.ok);
  return BRANCHES.map((branch) =>
    evaluateJobRoutingDecision({
      campaign: input.campaign,
      job: branchJob(input.job, branch.branchId, branch.capabilitySku, intakeComplete),
      materials: parentMaterialsForBranch(input.materials, branch.capabilitySku),
      evaluatedAt: input.evaluatedAt,
    }),
  );
}
