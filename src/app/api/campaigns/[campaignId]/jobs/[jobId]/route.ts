import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canOperateProductionTasks, canReadProductionTasks } from "@/lib/campaign-tasks/access";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { applyProductionWorkspacePatch, type ProductionWorkspacePatchBody } from "@/lib/job-control/production-workspace-actions";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { isOwnerUser } from "@/lib/campaign-store/access";

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
  const job = jobs.find((entry) => entry.jobId === jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const envelopeWithJobs: typeof tasksEnvelope = {
    ...tasksEnvelope,
    jobRecords: jobs,
  };

  const listItem = resolveFileRoomListItemView(campaignEnvelope);
  const laneViews = resolveProductionLaneViews(
    jobs.map((entry) => ({
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
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const saved = await writeTasksEnvelope(result.envelope);

  return NextResponse.json({
    job: result.job,
    syncedAt: saved.syncedAt,
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

  const tasksEnvelope = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
  return NextResponse.json({
    jobRecords: tasksEnvelope.jobRecords ?? [],
    jobActivityEvents: tasksEnvelope.jobActivityEvents ?? [],
    syncedAt: tasksEnvelope.syncedAt,
  });
}
