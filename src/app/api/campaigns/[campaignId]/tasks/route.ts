import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canReadProductionTasks } from "@/lib/campaign-tasks/access";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { resolveProductionTasksApiPayload } from "@/lib/campaign-tasks/tasks-view";
import { readCampaignAssignments } from "@/lib/file-room/assignments";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

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
  const payload = resolveProductionTasksApiPayload(tasksEnvelope);

  return NextResponse.json({
    ...payload,
    syncedAt: tasksEnvelope.syncedAt,
  });
}
