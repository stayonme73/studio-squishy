import { describe, expect, it } from "vitest";

import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";

import {
  canDownloadStoredCustomerMaterial,
  canReadMaterials,
  canReviewMaterials,
  canSubmitMaterials,
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

describe("materials access", () => {
  it("mirrors canReadCampaign for owner, staff, and client", () => {
    expect(canReadMaterials(owner, "campaign-b", undefined, assignments)).toBe(true);
    expect(canReadMaterials(staff, "campaign-b", undefined, assignments)).toBe(true);
    expect(canReadMaterials(staff, "campaign-a", envelope, assignments)).toBe(false);
    expect(canReadMaterials(client, "campaign-a", envelope)).toBe(true);
    expect(canReadMaterials(client, "campaign-b", envelope)).toBe(false);
  });

  it("blocks fixture campaigns", () => {
    expect(canReadMaterials(owner, "owner-qa-dev", undefined, assignments)).toBe(false);
  });

  it("allows client submit only on own campaign", () => {
    expect(canSubmitMaterials(client, "campaign-a", envelope)).toBe(true);
    expect(canSubmitMaterials(client, "campaign-b", envelope)).toBe(false);
    expect(canSubmitMaterials(owner, "campaign-a", envelope)).toBe(false);
    expect(canSubmitMaterials(staff, "campaign-b", undefined)).toBe(false);
  });

  it("allows owner and assigned staff to review materials", () => {
    expect(canReviewMaterials(owner, "campaign-b", undefined, assignments)).toBe(true);
    expect(canReviewMaterials(staff, "campaign-b", undefined, assignments)).toBe(true);
    expect(canReviewMaterials(staff, "campaign-a", envelope, assignments)).toBe(false);
    expect(canReviewMaterials(client, "campaign-a", envelope)).toBe(false);
  });

  it("lets only the production team retrieve stored customer bytes", () => {
    expect(canDownloadStoredCustomerMaterial(owner, "campaign-a", envelope, assignments)).toBe(true);
    expect(canDownloadStoredCustomerMaterial(staff, "campaign-a", envelope, assignments)).toBe(false);
    expect(canDownloadStoredCustomerMaterial(client, "campaign-a", envelope)).toBe(false);
    const otherClient: StudioUser = {
      ...client,
      id: "client-2",
      email: "other@local.dev",
      currentCampaignId: "campaign-b",
    };
    expect(canDownloadStoredCustomerMaterial(otherClient, "campaign-a", envelope)).toBe(false);
    expect(canReadMaterials(otherClient, "campaign-a", envelope)).toBe(false);
  });
});
