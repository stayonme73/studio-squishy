import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  armDisposableSocialPromoCertMarker,
  disposableSocialPromoCertMarker,
} from "./disposable-social-promo-cert-isolation";
import { applyServerCampaignIsolationWritePolicy } from "./server-campaign-isolation-write-policy";

const DEV_ENV: NodeJS.ProcessEnv = { NODE_ENV: "development" };

function preparedCert(): CampaignRecord {
  return {
    campaignId: "disposable-social-promo-machine-cert-1",
    campaignName: "Cert",
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
  } as CampaignRecord;
}

describe("server campaign isolation write policy", () => {
  it("rejects ARMED marker on internal PATCH when arm helper would refuse (production env)", () => {
    const existing = preparedCert();
    const forged = {
      ...existing,
      testPaymentIsolation: {
        ...disposableSocialPromoCertMarker("armed"),
        armedAt: "2026-10-24T13:00:00.000Z",
        armedBy: "owner" as const,
      },
    };
    const merged = applyServerCampaignIsolationWritePolicy(existing, forged, {
      NODE_ENV: "production",
    });
    expect(merged.testPaymentIsolation).toEqual(disposableSocialPromoCertMarker("prepared"));
  });

  it("rejects forged ARMED shape that does not match arm helper output", () => {
    const existing = preparedCert();
    const forged = {
      ...existing,
      testPaymentIsolation: {
        ...disposableSocialPromoCertMarker("armed"),
        armedAt: "2026-10-24T13:00:00.000Z",
        armedBy: "customer" as never,
      },
    };
    const merged = applyServerCampaignIsolationWritePolicy(existing, forged, DEV_ENV);
    expect(merged.testPaymentIsolation).toEqual(disposableSocialPromoCertMarker("prepared"));
  });

  it("allows ARMED only when incoming marker matches armDisposableSocialPromoCertMarker", () => {
    const existing = preparedCert();
    const armed = armDisposableSocialPromoCertMarker({
      campaign: existing,
      env: DEV_ENV,
      armedAt: "2026-10-24T13:00:00.000Z",
    });
    expect(armed.ok).toBe(true);
    if (!armed.ok) return;
    const merged = applyServerCampaignIsolationWritePolicy(
      existing,
      armed.campaign,
      DEV_ENV,
    );
    expect(merged.testPaymentIsolation).toEqual(armed.campaign.testPaymentIsolation);
  });

  it("strips new Social & Promo cert marker invented on PATCH", () => {
    const incoming = preparedCert();
    const merged = applyServerCampaignIsolationWritePolicy(null, incoming, DEV_ENV);
    expect(merged.testPaymentIsolation).toBeUndefined();
  });
});
