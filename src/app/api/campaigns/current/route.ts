import { NextResponse } from "next/server";

import { canReadCampaign, canSyncCurrentCampaign } from "@/lib/campaign-store/access";
import { FixtureCampaignBlockedError } from "@/lib/campaign-store/fixture-guard";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { updateUserCurrentCampaign } from "@/lib/auth/users";
import type { CampaignRecord } from "@/config/studio-board";

export async function GET(request: Request) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  if (!user.currentCampaignId) {
    return NextResponse.json({ campaign: null });
  }

  const envelope = await readCampaignEnvelope(user.currentCampaignId);
  if (!envelope) {
    return NextResponse.json({ campaign: null });
  }

  if (!canReadCampaign(user, envelope.campaignId, envelope)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ campaign: envelope });
}

export async function PATCH(request: Request) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  if (!canSyncCurrentCampaign(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { record?: CampaignRecord };
  const record = body.record;
  if (!record?.campaignId) {
    return NextResponse.json({ error: "record with campaignId is required" }, { status: 400 });
  }

  try {
    const envelope = await upsertCampaignRecord(record, user.id);

    if (user.currentCampaignId !== record.campaignId) {
      await updateUserCurrentCampaign(user.id, record.campaignId);
    }

    return NextResponse.json({
      campaignId: envelope.campaignId,
      syncedAt: envelope.syncedAt,
      syncVersion: envelope.syncVersion,
    });
  } catch (error) {
    if (error instanceof FixtureCampaignBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("[campaign-sync] server PATCH failed", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
