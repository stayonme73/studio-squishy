import { afterAll, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import {
  disposableKitTestIsolationMarker,
  sealDisposableKitStripeTestProof,
} from "@/lib/studio-payment/disposable-kit-test-isolation";

import { recoverPaidOperatingChain, wakePaidCampaignEnvelope } from "./recover";

const ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  STRIPE_MODE: "test",
  STRIPE_SECRET_KEY: "sk_test_isolation_not_a_real_key",
};

function sealedCampaign(): CampaignRecord {
  const campaign = {
    campaignId: "disposable-kit-pay-intake-isolation",
    paymentReceivedAt: "2026-10-21T12:00:00.000Z",
    condensedOffer: { packageId: "campaign_launch_kit" },
    paymentTruth: {
      status: "confirmed",
      sandbox: false,
      checkoutSessionId: "cs_test_isolation",
      selectedServiceIds: ["campaign_launch_kit"],
    },
    testPaymentIsolation: disposableKitTestIsolationMarker(),
  } as CampaignRecord;
  const sealed = sealDisposableKitStripeTestProof({
    campaign,
    checkoutSessionId: "cs_test_isolation",
    source: "stripe_retrieve",
    livemode: false,
    paymentStatus: "paid",
    env: ENV,
    verifiedAt: "2026-10-21T12:01:00.000Z",
  });
  if (!sealed) throw new Error("expected the Stripe test proof to seal");
  return sealed;
}

describe("disposable kit isolation guards shared recovery", () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousMode = process.env.STRIPE_MODE;

  afterAll(() => {
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousMode === undefined) delete process.env.STRIPE_MODE;
    else process.env.STRIPE_MODE = previousMode;
  });

  it("does not dispatch a sealed kit from recovery or campaign wake", async () => {
    process.env.STRIPE_SECRET_KEY = ENV.STRIPE_SECRET_KEY;
    process.env.STRIPE_MODE = "test";
    const campaign = sealedCampaign();
    const recovered = await recoverPaidOperatingChain(campaign);
    expect(recovered.reason).toBe("already_clear");
    expect(recovered.needsRecovery).toBe(false);
    expect(recovered.campaign).toBe(campaign);

    const envelope: ServerCampaignEnvelope = {
      campaignId: campaign.campaignId,
      record: campaign,
      syncedAt: "2026-10-21T12:02:00.000Z",
      syncVersion: 1,
    };
    const woken = await wakePaidCampaignEnvelope(envelope);
    expect(woken).toBe(envelope);
  });

  it("does not recover a marked kit before the payment proof is sealed", async () => {
    const campaign = {
      campaignId: "disposable-kit-pay-intake-unsealed",
      paymentReceivedAt: "2026-10-21T12:00:00.000Z",
      condensedOffer: { packageId: "campaign_launch_kit" },
      paymentTruth: {
        status: "confirmed",
        sandbox: false,
        checkoutSessionId: "cs_test_isolation",
        selectedServiceIds: ["campaign_launch_kit"],
      },
      testPaymentIsolation: disposableKitTestIsolationMarker(),
    } as CampaignRecord;
    const recovered = await recoverPaidOperatingChain(campaign);
    expect(recovered.reason).toBe("already_clear");
    expect(recovered.needsRecovery).toBe(false);
    expect(recovered.campaign).toBe(campaign);
  });

  it("still enters normal recovery when the kit proof is absent", async () => {
    const ordinary = {
      campaignId: "ordinary-customer",
      paymentReceivedAt: null,
    } as CampaignRecord;
    const recovered = await recoverPaidOperatingChain(ordinary);
    expect(recovered.reason).toBe("payment_not_confirmed");
    expect(recovered.campaign).toBe(ordinary);
  });
});
