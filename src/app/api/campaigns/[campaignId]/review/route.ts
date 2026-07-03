import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import {
  findReviewReadyJobs,
  resolveClientReviewView,
} from "@/lib/job-control/review-room-view";
import { getOrInitializeMaterials } from "@/lib/materials/store";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

/** Client-safe list of jobs ready for Review Room. */
export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/review`,
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
  const readyJobs = findReviewReadyJobs(jobs);

  const reviews = readyJobs
    .map((job) =>
      resolveClientReviewView({
        campaign: campaignEnvelope.record,
        job,
        envelope: { ...tasksEnvelope, jobRecords: jobs },
      }),
    )
    .filter((view): view is NonNullable<typeof view> => view !== null);

  return NextResponse.json({
    reviews,
    jobIds: reviews.map((entry) => entry.jobId),
  });
}
