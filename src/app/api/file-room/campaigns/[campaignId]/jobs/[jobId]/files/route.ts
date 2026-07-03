import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canOperateProductionTasks } from "@/lib/campaign-tasks/access";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import {
  parseFileRoomUploadFields,
  uploadFileRoomFile,
} from "@/lib/file-storage/upload-server";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { getOrInitializeMaterials } from "@/lib/materials/store";

type RouteContext = {
  params: Promise<{ campaignId: string; jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId, jobId } = await context.params;
  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  if (!canOperateProductionTasks(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload." }, { status: 400 });
  }

  const fields = parseFileRoomUploadFields(formData);
  if (!fields.ok) {
    return NextResponse.json({ error: fields.error }, { status: fields.status });
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

  try {
    const result = await uploadFileRoomFile({
      adapter: createServerFileRoomStorageAdapter(),
      envelope: { ...tasksEnvelope, jobRecords: jobs },
      campaign: campaignEnvelope.record,
      clientUserId: campaignEnvelope.clientUserId,
      job,
      user,
      fields,
    });

    return NextResponse.json({
      file: result.file,
      jobId: result.job.jobId,
      syncedAt: result.envelope.syncedAt,
    });
  } catch {
    return NextResponse.json({ error: "Private File Room upload failed." }, { status: 502 });
  }
}
