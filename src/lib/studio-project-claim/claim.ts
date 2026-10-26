/**
 * STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1
 *
 * Authoritative claim: signed-in client + (receipt OR same-browser possession
 * of the session's current unowned paid project). A client-supplied possession
 * flag is not proof. Inbox email verification is not a substitute, and must
 * not block same-device claim while live Resend is parked.
 * Does not mutate payment / SKU / production / review / delivery truth.
 */

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { linkClientCampaign } from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import {
  canClaimClientCampaign,
  isBrowsableCampaignId,
  isClientUser,
} from "@/lib/campaign-store/access";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";

import {
  PROJECT_CLAIM_PACKAGE_ID,
  consumeProjectClaimReceipt,
} from "./claim-receipts";

export { PROJECT_CLAIM_PACKAGE_ID };

export type ProjectClaimFailureCode =
  | "auth_required"
  | "not_client"
  | "email_unverified"
  | "invalid_campaign"
  | "claim_proof_required"
  | "wrong_owner"
  | "not_found"
  | "receipt_invalid"
  | "not_paid"
  | "internal_error";

export type ProjectClaimResult =
  | {
      ok: true;
      packageId: typeof PROJECT_CLAIM_PACKAGE_ID;
      campaignId: string;
      clientUserId: string;
      alreadyOwned: boolean;
      receiptUsed: boolean;
      ownerRoutine: "NONE";
    }
  | {
      ok: false;
      packageId: typeof PROJECT_CLAIM_PACKAGE_ID;
      code: ProjectClaimFailureCode;
      message: string;
      ownerRoutine: "NONE";
    };

function fail(
  code: ProjectClaimFailureCode,
  message: string,
): Extract<ProjectClaimResult, { ok: false }> {
  return {
    ok: false,
    packageId: PROJECT_CLAIM_PACKAGE_ID,
    code,
    message,
    ownerRoutine: "NONE",
  };
}

export function isEmailVerifiedForClaim(user: StudioUser): boolean {
  return Boolean(user.emailVerifiedAt);
}

/** Same-browser possession is the session's current campaign — not a client flag. */
export function hasSameBrowserPossession(
  user: StudioUser,
  campaignId: string,
): boolean {
  const current = user.currentCampaignId?.trim();
  return Boolean(current && current === campaignId);
}

function hasClaimProof(input: {
  user: StudioUser;
  campaignId: string;
  rawClaimToken?: string | null;
  allowLocalPossession?: boolean;
}): boolean {
  if (input.rawClaimToken?.trim()) return true;
  return (
    input.allowLocalPossession === true &&
    hasSameBrowserPossession(input.user, input.campaignId)
  );
}

/**
 * Bind a paid (or claimable) campaign to a signed-in client.
 *
 * Ownership proof is the claim receipt and/or same-browser possession of the
 * unowned paid project. That is a real Project Claim — not a fake clientUserId
 * stamp. Live verification email is parked; inbox verify must not block the
 * paying customer on the same Samsung from becoming the account owner.
 *
 * Paths:
 * - already owned by this user → idempotent link
 * - unowned + valid claim receipt → claim
 * - unowned + session currentCampaignId matches (same-browser) → claim
 * - otherwise → claim_proof_required
 * - no proof and unverified email → email_unverified
 */
export async function claimCampaignForVerifiedClient(input: {
  user: StudioUser | null;
  campaignId: string;
  rawClaimToken?: string | null;
  /** Same-browser path: honored only when user.currentCampaignId matches. */
  allowLocalPossession?: boolean;
  /** When true, unpaid drafts may be claimed (pre-pay continuity). Default: require paid. */
  allowUnpaidDraft?: boolean;
}): Promise<ProjectClaimResult> {
  const user = input.user;
  if (!user) {
    return fail("auth_required", "Sign in is required to claim a project.");
  }
  if (!isClientUser(user)) {
    return fail("not_client", "Only customer accounts can claim projects.");
  }
  if (input.campaignId === MAYA_PROTECTED_CAMPAIGN_ID) {
    return fail("invalid_campaign", "This project cannot be claimed.");
  }
  if (
    !isEmailVerifiedForClaim(user) &&
    !hasClaimProof({
      user,
      campaignId: input.campaignId,
      rawClaimToken: input.rawClaimToken,
      allowLocalPossession: input.allowLocalPossession,
    })
  ) {
    return fail(
      "email_unverified",
      "Verify your email before claiming a Studio project.",
    );
  }
  if (!isBrowsableCampaignId(input.campaignId)) {
    return fail("invalid_campaign", "This project cannot be claimed.");
  }

  const envelope = await readCampaignEnvelope(input.campaignId);
  if (!envelope) {
    return fail("not_found", "Project not found.");
  }

  // Idempotent: already owned by this user.
  if (envelope.clientUserId === user.id) {
    await linkClientCampaign(user.id, input.campaignId);
    return {
      ok: true,
      packageId: PROJECT_CLAIM_PACKAGE_ID,
      campaignId: input.campaignId,
      clientUserId: user.id,
      alreadyOwned: true,
      receiptUsed: false,
      ownerRoutine: "NONE",
    };
  }

  if (envelope.clientUserId && envelope.clientUserId !== user.id) {
    return fail(
      "wrong_owner",
      "This project already belongs to another customer account.",
    );
  }

  if (!canClaimClientCampaign(user, input.campaignId, envelope)) {
    return fail("wrong_owner", "You cannot claim this project.");
  }

  const paid = Boolean(
    envelope.record.paymentReceivedAt ||
      envelope.record.paymentTruth?.status === "confirmed",
  );
  if (!paid && !input.allowUnpaidDraft) {
    return fail(
      "not_paid",
      "Only paid projects can be claimed with a recovery receipt.",
    );
  }

  let receiptUsed = false;
  const raw = input.rawClaimToken?.trim() ?? "";

  if (raw) {
    const consumed = await consumeProjectClaimReceipt({
      rawToken: raw,
      userId: user.id,
      expectedCampaignId: input.campaignId,
    });
    if (consumed.ok) {
      receiptUsed = true;
    } else if (!hasSameBrowserPossession(user, input.campaignId)) {
      return fail("receipt_invalid", consumed.message);
    }
    // Stale/superseded receipt on the paying device still yields to
    // same-browser possession of this unowned paid campaign.
  } else if (
    input.allowLocalPossession &&
    hasSameBrowserPossession(user, input.campaignId)
  ) {
    receiptUsed = false;
  } else {
    return fail(
      "claim_proof_required",
      "A project claim receipt is required to recover this project on a new device.",
    );
  }

  // Bind ownership — first write wins at store layer.
  const saved = await upsertCampaignRecord(envelope.record, user.id);
  if (saved.clientUserId && saved.clientUserId !== user.id) {
    // Race: another claimer won.
    return fail(
      "wrong_owner",
      "This project was claimed by another account. Contact the Studio if this is your payment.",
    );
  }

  await linkClientCampaign(user.id, input.campaignId);

  return {
    ok: true,
    packageId: PROJECT_CLAIM_PACKAGE_ID,
    campaignId: input.campaignId,
    clientUserId: user.id,
    alreadyOwned: false,
    receiptUsed,
    ownerRoutine: "NONE",
  };
}
