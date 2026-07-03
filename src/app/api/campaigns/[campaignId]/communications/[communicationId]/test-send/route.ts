import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { markJobCommunicationTestSent } from "@/lib/job-control/communication";

type RouteContext = {
  params: Promise<{ campaignId: string; communicationId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;
  if (!isOwnerUser(user)) {
    return NextResponse.json({ error: "Owner role required." }, { status: 403 });
  }

  const { campaignId, communicationId } = await context.params;
  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const tasksEnvelope = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
  const result = markJobCommunicationTestSent(
    tasksEnvelope,
    decodeURIComponent(communicationId),
    {
      role: "owner",
      userId: user.id,
      displayName: user.displayName ?? user.email,
    },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const saved = await writeTasksEnvelope(result.envelope);
  return NextResponse.json({
    communication: result.record,
    syncedAt: saved.syncedAt,
  });
}

