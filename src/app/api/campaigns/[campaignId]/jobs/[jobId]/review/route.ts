import { NextResponse } from "next/server";

import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import {
  applyReviewRoomPatch,
  type ReviewRoomPatchBody,
} from "@/lib/job-control/review-room-actions";
import {
  resolveCampaignCommunicationClientId,
  syncJobCommunicationRecords,
} from "@/lib/job-control/communication";
import { canClientAccessJobReview, canClientViewJobReview } from "@/lib/job-control/review-room-access";
import {
  findJobReviewFeedback,
  resolveClientReviewView,
} from "@/lib/job-control/review-room-view";
import { redactJobFileStorageForClient } from "@/lib/file-storage/redact";
import { getOrInitializeMaterials } from "@/lib/materials/store";

type RouteContext = {
  params: Promise<{ campaignId: string; jobId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { campaignId, jobId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/jobs/${jobId}/review`,
    jobId,
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
  const clientId = resolveCampaignCommunicationClientId(
    campaignEnvelope.clientUserId,
    campaignEnvelope.campaignId,
  );
  const communicationSync = syncJobCommunicationRecords({
    envelope: tasksEnvelope,
    campaign: campaignEnvelope.record,
    clientId,
    jobs,
    materials: materialsEnvelope.items,
  });
  const envelopeWithCommunications =
    JSON.stringify(tasksEnvelope.jobCommunicationRecords ?? []) !==
      JSON.stringify(communicationSync.envelope.jobCommunicationRecords ?? []) ||
    JSON.stringify(tasksEnvelope.jobActivityEvents ?? []) !==
      JSON.stringify(communicationSync.envelope.jobActivityEvents ?? []) ||
    JSON.stringify(tasksEnvelope.jobRecords ?? []) !==
      JSON.stringify(communicationSync.envelope.jobRecords ?? [])
      ? await writeTasksEnvelope(communicationSync.envelope)
      : communicationSync.envelope;
  const syncedJobs = communicationSync.jobs;
  const job = syncedJobs.find((entry) => entry.jobId === jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (!canClientAccessJobReview(job)) {
    const existingFeedback = findJobReviewFeedback(
      envelopeWithCommunications,
      job.jobId,
    );
    if (!canClientViewJobReview(job, existingFeedback)) {
      return NextResponse.json(
        { error: "This job is not ready for client review.", spineStatus: job.spineStatus },
        { status: 403 },
      );
    }
  }

  const view = resolveClientReviewView({
    campaign: campaignEnvelope.record,
    job,
    envelope: envelopeWithCommunications,
  });

  if (!view) {
    return NextResponse.json({ error: "Review not available." }, { status: 403 });
  }

  return NextResponse.json({ review: view });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { campaignId, jobId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/jobs/${jobId}/review`,
    jobId,
  );
  if (access instanceof NextResponse) return access;
  const { user, campaignEnvelope, assignments } = access;

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
  const clientId = resolveCampaignCommunicationClientId(
    campaignEnvelope.clientUserId,
    campaignEnvelope.campaignId,
  );
  const communicationSync = syncJobCommunicationRecords({
    envelope: tasksEnvelope,
    campaign: campaignEnvelope.record,
    clientId,
    jobs,
    materials: materialsEnvelope.items,
  });
  const envelopeWithJobs = communicationSync.envelope;
  const job = communicationSync.jobs.find((entry) => entry.jobId === jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const result = applyReviewRoomPatch(
    envelopeWithJobs,
    campaignEnvelope.record,
    job,
    body,
    user,
    assignments,
    clientId,
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
    job: redactJobFileStorageForClient(result.job),
    feedback: result.feedback,
    review: view,
    syncedAt: saved.syncedAt,
  });
}
