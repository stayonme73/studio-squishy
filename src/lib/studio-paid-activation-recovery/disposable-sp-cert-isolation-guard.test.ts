import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import { disposableSocialPromoCertMarker } from "@/lib/studio-payment/disposable-social-promo-cert-isolation";

const ensureDispatchExecution = vi.fn(async (campaign: CampaignRecord) => ({
  ok: true,
  campaign,
}));

vi.mock("@/lib/studio-dispatch", () => ({
  ensureDispatchExecution: (...args: unknown[]) =>
    ensureDispatchExecution(...(args as [CampaignRecord])),
}));

import { recoverPaidOperatingChain, wakePaidCampaignEnvelope } from "./recover";

function preparedCampaign(): CampaignRecord {
  return {
    campaignId: "disposable-social-promo-machine-cert-1",
    paymentReceivedAt: "2026-10-24T12:00:00.000Z",
    condensedOffer: { packageId: "social_and_promo_graphics" },
    paymentTruth: {
      status: "confirmed",
      sandbox: true,
      checkoutSessionId: "local-disposable-sp-cert-no-charge",
      selectedServiceIds: ["social_and_promo_graphics"],
    },
    testPaymentIsolation: disposableSocialPromoCertMarker("prepared"),
  } as CampaignRecord;
}

describe("disposable Social & Promo cert recovery guards", () => {
  it("does not recover or dispatch a prepared cert project", async () => {
    ensureDispatchExecution.mockClear();
    const campaign = preparedCampaign();
    const recovered = await recoverPaidOperatingChain(campaign);
    expect(recovered.reason).toBe("already_clear");
    expect(recovered.needsRecovery).toBe(false);
    expect(ensureDispatchExecution).not.toHaveBeenCalled();

    const envelope: ServerCampaignEnvelope = {
      campaignId: campaign.campaignId,
      record: campaign,
      syncedAt: "2026-10-24T12:02:00.000Z",
      syncVersion: 1,
    };
    const woken = await wakePaidCampaignEnvelope(envelope);
    expect(woken).toBe(envelope);
    expect(ensureDispatchExecution).not.toHaveBeenCalled();
  });
});
