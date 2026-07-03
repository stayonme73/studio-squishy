import { NextResponse } from "next/server";

import { canReadCampaign } from "@/lib/campaign-store/access";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
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
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId } = await context.params;
  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!canReadCampaign(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
