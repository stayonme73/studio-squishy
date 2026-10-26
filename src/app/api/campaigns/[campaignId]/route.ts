import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { identitySessionFromRequest } from "@/lib/studio-customer-identity-safety-gate/session";
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

  const woken = await wakePaidCampaignEnvelope(
    access.campaignEnvelope,
    identitySessionFromRequest(request, access.user.id, campaignId),
  );
  return NextResponse.json({ campaign: woken });
}
