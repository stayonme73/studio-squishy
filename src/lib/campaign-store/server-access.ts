import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { logAccessEvent } from "@/lib/security/access-log";

import { canClaimClientCampaign, canReadCampaign } from "./access";
import { readCampaignEnvelope } from "./store";
import type { ServerCampaignEnvelope, StudioUser } from "./types";

export type AuthorizedCampaignAccess = {
  user: StudioUser;
  campaignEnvelope: ServerCampaignEnvelope;
  assignments: CampaignAssignmentsFile;
};

export function accessDeniedResponse() {
  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}

export function notFoundResponse() {
  return NextResponse.json({ error: "Resource not available" }, { status: 404 });
}

export async function requireReadableCampaign(
  request: Request,
  campaignId: string,
  route: string,
  jobId?: string,
): Promise<AuthorizedCampaignAccess | NextResponse> {
  const user = await requireSession(request);
  if (isNextResponse(user)) {
    logAccessEvent({ kind: "auth_required", route, campaignId, jobId });
    return user;
  }

  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return notFoundResponse();
  }

  if (!canReadCampaign(user, campaignId, campaignEnvelope, assignments)) {
    logAccessEvent({
      kind: "access_denied",
      route,
      user,
      campaignId,
      jobId,
      reason: "campaign_read_denied",
    });
    return accessDeniedResponse();
  }

  return { user, campaignEnvelope, assignments };
}

export async function requireClaimableCampaignSync(
  user: StudioUser,
  campaignId: string,
  route: string,
): Promise<ServerCampaignEnvelope | NextResponse | null> {
  const existing = await readCampaignEnvelope(campaignId);
  if (!canClaimClientCampaign(user, campaignId, existing)) {
    logAccessEvent({
      kind: "campaign_claim_denied",
      route,
      user,
      campaignId,
      reason: "campaign_owned_by_another_client",
    });
    return accessDeniedResponse();
  }
  return existing;
}
