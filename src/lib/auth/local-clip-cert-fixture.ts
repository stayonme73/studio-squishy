/**
 * Local/test Clip customer-cert auth fixture.
 * Development and test only. Does not publish.
 */

import { randomBytes } from "crypto";

import {
  CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID,
  CLIP_FULL_CUSTOMER_CERT_EMAIL,
  CLIP_FULL_CUSTOMER_CERT_USER_ID,
  studioClipRepurposingFullCustomerCertificationV1 as cert,
} from "@/config/studio-clip-repurposing-full-customer-certification-v1";
import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { hashPassword } from "@/lib/auth/password-hash";
import {
  insertStudioUserRecordIfMissing,
  linkClientCampaign,
  listStudioUsers,
  toPublicUser,
  updateUserCurrentCampaign,
} from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";

export async function resolveLocalClipCertUser(): Promise<StudioUser | null> {
  if (!isLocalAuthFixtureAvailable()) return null;

  const users = await listStudioUsers();
  const existing = users.find((user) => user.id === CLIP_FULL_CUSTOMER_CERT_USER_ID);
  const user = existing
    ? toPublicUser(existing)
    : await insertStudioUserRecordIfMissing({
        id: CLIP_FULL_CUSTOMER_CERT_USER_ID,
        email: CLIP_FULL_CUSTOMER_CERT_EMAIL,
        displayName: cert.customerDisplayName,
        roles: ["client"],
        accountClass: "test",
        clientCampaignIds: [CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID],
        currentCampaignId: CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID,
        passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
        emailVerifiedAt: new Date().toISOString(),
      });

  let next = user;
  if (!next.clientCampaignIds?.includes(CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID)) {
    next = (await linkClientCampaign(next.id, CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID)) ?? next;
  }
  if (next.currentCampaignId !== CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID) {
    next = (await updateUserCurrentCampaign(next.id, CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID)) ?? next;
  }
  return next;
}
