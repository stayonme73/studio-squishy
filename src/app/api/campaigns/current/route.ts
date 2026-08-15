import { NextResponse } from "next/server";

import {
  canReadCampaign,
  canSyncCurrentCampaign,
  isClientUser,
  isInternalUser,
} from "@/lib/campaign-store/access";
import { FixtureCampaignBlockedError } from "@/lib/campaign-store/fixture-guard";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { requireClaimableCampaignSync } from "@/lib/campaign-store/server-access";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { linkClientCampaign, updateUserCurrentCampaign } from "@/lib/auth/users";
import type { CampaignRecord } from "@/config/studio-board";
import { logAccessEvent } from "@/lib/security/access-log";
import { ensureDispatchExecution } from "@/lib/studio-dispatch";

export async function GET(request: Request) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  if (!user.currentCampaignId) {
    return NextResponse.json({ campaign: null });
  }

  const envelope = await readCampaignEnvelope(user.currentCampaignId);
  if (!envelope) {
    return NextResponse.json({ campaign: null });
  }

  if (!canReadCampaign(user, envelope.campaignId, envelope)) {
    logAccessEvent({
      kind: "access_denied",
      route: "/api/campaigns/current",
      user,
      campaignId: envelope.campaignId,
      reason: "current_campaign_read_denied",
    });
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ campaign: envelope });
}

export async function PATCH(request: Request) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  if (!canSyncCurrentCampaign(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { record?: CampaignRecord };
  const record = body.record;
  if (!record?.campaignId) {
    return NextResponse.json({ error: "record with campaignId is required" }, { status: 400 });
  }

  try {
    if (!isInternalUser(user)) {
      const claim = await requireClaimableCampaignSync(
        user,
        record.campaignId,
        "/api/campaigns/current",
      );
      if (claim instanceof NextResponse) return claim;

      // Paid unowned projects require verified email (Project Claim gate).
      const existingForPaidGate = await readCampaignEnvelope(record.campaignId);
      const paid = Boolean(
        existingForPaidGate?.record.paymentReceivedAt ||
          existingForPaidGate?.record.paymentTruth?.status === "confirmed" ||
          record.paymentReceivedAt ||
          record.paymentTruth?.status === "confirmed",
      );
      if (
        isClientUser(user) &&
        paid &&
        !existingForPaidGate?.clientUserId &&
        !user.emailVerifiedAt
      ) {
        logAccessEvent({
          kind: "campaign_claim_denied",
          route: "/api/campaigns/current",
          user,
          campaignId: record.campaignId,
          reason: "email_unverified",
        });
        return NextResponse.json(
          {
            error: "Verify your email before claiming a paid Studio project.",
            code: "email_unverified",
          },
          { status: 403 },
        );
      }
    }

    const existingEnvelope = await readCampaignEnvelope(record.campaignId);
    const recordToUpsert = isClientUser(user)
      ? mergeCustomerOwnedCampaignSync(existingEnvelope?.record ?? null, record)
      : record;

    const envelope = await upsertCampaignRecord(
      recordToUpsert,
      user.roles.includes("client") ? user.id : undefined,
    );

    // Server-driven dispatch wake (refreshes routing/activation) on paid sync.
    if (envelope.record.paymentTruth?.status === "confirmed") {
      await ensureDispatchExecution(envelope.record);
    }

    let updatedUser = user;

    if (user.currentCampaignId !== record.campaignId) {
      updatedUser =
        (user.roles.includes("client")
          ? await linkClientCampaign(user.id, record.campaignId)
          : await updateUserCurrentCampaign(user.id, record.campaignId)) ?? user;
    } else if (
      user.roles.includes("client") &&
      !user.clientCampaignIds?.includes(record.campaignId)
    ) {
      updatedUser = (await linkClientCampaign(user.id, record.campaignId)) ?? user;
    }

    const response = NextResponse.json({
      campaignId: envelope.campaignId,
      syncedAt: envelope.syncedAt,
      syncVersion: envelope.syncVersion,
    });
    if (updatedUser !== user) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        await createSessionToken(updatedUser),
        sessionCookieOptions(),
      );
    }
    return response;
  } catch (error) {
    if (error instanceof FixtureCampaignBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error("[campaign-sync] server PATCH failed", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
