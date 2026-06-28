import { describe, expect, it } from "vitest";

import type { ServerCampaignEnvelope, StudioUser } from "./types";
import { canListAllCampaigns, canReadCampaign, canSyncCurrentCampaign } from "./access";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const client: StudioUser = {
  id: "client-1",
  email: "client@local.dev",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: "campaign-a",
};

const envelope: ServerCampaignEnvelope = {
  campaignId: "campaign-a",
  clientUserId: "client-1",
  record: {
    campaignId: "campaign-a",
    campaignName: "A",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  syncedAt: "2026-01-01T00:00:00.000Z",
  syncVersion: 1,
};

describe("campaign access", () => {
  it("allows owner/staff to list and read any campaign", () => {
    expect(canListAllCampaigns(owner)).toBe(true);
    expect(canReadCampaign(owner, "campaign-b")).toBe(true);
  });

  it("restricts client reads to their campaign", () => {
    expect(canListAllCampaigns(client)).toBe(false);
    expect(canReadCampaign(client, "campaign-a", envelope)).toBe(true);
    expect(canReadCampaign(client, "campaign-b", envelope)).toBe(false);
  });

  it("allows client sync on current campaign route", () => {
    expect(canSyncCurrentCampaign(client)).toBe(true);
    expect(canSyncCurrentCampaign(null)).toBe(false);
  });
});
