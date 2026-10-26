import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { disposableSocialPromoCertMarker } from "@/lib/studio-payment/disposable-social-promo-cert-isolation";

const readCampaignEnvelope = vi.fn();
const readTasksEnvelope = vi.fn();
const deliverAuthorizedLifecycleNotices = vi.fn();

vi.mock("@/lib/campaign-store/store", () => ({
  readCampaignEnvelope: (...args: unknown[]) => readCampaignEnvelope(...args),
}));

vi.mock("@/lib/campaign-tasks/store", () => ({
  readTasksEnvelope: (...args: unknown[]) => readTasksEnvelope(...args),
  writeTasksEnvelope: vi.fn(),
}));

vi.mock("./deliver", () => ({
  deliverAuthorizedLifecycleNotices: (...args: unknown[]) =>
    deliverAuthorizedLifecycleNotices(...args),
}));

import { deliverLifecycleNoticesForCampaign } from "./campaign";

describe("disposable test lifecycle email isolation", () => {
  beforeEach(() => {
    deliverAuthorizedLifecycleNotices.mockClear();
  });

  it("does not invoke external transport for Social & Promo cert marker", async () => {
    const record = {
      campaignId: "disposable-social-promo-machine-cert-1",
      testPaymentIsolation: disposableSocialPromoCertMarker("prepared"),
    } as CampaignRecord;
    readCampaignEnvelope.mockResolvedValue({
      campaignId: record.campaignId,
      record,
    } satisfies ServerCampaignEnvelope);
    readTasksEnvelope.mockResolvedValue({
      campaignId: record.campaignId,
      jobRecords: [],
    } satisfies ServerTasksEnvelope);

    const result = await deliverLifecycleNoticesForCampaign(record.campaignId);
    expect(result.attempted).toBe(0);
    expect(result.sent).toBe(0);
    expect(deliverAuthorizedLifecycleNotices).not.toHaveBeenCalled();
  });
});
