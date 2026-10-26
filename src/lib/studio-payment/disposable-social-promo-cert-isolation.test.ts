import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { mergeCustomerOwnedCampaignSync } from "@/lib/campaign-store/customer-sync-allowlist";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { watchdogSweepMayDeliverCampaign } from "@/lib/studio-lifecycle-email/watchdog-sweep-eligibility";

import {
  armDisposableSocialPromoCertMarker,
  disposableSocialPromoCertAllowsOperatingChain,
  disposableSocialPromoCertBlocksBillableProviders,
  disposableSocialPromoCertBlocksOperatingChain,
  disposableSocialPromoCertMarker,
  parseSocialPromoCertIsolation,
} from "./disposable-social-promo-cert-isolation";
import { resolveDispatchExecutionIsolationBlock } from "./disposable-test-isolation-guards";

const DEV_ENV: NodeJS.ProcessEnv = { NODE_ENV: "development" };
const PROD_ENV: NodeJS.ProcessEnv = { NODE_ENV: "production" };

function spCertCampaign(
  extra: Partial<CampaignRecord> = {},
): CampaignRecord {
  return {
    campaignId: "disposable-social-promo-machine-cert-1",
    campaignName: "SP cert",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "Social & Promo",
    revisionRoundsUsed: 0,
    paymentReceivedAt: "2026-10-24T12:00:00.000Z",
    createdAt: "2026-10-24T12:00:00.000Z",
    updatedAt: "2026-10-24T12:00:00.000Z",
    condensedOffer: { packageId: "social_and_promo_graphics" },
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 15920,
      confirmedAmountCents: 15920,
      checkoutSessionId: "local-disposable-sp-cert-no-charge",
      selectedServiceIds: ["social_and_promo_graphics"],
      decisionId: "pa-disposable-sp-cert",
      factFingerprint: "pa:disposable-sp-cert",
      draftRevision: 1,
      confirmedAt: "2026-10-24T12:00:00.000Z",
      sandbox: true,
    },
    testPaymentIsolation: disposableSocialPromoCertMarker("prepared"),
    routingHandoff: {
      schemaVersion: "studio-routing-handoff-v1",
      activationCheckoutSessionId: "local-disposable-sp-cert-no-charge",
      routedAt: "2026-10-24T12:01:00.000Z",
      decisions: [],
    },
    ...extra,
  } as CampaignRecord;
}

describe("disposable Social & Promo cert isolation", () => {
  it("treats prepared as blocking operating chain and billable providers", () => {
    const campaign = spCertCampaign();
    expect(parseSocialPromoCertIsolation(campaign).kind).toBe("prepared");
    expect(disposableSocialPromoCertBlocksOperatingChain(campaign, DEV_ENV)).toBe(true);
    expect(disposableSocialPromoCertBlocksBillableProviders(campaign)).toBe(true);
    expect(disposableSocialPromoCertAllowsOperatingChain(campaign, DEV_ENV)).toBe(false);
  });

  it("fail-closes allowlisted id with invalid marker", () => {
    const campaign = spCertCampaign({
      testPaymentIsolation: {
        ...disposableSocialPromoCertMarker("prepared"),
        executionPhase: "armed" as "prepared",
      },
    });
    delete (campaign.testPaymentIsolation as { armedAt?: string }).armedAt;
    expect(parseSocialPromoCertIsolation(campaign).kind).toBe("invalid");
    expect(resolveDispatchExecutionIsolationBlock(campaign, DEV_ENV)?.error).toBe(
      "disposable_test_isolation",
    );
  });

  it("refuses to arm outside dev/test", () => {
    const armed = armDisposableSocialPromoCertMarker({
      campaign: spCertCampaign(),
      env: PROD_ENV,
    });
    expect(armed.ok).toBe(false);
  });

  it("armed in dev with sandbox payment may allow operating chain but still blocks billable providers", () => {
    const arm = armDisposableSocialPromoCertMarker({
      campaign: spCertCampaign(),
      env: DEV_ENV,
      armedAt: "2026-10-24T13:00:00.000Z",
    });
    expect(arm.ok).toBe(true);
    if (!arm.ok) return;
    expect(disposableSocialPromoCertAllowsOperatingChain(arm.campaign, DEV_ENV)).toBe(true);
    expect(disposableSocialPromoCertBlocksOperatingChain(arm.campaign, DEV_ENV)).toBe(false);
    expect(disposableSocialPromoCertBlocksBillableProviders(arm.campaign)).toBe(true);
    expect(
      resolveDispatchExecutionIsolationBlock(arm.campaign, DEV_ENV),
    ).toBeNull();
    expect(
      disposableSocialPromoCertAllowsOperatingChain(arm.campaign, PROD_ENV),
    ).toBe(false);
  });

  it("blocks client sync from inventing or arming the marker", () => {
    const server = spCertCampaign();
    const forged = mergeCustomerOwnedCampaignSync(null, {
      ...server,
      testPaymentIsolation: disposableSocialPromoCertMarker("armed"),
    });
    expect(forged.testPaymentIsolation).toBeUndefined();

    const armAttempt = mergeCustomerOwnedCampaignSync(server, {
      ...server,
      testPaymentIsolation: {
        ...disposableSocialPromoCertMarker("armed"),
        armedAt: "2026-10-24T99:00:00.000Z",
        armedBy: "owner" as const,
      },
    });
    expect(armAttempt.testPaymentIsolation).toEqual(
      disposableSocialPromoCertMarker("prepared"),
    );
  });

  it("prepared campaign cannot dispatch through ensureDispatchExecution", async () => {
    const result = await ensureDispatchExecution(spCertCampaign());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("disposable_test_isolation");
  });

  it("stays out of lifecycle watchdog delivery", () => {
    const campaign = spCertCampaign();
    expect(
      watchdogSweepMayDeliverCampaign({
        campaignId: campaign.campaignId,
        createdAt: campaign.createdAt,
        sandbox: campaign.paymentTruth?.sandbox,
        testPaymentIsolation: campaign.testPaymentIsolation,
      }),
    ).toBe(false);
  });
});
