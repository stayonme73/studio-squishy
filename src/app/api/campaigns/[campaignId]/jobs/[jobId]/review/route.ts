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
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";
import { ensureDispatchExecution } from "@/lib/studio-dispatch";
import { identitySessionFromRequest } from "@/lib/studio-customer-identity-safety-gate/session";
import {
  requestStudioExtrasChanges,
  type StudioExtraChangeRequest,
} from "@/lib/studio-extras/machine";
import { isStudioExtraId } from "@/lib/studio-extras/selection";

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

  let body: ReviewRoomPatchBody & { studioExtraChanges?: readonly { id: string; note: string }[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Extra changes ride the package revision round. Checked before the package
  // revision is recorded so a bad Extras list never half-applies.
  const extraChanges: StudioExtraChangeRequest[] = [];
  if (body.action === "request_revision" && (body.studioExtraChanges ?? []).length > 0) {
    const truth = campaignEnvelope.record.studioExtras;
    for (const change of body.studioExtraChanges ?? []) {
      if (!truth || !isStudioExtraId(change.id)) {
        return NextResponse.json({ error: "That Studio Extra is not part of this order." }, { status: 422 });
      }
      extraChanges.push({ id: change.id, note: String(change.note ?? "") });
    }
    const dryRun = requestStudioExtrasChanges(truth!, extraChanges, {
      at: new Date().toISOString(),
      packageRound: 0,
      ridesPackageRevision: true,
    });
    if (!dryRun.ok) {
      return NextResponse.json({ error: dryRun.error }, { status: 422 });
    }
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

  const extrasTruth = campaignEnvelope.record.studioExtras;
  if (extrasTruth && !skipWrite) {
    const at = new Date().toISOString();
    let nextExtras = extrasTruth;
    if (
      body.action === "request_revision" &&
      result.correctionUseCreated &&
      result.correctionUse &&
      extraChanges.length > 0
    ) {
      const applied = requestStudioExtrasChanges(extrasTruth, extraChanges, {
        at,
        packageRound: result.correctionUse.ordinal,
        ridesPackageRevision: true,
      });
      if (applied.ok) nextExtras = applied.truth;
    }
    if (nextExtras !== extrasTruth) {
      campaignToPersist = {
        ...(campaignToPersist ?? campaignEnvelope.record),
        studioExtras: nextExtras,
        updatedAt: at,
      };
    }
  }

  if (campaignToPersist) {
    await upsertCampaignRecord(campaignToPersist, user.id);
  }

  const saved = skipWrite
    ? envelopeToPersist
    : await writeTasksEnvelope(envelopeToPersist);

  if (!skipWrite) {
    try {
      await deliverLifecycleNoticesForCampaign(campaignId);
    } catch {
      // The review decision is already saved. Retry sends the customer email.
    }
  }

  if (
    body.action === "request_revision" &&
    result.correctionUseCreated &&
    !skipWrite
  ) {
    const latestCampaign =
      campaignToPersist ??
      (await readCampaignEnvelope(campaignId))?.record ??
      campaignEnvelope.record;
    await ensureDispatchExecution(
      latestCampaign,
      identitySessionFromRequest(request, user.id, campaignId),
    );
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
