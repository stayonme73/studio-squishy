import { NextResponse } from "next/server";

import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { canReadCampaign } from "@/lib/campaign-store/access";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { logAccessEvent } from "@/lib/security/access-log";
import { applyFlyerProductionIntakeCorrectionToRecord } from "@/lib/project-intake-flyer-production";

/**
 * Targeted flyer production Intake correction.
 * Writes only the missing flyer fields onto an already-submitted Intake.
 * Does not reopen Payment, Auth, Materials, or Board. Does not invent copy.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string }> },
) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId } = await context.params;
  const envelope = await readCampaignEnvelope(campaignId);
  if (!envelope) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canReadCampaign(user, campaignId, envelope)) {
    logAccessEvent({
      kind: "access_denied",
      route: "/api/campaigns/[campaignId]/flyer-intake-correction",
      user,
      campaignId,
      reason: "flyer_intake_correction_denied",
    });
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    answers?: RouteMapIntakeAnswers;
  };
  const updated = applyFlyerProductionIntakeCorrectionToRecord(
    envelope.record,
    body.answers ?? {},
  );
  if (!updated) {
    return NextResponse.json(
      { error: "Flyer production details are incomplete or not needed." },
      { status: 400 },
    );
  }

  const saved = await upsertCampaignRecord(updated, envelope.clientUserId);
  return NextResponse.json({
    campaignId: saved.campaignId,
    submittedAt: saved.record.routeMapIntakeSubmittedAt,
    syncedAt: saved.syncedAt,
  });
}
