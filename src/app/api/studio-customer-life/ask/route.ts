import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canReadCampaign } from "@/lib/campaign-store/access";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { askCustomerLifeFromStore } from "@/lib/studio-customer-life";

/**
 * Studio Voice asks the Machine record. Does not invent an answer.
 * Unsigned Conversation Room answers locally from the hydrated campaign.
 */
export async function POST(request: Request) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const body = (await request.json().catch(() => ({}))) as {
    campaignId?: string;
    question?: string;
  };
  const campaignId = body.campaignId?.trim() || user.currentCampaignId || null;
  if (campaignId) {
    const envelope = await readCampaignEnvelope(campaignId);
    if (envelope && !canReadCampaign(user, campaignId, envelope)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  const result = await askCustomerLifeFromStore({
    campaignId,
    question: body.question ?? "",
  });
  return NextResponse.json(result);
}
