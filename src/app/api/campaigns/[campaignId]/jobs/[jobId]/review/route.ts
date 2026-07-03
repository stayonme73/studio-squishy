import { NextResponse } from "next/server";

import { canReadCampaign } from "@/lib/campaign-store/access";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import {
  applyReviewRoomPatch,
  type ReviewRoomPatchBody,
} from "@/lib/job-control/review-room-actions";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { resolveClientReviewView } from "@/lib/job-control/review-room-view";
import { getOrInitializeMaterials } from "@/lib/materials/store";

type RouteContext = {
  params: Promise<{ campaignId: string; jobId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId, jobId } = await context.params;
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
  const job = jobs.find((entry) => entry.jobId === jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (!canClientAccessJobReview(job)) {
    return NextResponse.json(
      { error: "This job is not ready for client review.", spineStatus: job.spineStatus },
      { status: 403 },
    );
  }

  const view = resolveClientReviewView({
    campaign: campaignEnvelope.record,
    job,
    envelope: { ...tasksEnvelope, jobRecords: jobs },
  });

  if (!view) {
    return NextResponse.json({ error: "Review not available." }, { status: 403 });
  }

  return NextResponse.json({ review: view });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId, jobId } = await context.params;
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

  let body: ReviewRoomPatchBody;
  try {
    body = (await request.json()) as ReviewRoomPatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
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
  const job = jobs.find((entry) => entry.jobId === jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const envelopeWithJobs = { ...tasksEnvelope, jobRecords: jobs };

  const result = applyReviewRoomPatch(
    envelopeWithJobs,
    campaignEnvelope.record,
    job,
    body,
    user,
    assignments,
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        revisionLimitReached: result.revisionLimitReached ?? false,
      },
      { status: result.status },
    );
  }

  if (result.updatedCampaign) {
    await upsertCampaignRecord(result.updatedCampaign, user.id);
  }

  const saved = await writeTasksEnvelope(result.envelope);

  const view = resolveClientReviewView({
    campaign: result.updatedCampaign ?? campaignEnvelope.record,
    job: result.job,
    envelope: saved,
  });

  return NextResponse.json({
    job: result.job,
    feedback: result.feedback,
    review: view,
    syncedAt: saved.syncedAt,
  });
}
