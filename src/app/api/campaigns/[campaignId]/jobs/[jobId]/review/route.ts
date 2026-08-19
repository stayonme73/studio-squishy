import { NextResponse } from "next/server";

import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import {
  getOrGenerateTasks,
  readTasksEnvelope,
  writeTasksEnvelope,
} from "@/lib/campaign-tasks/store";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import {
  applyReviewRoomPatch,
  type ReviewRoomPatchBody,
} from "@/lib/job-control/review-room-actions";
import {
  findCorrectionUseByPackageId,
} from "@/lib/job-control/correction-round-ledger";
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
import { ensureDispatchExecution } from "@/lib/studio-dispatch";

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

  let tasksEnvelope;
  let materialsEnvelope;
  try {
    [tasksEnvelope, materialsEnvelope] = await Promise.all([
      getOrGenerateTasks(campaignId, campaignEnvelope.record),
      getOrInitializeMaterials(campaignId, campaignEnvelope.record),
    ]);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "The Studio is still recording that action. Please try again." },
        { status: 503 },
      );
    }
    throw error;
  }

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
    materialsEnvelope.items,
    true,
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

  let envelopeToPersist = result.envelope;
  let campaignToPersist = result.updatedCampaign;
  let responseJob = result.job;
  let skipWrite = false;

  // C8c — re-read before write so a concurrent winner with the same package
  // is not overwritten (file store is last-write-wins).
  if (
    body.action === "request_revision" &&
    result.correctionUse &&
    result.correctionUseCreated
  ) {
    const latest = await readTasksEnvelope(campaignId);
    if (
      latest &&
      findCorrectionUseByPackageId(latest, result.correctionUse.packageId)
    ) {
      envelopeToPersist = latest;
      campaignToPersist = undefined;
      responseJob =
        latest.jobRecords?.find((entry) => entry.jobId === jobId) ?? result.job;
      skipWrite = true;
    }
  }

  if (campaignToPersist) {
    await upsertCampaignRecord(campaignToPersist, user.id);
  }

  const saved = skipWrite
    ? envelopeToPersist
    : await writeTasksEnvelope(envelopeToPersist);

  if (
    body.action === "request_revision" &&
    result.correctionUseCreated &&
    !skipWrite
  ) {
    const latestCampaign =
      campaignToPersist ??
      (await readCampaignEnvelope(campaignId))?.record ??
      campaignEnvelope.record;
    await ensureDispatchExecution(latestCampaign);
  }

  const afterDispatch = await readTasksEnvelope(campaignId);
  const envelopeForView = afterDispatch ?? saved;
  const jobForView =
    envelopeForView.jobRecords?.find((entry) => entry.jobId === jobId) ??
    responseJob;
  const campaignForView =
    (await readCampaignEnvelope(campaignId))?.record ??
    campaignToPersist ??
    campaignEnvelope.record;

  const view = resolveClientReviewView({
    campaign: campaignForView,
    job: jobForView,
    envelope: envelopeForView,
  });

  return NextResponse.json({
    job: redactJobFileStorageForClient(jobForView),
    feedback: result.feedback,
    review: view,
    syncedAt: envelopeForView.syncedAt,
  });
}
