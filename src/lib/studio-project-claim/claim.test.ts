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

  it("fails closed: unverified email, missing receipt on new device, tampered token", async () => {
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

    const unverified = await claimCampaignForVerifiedClient({
      user: created.user,
      campaignId,
      rawClaimToken: rawToken,
    });
    expect(unverified.ok).toBe(false);
    if (!unverified.ok) expect(unverified.code).toBe("email_unverified");

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

    const localOk = await claimCampaignForVerifiedClient({
      user: verified!,
      campaignId,
      allowLocalPossession: true,
    });
    expect(localOk.ok).toBe(true);
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
});
