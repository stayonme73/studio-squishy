import { describe, expect, it } from "vitest";

import type { ServerCampaignEnvelope, StudioUser } from "./types";
import {
  canClaimClientCampaign,
  canListAllCampaigns,
  canReadCampaign,
  canSyncCurrentCampaign,
  filterCampaignsForUser,
  isBrowsableCampaignId,
} from "./access";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const staff: StudioUser = {
  id: "staff-dev",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"],
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

const assignments = {
  staffByUserId: {
    "staff-dev": ["campaign-b"],
  },
};

describe("campaign access", () => {
  it("owner can list all and read any non-fixture campaign", () => {
    expect(canListAllCampaigns(owner)).toBe(true);
    expect(canReadCampaign(owner, "campaign-b", undefined, assignments)).toBe(true);
  });

  it("staff cannot list all; reads only assigned campaigns", () => {
    expect(canListAllCampaigns(staff)).toBe(false);
    expect(canReadCampaign(staff, "campaign-b", undefined, assignments)).toBe(true);
    expect(canReadCampaign(staff, "campaign-a", envelope, assignments)).toBe(false);
  });

  it("restricts client reads to their campaign", () => {
    expect(canListAllCampaigns(client)).toBe(false);
    expect(canReadCampaign(client, "campaign-a", envelope)).toBe(true);
    expect(canReadCampaign(client, "campaign-b", envelope)).toBe(false);
  });

  it("allows a client to read every campaign owned by their account", () => {
    const multiClient: StudioUser = {
      ...client,
      currentCampaignId: "campaign-a",
      clientCampaignIds: ["campaign-a", "campaign-c"],
    };
    const campaignC: ServerCampaignEnvelope = {
      ...envelope,
      campaignId: "campaign-c",
      record: { ...envelope.record, campaignId: "campaign-c" },
    };

    expect(canReadCampaign(multiClient, "campaign-a", envelope)).toBe(true);
    expect(canReadCampaign(multiClient, "campaign-c", campaignC)).toBe(true);
    expect(canReadCampaign(multiClient, "campaign-d", {
      ...envelope,
      campaignId: "campaign-d",
      clientUserId: "client-2",
      record: { ...envelope.record, campaignId: "campaign-d" },
    })).toBe(false);
  });

  it("does not let currentCampaignId alone override another client owner", () => {
    const editedUrlClient: StudioUser = {
      ...client,
      currentCampaignId: "campaign-b",
    };
    const otherOwned: ServerCampaignEnvelope = {
      ...envelope,
      campaignId: "campaign-b",
      clientUserId: "client-2",
      record: { ...envelope.record, campaignId: "campaign-b" },
    };

    expect(canReadCampaign(editedUrlClient, "campaign-b", otherOwned)).toBe(false);
    expect(canClaimClientCampaign(editedUrlClient, "campaign-b", otherOwned)).toBe(false);
  });

  it("blocks fixture campaigns from browse paths", () => {
    expect(isBrowsableCampaignId("owner-qa-dev")).toBe(false);
    expect(isBrowsableCampaignId("test-abc")).toBe(false);
    expect(canReadCampaign(owner, "owner-qa-dev", undefined, assignments)).toBe(false);
  });

  it("filterCampaignsForUser hides fixtures and applies staff assignments", () => {
    const envelopes = [
      envelope,
      { ...envelope, campaignId: "campaign-b", record: { ...envelope.record, campaignId: "campaign-b" } },
      { ...envelope, campaignId: "owner-qa-dev", record: { ...envelope.record, campaignId: "owner-qa-dev" } },
    ];
    expect(filterCampaignsForUser(envelopes, owner, assignments).map((e) => e.campaignId)).toEqual([
      "campaign-a",
      "campaign-b",
    ]);
    expect(filterCampaignsForUser(envelopes, staff, assignments).map((e) => e.campaignId)).toEqual([
      "campaign-b",
    ]);
  });

  it("allows client sync on current campaign route", () => {
    expect(canSyncCurrentCampaign(client)).toBe(true);
    expect(canSyncCurrentCampaign(null)).toBe(false);
  });
});
