/**
 * Local/test doorway for the fictional Harbor & Oak recovery project.
 * Development and test only. Does not touch Customer-One.
 */

import { randomBytes } from "crypto";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import {
  LOCAL_CEDAR_LANE_REVIEW_USER_ID,
} from "@/lib/auth/local-cedar-lane-review-copy";
import { hashPassword } from "@/lib/auth/password-hash";
import {
  insertStudioUserRecordIfMissing,
  linkClientCampaign,
  listStudioUsers,
  toPublicUser,
  updateUserCurrentCampaign,
} from "@/lib/auth/users";
import {
  readCampaignEnvelope,
  writeCampaignEnvelope,
} from "@/lib/campaign-store/store";
import type { StudioUser } from "@/lib/campaign-store/types";

export const CEDAR_LANE_REVIEW_CAMPAIGN_ID = "messy-customer-social-promo-recovery";
export const CEDAR_LANE_REVIEW_EMAIL = "cedar-lane@local.dev";

const UNCLAIMED_OWNER = `unclaimed-client:${CEDAR_LANE_REVIEW_CAMPAIGN_ID}`;

export async function resolveLocalCedarLaneReviewUser(): Promise<StudioUser | null> {
  if (!isLocalAuthFixtureAvailable()) return null;

  const envelope = await readCampaignEnvelope(CEDAR_LANE_REVIEW_CAMPAIGN_ID);
  if (!envelope) return null;

  const users = await listStudioUsers();
  const existing = users.find((user) => user.id === LOCAL_CEDAR_LANE_REVIEW_USER_ID);
  const user = existing
    ? toPublicUser(existing)
    : await insertStudioUserRecordIfMissing({
        id: LOCAL_CEDAR_LANE_REVIEW_USER_ID,
        email: CEDAR_LANE_REVIEW_EMAIL,
        displayName: "Cedar Lane",
        roles: ["client"],
        accountClass: "test",
        clientCampaignIds: [CEDAR_LANE_REVIEW_CAMPAIGN_ID],
        currentCampaignId: CEDAR_LANE_REVIEW_CAMPAIGN_ID,
        passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        emailVerifiedAt: new Date().toISOString(),
      });

  const owner = envelope.clientUserId?.trim() || "";
  if (owner && owner !== UNCLAIMED_OWNER && owner !== user.id) {
    return null;
  }
  if (owner !== user.id) {
    await writeCampaignEnvelope({
      ...envelope,
      clientUserId: user.id,
      syncedAt: new Date().toISOString(),
      syncVersion: (envelope.syncVersion ?? 0) + 1,
    });
  }

  let next = user;
  if (!next.clientCampaignIds?.includes(CEDAR_LANE_REVIEW_CAMPAIGN_ID)) {
    next = (await linkClientCampaign(next.id, CEDAR_LANE_REVIEW_CAMPAIGN_ID)) ?? next;
  }
  if (next.currentCampaignId !== CEDAR_LANE_REVIEW_CAMPAIGN_ID) {
    next = (await updateUserCurrentCampaign(next.id, CEDAR_LANE_REVIEW_CAMPAIGN_ID)) ?? next;
  }
  return next;
}
