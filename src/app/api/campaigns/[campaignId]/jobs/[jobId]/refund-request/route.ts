import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canSubmitMaterials } from "@/lib/materials/access";
import { applyClientSubmitRefundRequest } from "@/lib/campaign-tasks/refund-request-actions";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { isRefundRequestSourceChannel } from "@/config/refund-request-channels";

type RouteContext = {
  params: Promise<{ campaignId: string; jobId: string }>;
};

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

  const tasksEnvelope = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
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
