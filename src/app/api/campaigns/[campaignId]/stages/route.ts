import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { buildClientStagesResponse } from "@/lib/review-delivery-stage/build-client-stages";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

/**
 * Package 7B1 — customer-safe Review & Delivery stage projection.
 * Authorization and job sync match review/delivery/project-status routes.
 */
export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/stages`,
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

  const payload = buildClientStagesResponse(jobs, {
    jobReviewFeedback: tasksEnvelope.jobReviewFeedback,
    jobCommunicationRecords: tasksEnvelope.jobCommunicationRecords,
  });

  return NextResponse.json(payload);
}
