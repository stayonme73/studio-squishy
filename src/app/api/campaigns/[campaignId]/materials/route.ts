import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import {
  canReadMaterials,
  canReviewMaterials,
  canSubmitMaterials,
  isMaterialsTeamAudience,
} from "@/lib/materials/access";
import {
  applyClientSubmitConsolidated,
  applyClientSubmitItem,
  applyTeamReview,
} from "@/lib/materials/actions";
import { applyExceptionStatusOnClientMaterialSubmit } from "@/lib/materials/promotion";
import { resolveUnderlyingItemIdsForConsolidated } from "@/lib/materials/client-requests";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ClientSubmitPayload } from "@/lib/materials/payload-validation";
import { syncMaterialsSummaryOnCampaign } from "@/lib/materials/campaign-summary";
import { resolveMaterialsApiPayload } from "@/lib/materials/materials-view";
import { getOrInitializeMaterials, writeMaterialsEnvelope } from "@/lib/materials/store";
import type { MaterialReviewStatus } from "@/lib/materials/types";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

type MaterialsPatchBody =
  | {
      action: "client_submit_consolidated";
      consolidatedItemId: string;
      payload: ClientSubmitPayload;
    }
  | {
      action: "client_submit";
      itemId: string;
      payload: ClientSubmitPayload;
    }
  | {
      action: "team_review";
      itemId: string;
      reviewStatus: MaterialReviewStatus;
      teamNote?: string;
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

  if (!canReadMaterials(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const materialsEnvelope = await getOrInitializeMaterials(campaignId, campaignEnvelope.record);
  const audience = isMaterialsTeamAudience(user, campaignId, campaignEnvelope, assignments)
    ? "team"
    : "client";
  const payload = resolveMaterialsApiPayload(materialsEnvelope, audience, campaignEnvelope.record);

  return NextResponse.json({
    ...payload,
    syncedAt: materialsEnvelope.syncedAt,
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

  if (!canReadMaterials(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: MaterialsPatchBody;
  try {
    body = (await request.json()) as MaterialsPatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const materialsEnvelope = await getOrInitializeMaterials(campaignId, campaignEnvelope.record);
  let result:
    | ReturnType<typeof applyClientSubmitConsolidated>
    | ReturnType<typeof applyClientSubmitItem>
    | ReturnType<typeof applyTeamReview>;
  let submittedItemIds: string[] = [];

  switch (body.action) {
    case "client_submit_consolidated": {
      if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.consolidatedItemId || !body.payload) {
        return NextResponse.json({ error: "consolidatedItemId and payload are required" }, { status: 400 });
      }
      submittedItemIds = [
        ...resolveUnderlyingItemIdsForConsolidated(materialsEnvelope, body.consolidatedItemId),
      ];
      result = applyClientSubmitConsolidated(
        materialsEnvelope,
        body.consolidatedItemId,
        body.payload,
        user,
      );
      break;
    }
    case "client_submit": {
      if (!canSubmitMaterials(user, campaignId, campaignEnvelope)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.itemId || !body.payload) {
        return NextResponse.json({ error: "itemId and payload are required" }, { status: 400 });
      }
      result = applyClientSubmitItem(materialsEnvelope, body.itemId, body.payload, user);
      if (result.ok) submittedItemIds = [body.itemId];
      break;
    }
    case "team_review": {
      if (!canReviewMaterials(user, campaignId, campaignEnvelope, assignments)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.itemId || !body.reviewStatus) {
        return NextResponse.json({ error: "itemId and reviewStatus are required" }, { status: 400 });
      }
      result = applyTeamReview(
        materialsEnvelope,
        body.itemId,
        body.reviewStatus,
        body.teamNote,
        user,
      );
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const saved = await writeMaterialsEnvelope(result.envelope);

  if (submittedItemIds.length > 0) {
    const tasksEnvelope = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
    const updatedTasks = applyExceptionStatusOnClientMaterialSubmit(tasksEnvelope, submittedItemIds);
    if (updatedTasks !== tasksEnvelope) {
      await writeTasksEnvelope(updatedTasks);
    }
  }

  const audience = isMaterialsTeamAudience(user, campaignId, campaignEnvelope, assignments)
    ? "team"
    : "client";
  const payload = resolveMaterialsApiPayload(saved, audience, campaignEnvelope.record);
  await syncMaterialsSummaryOnCampaign(campaignId, payload.blockingRequiredCount);

  return NextResponse.json({
    ...payload,
    syncedAt: saved.syncedAt,
  });
}
