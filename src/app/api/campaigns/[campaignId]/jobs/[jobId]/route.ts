import { NextResponse } from "next/server";

import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canOperateProductionTasks, canReadProductionTasks } from "@/lib/campaign-tasks/access";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { applyProductionWorkspacePatch, type ProductionWorkspacePatchBody } from "@/lib/job-control/production-workspace-actions";
import {
  resolveCampaignCommunicationClientId,
  syncJobCommunicationRecords,
} from "@/lib/job-control/communication";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { redactJobFileStorageForClient } from "@/lib/file-storage/redact";

type RouteContext = {
  params: Promise<{ campaignId: string; jobId: string }>;
};

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

  if (!canOperateProductionTasks(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: ProductionWorkspacePatchBody;
  try {
    body = (await request.json()) as ProductionWorkspacePatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "owner_approve_for_review" && !isOwnerUser(user)) {
    return NextResponse.json({ error: "Owner role required." }, { status: 403 });
  }

  if (
    (body.action === "owner_send_back_for_review" ||
      body.action === "owner_hold_review_gate" ||
      body.action === "owner_ask_team_review_gate" ||
      body.action === "owner_ask_client_review_gate" ||
      body.action === "owner_final_release" ||
      body.action === "mark_delivered" ||
      body.action === "issue_refund") &&
    !isOwnerUser(user)
  ) {
    return NextResponse.json({ error: "Owner role required." }, { status: 403 });
  }

  const [tasksEnvelope, materialsEnvelope] = await Promise.all([
    getOrGenerateTasks(campaignId, campaignEnvelope.record),
    getOrInitializeMaterials(campaignId, campaignEnvelope.record),
  ]);

  const materials = materialsEnvelope.items;
  const tasks = tasksEnvelope.tasks ?? [];
  const exceptions = tasksEnvelope.exceptionRecords ?? [];

  const synced = syncJobRecordsFromCampaign(
    campaignEnvelope.record,
    tasks,
    materials,
    exceptions,
    tasksEnvelope.jobRecords,
  );
  const jobs = applyWaitingOnClientPolicies(synced, materials);
  const clientId = resolveCampaignCommunicationClientId(
    campaignEnvelope.clientUserId,
    campaignEnvelope.campaignId,
  );
  const communicationSync = syncJobCommunicationRecords({
    envelope: tasksEnvelope,
    campaign: campaignEnvelope.record,
    clientId,
    jobs,
    materials,
  });
  const job = communicationSync.jobs.find((entry) => entry.jobId === jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const envelopeWithJobs: typeof tasksEnvelope = communicationSync.envelope;

  const listItem = resolveFileRoomListItemView(campaignEnvelope);
  const laneViews = resolveProductionLaneViews(
    communicationSync.jobs.map((entry) => ({
      campaignName: listItem.campaignName,
      job: entry,
      tasks,
    })),
  );

  const result = applyProductionWorkspacePatch(
    envelopeWithJobs,
    campaignEnvelope.record,
    jobId,
    body,
    user,
    materials,
    laneViews,
    clientId,
    tasks,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const saved = await writeTasksEnvelope(result.envelope);

  if (result.updatedCampaign) {
    await upsertCampaignRecord(result.updatedCampaign);
  }

  return NextResponse.json({
    job: redactJobFileStorageForClient(result.job),
    syncedAt: saved.syncedAt,
    campaignStatus: result.updatedCampaign?.campaignStatus,
  });
}

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

  if (!canReadProductionTasks(user, campaignId, campaignEnvelope, assignments)) {
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

  let envelope = communicationSync.envelope;
  const prior = tasksEnvelope.jobRecords ?? [];
  if (
    JSON.stringify(prior) !== JSON.stringify(communicationSync.jobs) ||
    JSON.stringify(tasksEnvelope.jobCommunicationRecords ?? []) !==
      JSON.stringify(envelope.jobCommunicationRecords ?? []) ||
    JSON.stringify(tasksEnvelope.jobActivityEvents ?? []) !==
      JSON.stringify(envelope.jobActivityEvents ?? [])
  ) {
    envelope = await writeTasksEnvelope(envelope);
  }

  return NextResponse.json({
    jobRecords: communicationSync.jobs.map(redactJobFileStorageForClient),
    jobActivityEvents: envelope.jobActivityEvents ?? [],
    syncedAt: envelope.syncedAt,
  });
}
