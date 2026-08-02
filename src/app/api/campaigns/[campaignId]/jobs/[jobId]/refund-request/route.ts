import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canSubmitMaterials } from "@/lib/materials/access";
import {
  applyClientSubmitRefundRequest,
  findLatestRefundRequestForJob,
  withSyncedJobRecordsForRefund,
} from "@/lib/campaign-tasks/refund-request-actions";
import { toRefundRequestCustomerView } from "@/lib/campaign-tasks/refund-request-status-view";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { isRefundRequestSourceChannel } from "@/config/refund-request-channels";

type RouteContext = {
  params: Promise<{ campaignId: string; jobId: string }>;
};

async function loadRefundRequestTasks(campaignId: string, campaignEnvelope: NonNullable<
  Awaited<ReturnType<typeof readCampaignEnvelope>>
>) {
  const [tasksEnvelope, materialsEnvelope] = await Promise.all([
    getOrGenerateTasks(campaignId, campaignEnvelope.record),
    getOrInitializeMaterials(campaignId, campaignEnvelope.record),
  ]);
  return withSyncedJobRecordsForRefund(
    tasksEnvelope,
    campaignEnvelope.record,
    materialsEnvelope.items,
  );
}

/**
 * Customer-safe refund-request status for a job.
 * Uses Board / project-status job sync so plan-visible jobs resolve for return-path status.
 */
export async function GET(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId, jobId } = await context.params;
  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasksEnvelope = await loadRefundRequestTasks(campaignId, campaignEnvelope);
  const job = tasksEnvelope.jobRecords?.find((entry) => entry.jobId === jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const interaction = findLatestRefundRequestForJob(tasksEnvelope, jobId);
  return NextResponse.json({
    ok: true,
    campaignId,
    jobId,
    refundRequest: interaction ? toRefundRequestCustomerView(interaction, job) : null,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId, jobId } = await context.params;
  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    reason?: string;
    requestedOutcome?: string;
    supportingDetails?: string;
    sourceChannel?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceChannel = isRefundRequestSourceChannel(body.sourceChannel)
    ? body.sourceChannel
    : "structured_customer_form";

  const tasksEnvelope = await loadRefundRequestTasks(campaignId, campaignEnvelope);
  const result = applyClientSubmitRefundRequest(
    tasksEnvelope,
    {
      jobId,
      reason: body.reason,
      requestedOutcome: body.requestedOutcome,
      supportingDetails: body.supportingDetails,
      sourceChannel,
    },
    user,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await writeTasksEnvelope(result.envelope);
  return NextResponse.json({
    ok: true,
    interaction: result.interaction,
    syncedAt: result.envelope.syncedAt,
  });
}
