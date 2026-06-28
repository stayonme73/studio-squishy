import { NextResponse } from "next/server";

import { canListAllCampaigns } from "@/lib/campaign-store/access";
import { listCampaignEnvelopes } from "@/lib/campaign-store/store";
import { isNextResponse, requireStaffOrOwner } from "@/lib/auth/require-session";

export async function GET(request: Request) {
  const user = await requireStaffOrOwner(request);
  if (isNextResponse(user)) return user;
  if (!canListAllCampaigns(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaigns = await listCampaignEnvelopes();
  return NextResponse.json({
    campaigns: campaigns.map(({ record, ...meta }) => ({
      ...meta,
      campaignName: record.campaignName,
      campaignStatus: record.campaignStatus,
    })),
  });
}
