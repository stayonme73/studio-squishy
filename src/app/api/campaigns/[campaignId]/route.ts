import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}`,
  );
  if (access instanceof NextResponse) return access;

  return NextResponse.json({ campaign: access.campaignEnvelope });
}
