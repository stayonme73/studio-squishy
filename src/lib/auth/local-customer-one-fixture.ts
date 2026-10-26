/**
 * Local/test Customer-One auth fixture.
 * Same philosophy as the Developer Sandbox payment path: a controlled
 * local doorway. Production authentication stays real.
 *
 * Gate is NODE_ENV development|test only. No public env flag. No query flag.
 */

import { randomBytes } from "crypto";

import type {
  StudioUser,
  StudioUserRecord,
} from "@/lib/campaign-store/types";
import { listCampaignEnvelopes } from "@/lib/campaign-store/store";
import { hashPassword } from "@/lib/auth/password-hash";
import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import {
  LOCAL_CUSTOMER_ONE_FIXTURE_ID,
  localCustomerOneAuthFixtureCopy,
} from "@/lib/auth/local-customer-one-fixture-copy";
import {
  insertStudioUserRecordIfMissing,
  linkClientCampaign,
  listStudioUsers,
  toPublicUser,
  updateUserCurrentCampaign,
} from "@/lib/auth/users";
import {
  isLocalCustomerOnePaidFlyerCampaign,
  pickLocalCustomerOnePaidFlyerCampaign,
  pickOwnedPaidNonMayaCampaign,
} from "@/lib/auth/local-customer-one-campaign";

export { LOCAL_CUSTOMER_ONE_FIXTURE_ID };
export const LOCAL_CUSTOMER_ONE_FIXTURE_EMAIL = "customer-one@local.dev";

export {
  isLocalAuthFixtureAvailable,
  localCustomerOneAuthFixtureCopy,
  isLocalCustomerOnePaidFlyerCampaign,
  pickLocalCustomerOnePaidFlyerCampaign,
  pickOwnedPaidNonMayaCampaign,
};

function isMayaClientCandidate(user: StudioUserRecord): boolean {
  if (String(user.displayName || "").trim() !== "Maya") return false;
  if (!user.roles.includes("client")) return false;
  if (user.roles.includes("owner") || user.roles.includes("staff")) return false;
  const accountClass = user.accountClass ?? "customer";
  return accountClass === "customer" || accountClass === "test";
}

/** Prefer the named fixture id, else the first existing Maya customer. */
export function pickLocalCustomerOneRecord(
  users: readonly StudioUserRecord[],
): StudioUserRecord | null {
  const fixture = users.find((user) => user.id === LOCAL_CUSTOMER_ONE_FIXTURE_ID);
  if (fixture) return fixture;
  return users.find(isMayaClientCandidate) ?? null;
}

async function attachExistingLocalCustomerOneProject(
  user: StudioUser,
): Promise<StudioUser> {
  const envelopes = await listCampaignEnvelopes();
  const selected = pickOwnedPaidNonMayaCampaign(envelopes, user.id);
  if (!selected) return user;

  let next = user;
  if (!next.clientCampaignIds?.includes(selected.campaignId)) {
    next = (await linkClientCampaign(user.id, selected.campaignId)) ?? next;
  }
  if (next.currentCampaignId !== selected.campaignId) {
    next = (await updateUserCurrentCampaign(next.id, selected.campaignId)) ?? next;
  }
  return next;
}

/**
 * Establish the local Customer-One user without a typed password.
 * Reuses an existing Maya customer when present. Creates at most one
 * fixture account when none exists. Returns null in production.
 */
export async function resolveLocalCustomerOneUser(): Promise<StudioUser | null> {
  if (!isLocalAuthFixtureAvailable()) return null;

  const users = await listStudioUsers();
  const existing = pickLocalCustomerOneRecord(users);
  const user = existing
    ? toPublicUser(existing)
    : await insertStudioUserRecordIfMissing({
        id: LOCAL_CUSTOMER_ONE_FIXTURE_ID,
        email: LOCAL_CUSTOMER_ONE_FIXTURE_EMAIL,
        displayName: "Maya",
        roles: ["client"],
        accountClass: "test",
        clientCampaignIds: [],
        passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        emailVerifiedAt: null,
      });

  return attachExistingLocalCustomerOneProject(user);
}
