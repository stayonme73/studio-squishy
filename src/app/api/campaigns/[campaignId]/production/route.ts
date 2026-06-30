import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import {
  applyCreateVersion,
  type ProductionActionResult,
} from "@/lib/campaign-production/actions";
import {
  canOperateProductionWork,
  canReadProductionWork,
} from "@/lib/campaign-production/access";
import { resolveProductionApiPayload } from "@/lib/campaign-production/production-view";
import {
  getOrInitializeProduction,
  writeProductionEnvelope,
} from "@/lib/campaign-production/store";
import type { ProductionVersionReason } from "@/lib/campaign-production/types";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

type ProductionPatchBody = {
  action: "create_version";
  taskId: string;
  body: string;
  reason?: ProductionVersionReason;
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

  if (!canReadProductionWork(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const productionEnvelope = await getOrInitializeProduction(
    campaignId,
    campaignEnvelope.record,
  );

  return NextResponse.json({
    ...resolveProductionApiPayload(productionEnvelope),
    syncedAt: productionEnvelope.syncedAt,
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

  if (!canOperateProductionWork(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: ProductionPatchBody;
  try {
    body = (await request.json()) as ProductionPatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "create_version") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (!body.taskId || body.body === undefined) {
    return NextResponse.json({ error: "taskId and body are required" }, { status: 400 });
  }

  const [productionEnvelope, tasksEnvelope] = await Promise.all([
    getOrInitializeProduction(campaignId, campaignEnvelope.record),
    getOrGenerateTasks(campaignId, campaignEnvelope.record),
  ]);

  const task = tasksEnvelope.tasks.find((entry) => entry.id === body.taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  let result: ProductionActionResult;
  switch (body.action) {
    case "create_version":
      result = applyCreateVersion(
        productionEnvelope,
        task,
        { body: body.body, reason: body.reason },
        user,
      );
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const saved = await writeProductionEnvelope(result.envelope);

  return NextResponse.json({
    ...resolveProductionApiPayload(saved),
    createdVersion: result.version,
    workUnit: result.workUnit,
    syncedAt: saved.syncedAt,
  });
}
