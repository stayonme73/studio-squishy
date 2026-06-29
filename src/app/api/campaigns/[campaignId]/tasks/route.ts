import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import {
  applyTaskPatch,
  isTasksTeamAudience,
  resolveOperatorPayload,
  type TasksPatchBody,
} from "@/lib/campaign-tasks/actions";
import { canOperateProductionTasks, canReadProductionTasks } from "@/lib/campaign-tasks/access";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { resolveProductionTasksApiPayload } from "@/lib/campaign-tasks/tasks-view";
import { syncMaterialsSummaryOnCampaign } from "@/lib/materials/campaign-summary";
import { countBlockingRequiredMaterials } from "@/lib/materials/materials-view";
import { getOrInitializeMaterials, writeMaterialsEnvelope } from "@/lib/materials/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { findUserById, toPublicUser } from "@/lib/auth/users";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

function teamPayload(
  saved: Awaited<ReturnType<typeof getOrGenerateTasks>>,
  user: import("@/lib/campaign-store/types").StudioUser,
  assignments: Awaited<ReturnType<typeof readCampaignAssignments>>,
) {
  const payload = resolveProductionTasksApiPayload(saved, { includeQaSummary: true });
  return {
    ...payload,
    handoffs: saved.handoffs ?? [],
    qaRecords: saved.qaRecords ?? [],
    exceptionRecords: saved.exceptionRecords ?? [],
    exceptionEvents: saved.exceptionEvents ?? [],
    tasks: payload.tasks.map((task) => ({
      ...task,
      claimVersion: task.claimedAt ?? null,
    })),
    operator: resolveOperatorPayload(user, assignments),
    syncedAt: saved.syncedAt,
    version: saved.version ?? 5,
  };
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

  if (isTasksTeamAudience(user)) {
    return NextResponse.json(teamPayload(tasksEnvelope, user, assignments));
  }

  const payload = resolveProductionTasksApiPayload(tasksEnvelope);
  return NextResponse.json({
    ...payload,
    syncedAt: tasksEnvelope.syncedAt,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  if (!canOperateProductionTasks(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: TasksPatchBody;
  try {
    body = (await request.json()) as TasksPatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const [tasksEnvelope, materialsEnvelope] = await Promise.all([
    getOrGenerateTasks(campaignId, campaignEnvelope.record),
    getOrInitializeMaterials(campaignId, campaignEnvelope.record),
  ]);

  let targetUser;
  if (body.action === "reassign" || body.action === "assign_exception") {
    const toUserId =
      body.action === "reassign" ? body.toUserId : body.assignToUserId;
    const userRecord = await findUserById(toUserId);
    targetUser = userRecord ? toPublicUser(userRecord) : undefined;
  }

  const result = applyTaskPatch(tasksEnvelope, body, user, {
    campaign: campaignEnvelope.record,
    materials: materialsEnvelope.items,
    materialsEnvelope,
    assignments,
    targetUser,
  });

  if (!result.ok) {
    if (result.status === 409 && result.conflict) {
      return NextResponse.json(
        {
          error: result.error,
          conflict: {
            ...result.conflict,
            task: {
              ...result.conflict.task,
              claimVersion: result.conflict.claimVersion,
            },
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const saved = await writeTasksEnvelope(result.envelope);

  if (result.materialsEnvelope) {
    const savedMaterials = await writeMaterialsEnvelope(result.materialsEnvelope);
    await syncMaterialsSummaryOnCampaign(
      campaignId,
      countBlockingRequiredMaterials(savedMaterials.items),
    );
  }

  return NextResponse.json(teamPayload(saved, user, assignments));
}
