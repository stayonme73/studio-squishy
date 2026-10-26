import { NextResponse } from "next/server";

import {
  canReadCampaign,
  canSyncCurrentCampaign,
  isClientUser,
  isInternalUser,
} from "@/lib/campaign-store/access";
import { FixtureCampaignBlockedError } from "@/lib/campaign-store/fixture-guard";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import { applyServerCampaignIsolationWritePolicy } from "@/lib/studio-payment/server-campaign-isolation-write-policy";
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
import { resolveCustomerCurrentCampaign } from "@/lib/campaign-store/customer-current-campaign";
import { identitySessionFromRequest } from "@/lib/studio-customer-identity-safety-gate/session";
import {
  recoverPaidOperatingChain,
  wakePaidCampaignEnvelope,
} from "@/lib/studio-paid-activation-recovery";
import { claimCampaignForVerifiedClient } from "@/lib/studio-project-claim/claim";

export async function GET(request: Request) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const resolved = await resolveCustomerCurrentCampaign(user);
  const envelope = resolved.envelope;
  if (!envelope) {
    return NextResponse.json({ campaign: null });
  }

  if (!canReadCampaign(resolved.user, envelope.campaignId, envelope)) {
    logAccessEvent({
      kind: "access_denied",
      route: "/api/campaigns/current",
      user: resolved.user,
      campaignId: envelope.campaignId,
      reason: "current_campaign_read_denied",
    });
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const woken = await wakePaidCampaignEnvelope(
    envelope,
    identitySessionFromRequest(
      request,
      resolved.user.id,
      envelope.campaignId,
    ),
  );
  const response = NextResponse.json({ campaign: woken });
  response.headers.set("Cache-Control", "no-store");
  const currentChanged = resolved.user.currentCampaignId !== user.currentCampaignId;
  const idsChanged =
    JSON.stringify(resolved.user.clientCampaignIds ?? []) !==
    JSON.stringify(user.clientCampaignIds ?? []);
  if (currentChanged || idsChanged) {
    response.cookies.set(
      SESSION_COOKIE_NAME,
      await createSessionToken(resolved.user),
      sessionCookieOptions(),
    );
  }
  return response;
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

      // Paid unowned projects bind through Project Claim (receipt or same-browser
      // possession). Do not silently stamp clientUserId, and do not wait on
      // parked inbox verification when the paying device holds the project.
      const existingForPaidGate = await readCampaignEnvelope(record.campaignId);
      const paid = Boolean(
        existingForPaidGate?.record.paymentReceivedAt ||
          existingForPaidGate?.record.paymentTruth?.status === "confirmed" ||
          record.paymentReceivedAt ||
          record.paymentTruth?.status === "confirmed",
      );
      if (isClientUser(user) && paid && !existingForPaidGate?.clientUserId) {
        const claimed = await claimCampaignForVerifiedClient({
          user,
          campaignId: record.campaignId,
          allowLocalPossession: user.currentCampaignId === record.campaignId,
        });
        if (!claimed.ok) {
          logAccessEvent({
            kind: "campaign_claim_denied",
            route: "/api/campaigns/current",
            user,
            campaignId: record.campaignId,
            reason: claimed.code,
          });
          return NextResponse.json(
            {
              error: claimed.message,
              code: claimed.code,
            },
            { status: 403 },
          );
        }
      }
    }

    const existingEnvelope = await readCampaignEnvelope(record.campaignId);
    const recordToUpsert = isClientUser(user)
      ? mergeCustomerOwnedCampaignSync(existingEnvelope?.record ?? null, record)
      : applyServerCampaignIsolationWritePolicy(
          existingEnvelope?.record ?? null,
          record,
        );

    const envelope = await upsertCampaignRecord(
      recordToUpsert,
      user.roles.includes("client") ? user.id : undefined,
    );

    if (envelope.record.paymentTruth?.status === "confirmed") {
      await recoverPaidOperatingChain(envelope.record, {
        identitySession: identitySessionFromRequest(
          request,
          user.id,
          record.campaignId,
        ),
      });
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
