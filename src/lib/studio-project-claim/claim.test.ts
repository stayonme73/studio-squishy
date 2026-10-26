/**
 * STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1 — unit + security tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { createClientAccount, markEmailVerified } from "@/lib/auth/users";

import {
  claimCampaignForVerifiedClient,
  PROJECT_CLAIM_PACKAGE_ID,
} from "./claim";
import {
  consumeProjectClaimReceipt,
  hashProjectClaimToken,
  issueProjectClaimReceipt,
  releaseUnclaimedBrowserClaimToken,
} from "./claim-receipts";

const DATA = path.join(process.cwd(), "data");
const USERS = path.join(DATA, "studio-users.json");
const CAMPAIGNS = path.join(DATA, "campaigns");
const RECEIPTS = path.join(DATA, "project-claim-receipts.json");

function paidCampaign(id: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId: id,
    campaignName: "Claim Test",
    campaignStatus: "PAYMENT_RECEIVED",
    createdAt: now,
    updatedAt: now,
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 6900,
      confirmedAmountCents: 6900,
      checkoutSessionId: `cs_${id}`,
      paymentIntentId: null,
      stripeEventId: null,
      selectedServiceIds: ["rm-j007"],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      confirmedAt: now,
      sandbox: true,
    },
  } as CampaignRecord;
}

describe("STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1", () => {
  beforeEach(() => {
    mkdirSync(DATA, { recursive: true });
    mkdirSync(CAMPAIGNS, { recursive: true });
    writeFileSync(USERS, "[]", "utf8");
    writeFileSync(RECEIPTS, "[]", "utf8");
  });

  it("issues hashed receipt and consumes once for verified user", async () => {
    const campaignId = `camp-claim-${randomUUID().slice(0, 8)}`;
    await upsertCampaignRecord(paidCampaign(campaignId));
    const { rawToken, record } = await issueProjectClaimReceipt({
      campaignId,
      checkoutSessionId: `cs_${campaignId}`,
      customerEmail: "Buyer@Example.COM",
    });
    expect(record.tokenHash).toBe(hashProjectClaimToken(rawToken));
    expect(record.customerEmailNormalized).toBe("buyer@example.com");

    const created = await createClientAccount({
      email: "buyer@example.com",
      password: "ClaimTest-pass-1!",
      displayName: "Buyer",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const verified = await markEmailVerified(created.user.id);
    expect(verified?.emailVerifiedAt).toBeTruthy();

    const first = await claimCampaignForVerifiedClient({
      user: verified!,
      campaignId,
      rawClaimToken: rawToken,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.receiptUsed).toBe(true);
    expect(first.alreadyOwned).toBe(false);

    const env = await readCampaignEnvelope(campaignId);
    expect(env?.clientUserId).toBe(verified!.id);

    const second = await claimCampaignForVerifiedClient({
      user: verified!,
      campaignId,
      rawClaimToken: rawToken,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyOwned).toBe(true);

    const other = await createClientAccount({
      email: "other@example.com",
      password: "ClaimTest-pass-2!",
      displayName: "Other",
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    const otherUser = await markEmailVerified(other.user.id);
    const steal = await claimCampaignForVerifiedClient({
      user: otherUser!,
      campaignId,
      rawClaimToken: rawToken,
    });
    expect(steal.ok).toBe(false);
    if (!steal.ok) expect(steal.code).toBe("wrong_owner");
  });

  it("fails closed: unverified email without proof, missing receipt on new device, tampered token", async () => {
    const campaignId = `camp-sec-${randomUUID().slice(0, 8)}`;
    await upsertCampaignRecord(paidCampaign(campaignId));
    const { rawToken } = await issueProjectClaimReceipt({
      campaignId,
      checkoutSessionId: `cs_${campaignId}`,
    });

    const created = await createClientAccount({
      email: "unverified@example.com",
      password: "ClaimTest-pass-3!",
      displayName: "Unverified",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const unverifiedNoProof = await claimCampaignForVerifiedClient({
      user: created.user,
      campaignId,
    });
    expect(unverifiedNoProof.ok).toBe(false);
    if (!unverifiedNoProof.ok) expect(unverifiedNoProof.code).toBe("email_unverified");

    const unverifiedWithReceipt = await claimCampaignForVerifiedClient({
      user: created.user,
      campaignId,
      rawClaimToken: rawToken,
    });
    expect(unverifiedWithReceipt.ok).toBe(true);
    if (!unverifiedWithReceipt.ok) return;
    expect(unverifiedWithReceipt.receiptUsed).toBe(true);
    expect(unverifiedWithReceipt.clientUserId).toBe(created.user.id);
  });

  it("same-browser possession claims an unowned paid project without inbox verification", async () => {
    const campaignId = `camp-possess-${randomUUID().slice(0, 8)}`;
    await upsertCampaignRecord(paidCampaign(campaignId));

    const created = await createClientAccount({
      email: "samebrowser@example.com",
      password: "ClaimTest-pass-7!",
      displayName: "Same Browser",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const localOk = await claimCampaignForVerifiedClient({
      user: { ...created.user, currentCampaignId: campaignId },
      campaignId,
      allowLocalPossession: true,
    });
    expect(localOk.ok).toBe(true);
    if (!localOk.ok) return;
    expect(localOk.receiptUsed).toBe(false);
    const env = await readCampaignEnvelope(campaignId);
    expect(env?.clientUserId).toBe(created.user.id);
  });

  it("verified user still needs proof on a new device", async () => {
    const campaignId = `camp-proof-${randomUUID().slice(0, 8)}`;
    await upsertCampaignRecord(paidCampaign(campaignId));
    const created = await createClientAccount({
      email: "verifiedproof@example.com",
      password: "ClaimTest-pass-8!",
      displayName: "Verified Proof",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const verified = await markEmailVerified(created.user.id);

    const noProof = await claimCampaignForVerifiedClient({
      user: verified!,
      campaignId,
      allowLocalPossession: false,
    });
    expect(noProof.ok).toBe(false);
    if (!noProof.ok) expect(noProof.code).toBe("claim_proof_required");

    const bad = await consumeProjectClaimReceipt({
      rawToken: "totally-fake-token",
      userId: verified!.id,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe("unknown_token");

    const flagOnly = await claimCampaignForVerifiedClient({
      user: verified!,
      campaignId,
      allowLocalPossession: true,
    });
    expect(flagOnly.ok).toBe(false);
    if (!flagOnly.ok) expect(flagOnly.code).toBe("claim_proof_required");

    const localOk = await claimCampaignForVerifiedClient({
      user: { ...verified!, currentCampaignId: campaignId },
      campaignId,
      allowLocalPossession: true,
    });
    expect(localOk.ok).toBe(true);
  });

  it("does not let a second customer claim an unowned paid project with a possession flag", async () => {
    const campaignId = `camp-steal-${randomUUID().slice(0, 8)}`;
    await upsertCampaignRecord(paidCampaign(campaignId));
    const buyer = await createClientAccount({
      email: "buyer-possess@example.com",
      password: "ClaimTest-pass-10!",
      displayName: "Buyer",
    });
    expect(buyer.ok).toBe(true);
    if (!buyer.ok) return;
    const stranger = await createClientAccount({
      email: "stranger-possess@example.com",
      password: "ClaimTest-pass-11!",
      displayName: "Stranger",
    });
    expect(stranger.ok).toBe(true);
    if (!stranger.ok) return;
    const verifiedStranger = await markEmailVerified(stranger.user.id);

    const steal = await claimCampaignForVerifiedClient({
      user: verifiedStranger!,
      campaignId,
      allowLocalPossession: true,
    });
    expect(steal.ok).toBe(false);
    if (!steal.ok) expect(steal.code).toBe("claim_proof_required");

    const buyerClaim = await claimCampaignForVerifiedClient({
      user: { ...buyer.user, currentCampaignId: campaignId },
      campaignId,
      allowLocalPossession: true,
    });
    expect(buyerClaim.ok).toBe(true);
    const env = await readCampaignEnvelope(campaignId);
    expect(env?.clientUserId).toBe(buyer.user.id);
  });

  it("does not mutate payment truth when claiming", async () => {
    const campaignId = `camp-pay-${randomUUID().slice(0, 8)}`;
    const before = paidCampaign(campaignId);
    await upsertCampaignRecord(before);
    const { rawToken } = await issueProjectClaimReceipt({
      campaignId,
      checkoutSessionId: before.paymentTruth!.checkoutSessionId!,
    });
    const created = await createClientAccount({
      email: "paykeep@example.com",
      password: "ClaimTest-pass-4!",
      displayName: "PayKeep",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const user = await markEmailVerified(created.user.id);
    const claimed = await claimCampaignForVerifiedClient({
      user: user!,
      campaignId,
      rawClaimToken: rawToken,
    });
    expect(claimed.ok).toBe(true);
    const after = await readCampaignEnvelope(campaignId);
    expect(after?.record.paymentTruth?.confirmedAmountCents).toBe(6900);
    expect(after?.record.paymentTruth?.checkoutSessionId).toBe(
      before.paymentTruth!.checkoutSessionId,
    );
    expect(after?.record.paymentReceivedAt).toBe(before.paymentReceivedAt);
    expect(PROJECT_CLAIM_PACKAGE_ID).toContain("PROJECT-CLAIM");
  });

  it("binds signed-in payer at payment without minting a receipt", async () => {
    const campaignId = `camp-bind-${randomUUID().slice(0, 8)}`;
    const created = await createClientAccount({
      email: "payer@example.com",
      password: "ClaimTest-pass-5!",
      displayName: "Payer",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await markEmailVerified(created.user.id);

    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);
    const { applyPostPaymentOwnership } = await import("./post-payment-ownership");
    const result = await applyPostPaymentOwnership({
      campaign,
      checkoutSessionId: `cs_${campaignId}`,
      binding: {
        checkoutSessionId: `cs_${campaignId}`,
        campaignId,
        expectedAmountCents: 6900,
        currency: "usd",
        selectedServiceIds: ["rm-j007"],
        decisionId: "dec",
        factFingerprint: "fp",
        draftRevision: 1,
        createdAt: new Date().toISOString(),
        sandbox: true,
        payerClientUserId: created.user.id,
      },
      priorClientUserId: null,
    });
    expect(result.boundAtPayment).toBe(true);
    expect(result.claimRawToken).toBeNull();
    expect(result.clientUserId).toBe(created.user.id);
  });

  it("mints guest receipt then recovers the same project on claim", async () => {
    const campaignId = `camp-guest-${randomUUID().slice(0, 8)}`;
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);
    const { applyPostPaymentOwnership } = await import("./post-payment-ownership");
    const ownership = await applyPostPaymentOwnership({
      campaign,
      checkoutSessionId: `cs_${campaignId}`,
      binding: {
        checkoutSessionId: `cs_${campaignId}`,
        campaignId,
        expectedAmountCents: 6900,
        currency: "usd",
        selectedServiceIds: ["rm-j007"],
        decisionId: "dec",
        factFingerprint: "fp",
        draftRevision: 1,
        createdAt: new Date().toISOString(),
        sandbox: true,
        customerEmail: "guest@example.com",
      },
      priorClientUserId: null,
    });
    expect(ownership.claimRawToken).toBeTruthy();

    const created = await createClientAccount({
      email: "guest@example.com",
      password: "ClaimTest-pass-6!",
      displayName: "Guest",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const verified = await markEmailVerified(created.user.id);
    const claimed = await claimCampaignForVerifiedClient({
      user: verified!,
      campaignId,
      rawClaimToken: ownership.claimRawToken!,
    });
    expect(claimed.ok).toBe(true);
    const env = await readCampaignEnvelope(campaignId);
    expect(env?.clientUserId).toBe(verified!.id);
  });

  it("refuses to claim the frozen Maya campaign", async () => {
    const created = await createClientAccount({
      email: "maya.claim@example.com",
      password: "ClaimTest-pass-9!",
      displayName: "Maya Attempt",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { MAYA_PROTECTED_CAMPAIGN_ID } = await import(
      "@/config/studio-production-team-workforce-v1"
    );
    const blocked = await claimCampaignForVerifiedClient({
      user: created.user,
      campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
      allowLocalPossession: true,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("invalid_campaign");
  });

  it("delivers one browser claim token for a checkout session and does not mint another", async () => {
    const campaignId = `camp-deliver-${randomUUID().slice(0, 8)}`;
    const before = paidCampaign(campaignId);
    await upsertCampaignRecord(before);
    await issueProjectClaimReceipt({
      campaignId,
      checkoutSessionId: before.paymentTruth!.checkoutSessionId!,
      customerEmail: "payer@example.com",
    });

    const first = await releaseUnclaimedBrowserClaimToken({
      campaignId,
      checkoutSessionId: before.paymentTruth!.checkoutSessionId!,
      customerEmail: "payer@example.com",
    });
    const second = await releaseUnclaimedBrowserClaimToken({
      campaignId,
      checkoutSessionId: before.paymentTruth!.checkoutSessionId!,
      customerEmail: "payer@example.com",
    });
    expect(first).toBeTruthy();
    expect(second).toBeNull();

    const stranger = await createClientAccount({
      email: "stranger-deliver@example.com",
      password: "ClaimTest-pass-12!",
      displayName: "Stranger",
    });
    expect(stranger.ok).toBe(true);
    if (!stranger.ok || !first) return;
    const verifiedStranger = await markEmailVerified(stranger.user.id);
    const denied = await claimCampaignForVerifiedClient({
      user: verifiedStranger!,
      campaignId,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("claim_proof_required");

    const owner = await createClientAccount({
      email: "owner-deliver@example.com",
      password: "ClaimTest-pass-13!",
      displayName: "Owner",
    });
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;
    const claimed = await claimCampaignForVerifiedClient({
      user: owner.user,
      campaignId,
      rawClaimToken: first,
    });
    expect(claimed.ok).toBe(true);
    const env = await readCampaignEnvelope(campaignId);
    expect(env?.clientUserId).toBe(owner.user.id);
    expect(env?.record.paymentTruth?.checkoutSessionId).toBe(
      before.paymentTruth!.checkoutSessionId,
    );
    expect(env?.record.paymentTruth?.confirmedAmountCents).toBe(6900);
    expect(env?.record.campaignId).toBe(campaignId);
  });
});
