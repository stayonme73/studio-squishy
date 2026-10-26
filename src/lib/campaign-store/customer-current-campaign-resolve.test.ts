import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";

const readCampaignEnvelope = vi.hoisted(() => vi.fn());
const listCampaignEnvelopes = vi.hoisted(() => vi.fn());
const upsertCampaignRecord = vi.hoisted(() => vi.fn());
const linkClientCampaign = vi.hoisted(() => vi.fn());
const wakePaidCampaignEnvelope = vi.hoisted(() => vi.fn());

vi.mock("@/lib/campaign-store/store", () => ({
  readCampaignEnvelope,
  listCampaignEnvelopes,
  upsertCampaignRecord,
}));

vi.mock("@/lib/auth/users", () => ({
  linkClientCampaign,
}));

vi.mock("@/lib/studio-paid-activation-recovery", () => ({
  wakePaidCampaignEnvelope,
}));

import { resolveCustomerCurrentCampaign } from "@/lib/campaign-store/customer-current-campaign";

const now = "2026-10-17T12:00:00.000Z";
const campaignId = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";

function flyer(): CampaignRecord {
  return {
    campaignId,
    campaignName: "Maya's Mobile Boutique",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Awaiting payment confirmation.",
    estimatedCompletion: "After payment and Project Intake",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    createdAt: now,
    updatedAt: now,
    routeMapIntakeSubmittedAt: now,
    deliverablesDelivered: {},
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 6900,
      monthlyTotalCents: 0,
      amountDueTodayCents: 6900,
      lineItems: [],
      approvedAt: now,
    },
  };
}

function client(overrides: Partial<StudioUser> = {}): StudioUser {
  return {
    id: "customer-one",
    email: "customer@studio.test",
    displayName: "Customer One",
    roles: ["client"],
    ...overrides,
  };
}

describe("resolveCustomerCurrentCampaign", () => {
  beforeEach(() => {
    readCampaignEnvelope.mockReset();
    listCampaignEnvelopes.mockReset();
    upsertCampaignRecord.mockReset();
    linkClientCampaign.mockReset();
    wakePaidCampaignEnvelope.mockReset();
    listCampaignEnvelopes.mockResolvedValue([]);
    upsertCampaignRecord.mockImplementation(async (record: CampaignRecord) => record);
    linkClientCampaign.mockResolvedValue(null);
    wakePaidCampaignEnvelope.mockImplementation(async (record: CampaignRecord) => ({
      campaignId: record.campaignId,
      clientUserId: "customer-one",
      record,
      syncedAt: now,
      syncVersion: 2,
    }));
  });

  it("does not fabricate a campaign when the customer has none", async () => {
    const user = client();
    const result = await resolveCustomerCurrentCampaign(user);
    expect(result.envelope).toBeNull();
    expect(result.user).toBe(user);
    expect(readCampaignEnvelope).not.toHaveBeenCalled();
    expect(upsertCampaignRecord).not.toHaveBeenCalled();
    expect(wakePaidCampaignEnvelope).not.toHaveBeenCalled();
  });

  it("hydrates the loaded paid envelope without changing its campaign or payment status", async () => {
    const record = flyer();
    const envelope: ServerCampaignEnvelope = {
      campaignId,
      clientUserId: "customer-one",
      record,
      syncedAt: now,
      syncVersion: 1,
    };
    readCampaignEnvelope.mockResolvedValue(envelope);
    const result = await resolveCustomerCurrentCampaign(
      client({ currentCampaignId: campaignId, clientCampaignIds: [] }),
    );
    expect(upsertCampaignRecord).toHaveBeenCalledTimes(1);
    expect(upsertCampaignRecord.mock.calls[0]?.[0]?.campaignId).toBe(campaignId);
    expect(upsertCampaignRecord.mock.calls[0]?.[0]?.campaignStatus).toBe("PAYMENT_RECEIVED");
    expect(upsertCampaignRecord.mock.calls[0]?.[0]?.paymentReceivedAt).toBe(now);
    expect(result.envelope?.campaignId).toBe(campaignId);
    expect(result.envelope?.record.campaignStatus).toBe("PAYMENT_RECEIVED");
    expect(result.user.currentCampaignId).toBe(campaignId);
  });
});
