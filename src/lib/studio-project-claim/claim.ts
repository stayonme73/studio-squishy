/**
 * STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1
 *
 * Authoritative claim: verified client + (receipt OR local possession of unowned paid project).
 * Does not mutate payment / SKU / production / review / delivery truth.
 */

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

/**
 * Bind a paid (or claimable) campaign to a verified client.
 *
 * Paths:
 * - already owned by this user → idempotent link
 * - unowned + valid claim receipt → claim
 * - unowned + allowLocalPossession (same-browser soft path) → claim
 * - otherwise → claim_proof_required
 */
export async function claimCampaignForVerifiedClient(input: {
  user: StudioUser | null;
  campaignId: string;
  rawClaimToken?: string | null;
  /** Same-browser path: caller already holds the local campaign record. */
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
  if (!isEmailVerifiedForClaim(user)) {
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
    if (!consumed.ok) {
      return fail("receipt_invalid", consumed.message);
    }
    receiptUsed = true;
  } else if (input.allowLocalPossession) {
    // Same-browser possession of an unowned campaign — still requires verified email.
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
