import { NextResponse } from "next/server";

import { filterCampaignsForUser, isInternalUser } from "@/lib/campaign-store/access";
import { listCampaignEnvelopes } from "@/lib/campaign-store/store";
import { isNextResponse, requireStaffOrOwner } from "@/lib/auth/require-session";
import { readCampaignAssignments } from "@/lib/file-room/assignments";

export async function GET(request: Request) {
  const user = await requireStaffOrOwner(request);
  if (isNextResponse(user)) return user;
  if (!isInternalUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [campaigns, assignments] = await Promise.all([
    listCampaignEnvelopes(),
    readCampaignAssignments(),
  ]);

  const visible = filterCampaignsForUser(campaigns, user, assignments);

  return NextResponse.json({
    campaigns: visible.map(({ record, ...meta }) => ({
      ...meta,
      campaignName: record.campaignName,
      campaignStatus: record.campaignStatus,
    })),
  });
}
