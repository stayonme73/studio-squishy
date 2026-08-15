import { NextResponse } from "next/server";

import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { findUserById, toPublicUser } from "@/lib/auth/users";
import { claimCampaignForVerifiedClient } from "@/lib/studio-project-claim/claim";
import { logAccessEvent } from "@/lib/security/access-log";

export async function POST(request: Request) {
  const sessionUser = await requireSession(request);
  if (isNextResponse(sessionUser)) return sessionUser;

  let body: {
    campaignId?: string;
    claimToken?: string;
    allowLocalPossession?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const campaignId = body.campaignId?.trim();
  if (!campaignId) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_request",
        message: "campaignId is required",
      },
      { status: 400 },
    );
  }

  // Refresh user from store so emailVerifiedAt is current.
  const record = await findUserById(sessionUser.id);
  const user = record ? toPublicUser(record) : sessionUser;

  const result = await claimCampaignForVerifiedClient({
    user,
    campaignId,
    rawClaimToken: body.claimToken ?? null,
    allowLocalPossession: body.allowLocalPossession === true,
  });

  if (!result.ok) {
    logAccessEvent({
      kind: "campaign_claim_denied",
      route: "/api/campaigns/claim",
      user,
      campaignId,
      reason: result.code,
    });
    const status =
      result.code === "auth_required"
        ? 401
        : result.code === "not_found"
          ? 404
          : 403;
    return NextResponse.json(
      {
        ok: false,
        error: result.code,
        message: result.message,
        packageId: result.packageId,
        ownerRoutine: result.ownerRoutine,
      },
      { status },
    );
  }

  const refreshed = await findUserById(user.id);
  const response = NextResponse.json({
    ok: true,
    campaignId: result.campaignId,
    clientUserId: result.clientUserId,
    alreadyOwned: result.alreadyOwned,
    receiptUsed: result.receiptUsed,
    packageId: result.packageId,
    ownerRoutine: result.ownerRoutine,
  });
  if (refreshed) {
    response.cookies.set(
      SESSION_COOKIE_NAME,
      await createSessionToken(toPublicUser(refreshed)),
      sessionCookieOptions(),
    );
  }
  return response;
}
