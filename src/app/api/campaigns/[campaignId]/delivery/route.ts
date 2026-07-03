import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { resolveFinalDeliveryView } from "@/lib/job-control/final-delivery-view";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { getOrInitializeMaterials } from "@/lib/materials/store";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/delivery`,
  );
  if (access instanceof NextResponse) return access;
  const { campaignEnvelope } = access;

  const [tasksEnvelope, materialsEnvelope] = await Promise.all([
    getOrGenerateTasks(campaignId, campaignEnvelope.record),
    getOrInitializeMaterials(campaignId, campaignEnvelope.record),
  ]);

  const synced = syncJobRecordsFromCampaign(
    campaignEnvelope.record,
    tasksEnvelope.tasks ?? [],
    materialsEnvelope.items,
    tasksEnvelope.exceptionRecords ?? [],
    tasksEnvelope.jobRecords,
  );
  const jobs = applyWaitingOnClientPolicies(synced, materialsEnvelope.items);

  const delivery = resolveFinalDeliveryView(campaignEnvelope.record, jobs);

  return NextResponse.json({ delivery });
}
