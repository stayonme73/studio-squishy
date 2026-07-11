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
import { getOrInitializeProduction, writeProductionEnvelope } from "@/lib/campaign-production/store";
import { resolveProductionTasksApiPayload } from "@/lib/campaign-tasks/tasks-view";
import { syncMaterialsSummaryOnCampaign } from "@/lib/materials/campaign-summary";
import { countBlockingRequiredMaterials } from "@/lib/materials/materials-view";
import { getOrInitializeMaterials, writeMaterialsEnvelope } from "@/lib/materials/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { findUserById, toPublicUser } from "@/lib/auth/users";
import {
  assertProjectChangeOwnerOrchestrationBody,
  orchestrateProjectChangeOwnerScopeAction,
} from "@/lib/project-change/owner-outcome-orchestrator";
import { orchestrateOwnerApplyProjectChangeScope } from "@/lib/project-change/owner-apply-orchestrator";
import { parseProjectChangeDelta } from "@/lib/project-change/types";

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
    jobRecords: saved.jobRecords ?? [],
    ownerDecisionInteractions: saved.ownerDecisionInteractions ?? [],
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

  const [tasksEnvelope, materialsEnvelope, productionEnvelope] = await Promise.all([
    getOrGenerateTasks(campaignId, campaignEnvelope.record),
    getOrInitializeMaterials(campaignId, campaignEnvelope.record),
    getOrInitializeProduction(campaignId, campaignEnvelope.record),
  ]);

  let targetUser;
  if (
    (body.action === "reassign" ||
      body.action === "assign_exception" ||
      body.action === "owner_ask_team_compliance_hold" ||
      body.action === "owner_assign_compliance_hold" ||
      body.action === "owner_ask_team_direction_disagreement" ||
      body.action === "owner_assign_direction_disagreement" ||
      body.action === "owner_assign_deadline" ||
      body.action === "owner_assign_revision" ||
      body.action === "owner_assign_scope_change") &&
    "assignToUserId" in body &&
    body.assignToUserId
  ) {
    const toUserId =
      body.action === "reassign" ? body.toUserId : body.assignToUserId;
    if (toUserId) {
      const userRecord = await findUserById(toUserId);
      targetUser = userRecord ? toPublicUser(userRecord) : undefined;
    }
  }

  const taskContext = {
    campaign: campaignEnvelope.record,
    materials: materialsEnvelope.items,
    materialsEnvelope,
    production: productionEnvelope,
    assignments,
    targetUser,
  };

  if (body.action === "owner_apply_project_change_scope") {
    const change = parseProjectChangeDelta(body.change);
    if (!change) {
      return NextResponse.json({ error: "Invalid project change delta." }, { status: 400 });
    }

    const applied = await orchestrateOwnerApplyProjectChangeScope({
      campaignId,
      exceptionId: body.exceptionId,
      change,
      user,
      assignments,
    });

    if (!applied.ok) {
      return NextResponse.json(
        {
          error: applied.error,
          paymentRequired: applied.paymentRequired,
        },
        { status: applied.status },
      );
    }

    const saved = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
    return NextResponse.json(teamPayload(saved, user, assignments));
  }

  if (assertProjectChangeOwnerOrchestrationBody(body)) {
    const orchestrated = await orchestrateProjectChangeOwnerScopeAction({
      campaignId,
      exceptionId: body.exceptionId,
      action: body.action,
      user,
      clientMessage: "clientMessage" in body ? body.clientMessage : undefined,
      tasksEnvelope,
      taskPatchBody: body,
      taskContext,
    });

    if (!orchestrated.ok) {
      if (orchestrated.status === 409 && orchestrated.conflict) {
        return NextResponse.json(
          {
            error: orchestrated.error,
            conflict: {
              ...orchestrated.conflict,
              task: {
                ...orchestrated.conflict.task,
                claimVersion: orchestrated.conflict.claimVersion,
              },
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: orchestrated.error }, { status: orchestrated.status });
    }

    const saved = orchestrated.taskResult.envelope;

    if (orchestrated.taskResult.productionEnvelope) {
      await writeProductionEnvelope(orchestrated.taskResult.productionEnvelope);
    }

    if (orchestrated.taskResult.materialsEnvelope) {
      const savedMaterials = await writeMaterialsEnvelope(orchestrated.taskResult.materialsEnvelope);
      await syncMaterialsSummaryOnCampaign(
        campaignId,
        countBlockingRequiredMaterials(savedMaterials.items),
      );
    }

    return NextResponse.json(teamPayload(saved, user, assignments));
  }

  const result = applyTaskPatch(tasksEnvelope, body, user, taskContext);

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

  if (result.productionEnvelope) {
    await writeProductionEnvelope(result.productionEnvelope);
  }

  if (result.materialsEnvelope) {
    const savedMaterials = await writeMaterialsEnvelope(result.materialsEnvelope);
    await syncMaterialsSummaryOnCampaign(
      campaignId,
      countBlockingRequiredMaterials(savedMaterials.items),
    );
  }

  return NextResponse.json(teamPayload(saved, user, assignments));
}
