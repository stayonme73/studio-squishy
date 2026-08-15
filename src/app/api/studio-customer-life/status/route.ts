import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canReadCampaign } from "@/lib/campaign-store/access";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readCustomerLifeStatus } from "@/lib/studio-customer-life";

/**
 * Shared Machine status for Board / Voice. Does not invent facts.
 */
export async function GET(request: Request) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const url = new URL(request.url);
  const campaignId =
    url.searchParams.get("campaignId")?.trim() || user.currentCampaignId || null;
  if (campaignId) {
    const envelope = await readCampaignEnvelope(campaignId);
    if (envelope && !canReadCampaign(user, campaignId, envelope)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  const status = await readCustomerLifeStatus(campaignId);
  return NextResponse.json({
    campaignId: status.truth.campaignId,
    truth: status.truth,
    studioRequests: status.studioRequests,
    summary: status.summary,
    source: "machine_record",
    ownerActionRequired: false,
  });
}
