import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { wakePaidCampaignEnvelope } from "@/lib/studio-paid-activation-recovery";

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

  const woken = await wakePaidCampaignEnvelope(access.campaignEnvelope);
  return NextResponse.json({ campaign: woken });
}
