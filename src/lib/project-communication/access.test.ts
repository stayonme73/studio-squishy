import { describe, expect, it } from "vitest";

import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  canAccessStaffProjectCommunication,
  canReplyStaffProjectCommunication,
} from "./access";

const NOW = "2026-07-27T12:00:00.000Z";
const CAMPAIGN_ID = "comm3-staff-campaign";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@studio.local",
  displayName: "Owner",
  roles: ["owner"],
};

const staff: StudioUser = {
  id: "staff-1",
  email: "staff@studio.local",
  displayName: "Staff",
  roles: ["staff"],
};

const client: StudioUser = {
  id: "client-1",
  email: "client@example.com",
  displayName: "Client",
  roles: ["client"],
  currentCampaignId: CAMPAIGN_ID,
  clientCampaignIds: [CAMPAIGN_ID],
};

const envelope = {
  campaignId: CAMPAIGN_ID,
  clientUserId: "client-1",
  record: {
    campaignId: CAMPAIGN_ID,
    campaignName: "COMM-3",
    campaignStatus: "BUILDING_CONCEPTS" as const,
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: "custom-studio-plan",
    packageLabel: "",
    createdAt: NOW,
    updatedAt: NOW,
  },
  syncedAt: NOW,
  syncVersion: 1,
} as ServerCampaignEnvelope;

const assigned: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-1": [CAMPAIGN_ID],
  },
};

const unassigned: CampaignAssignmentsFile = {
  staffByUserId: {},
};

describe("project communication staff access", () => {
  it("allows owner and assigned staff", () => {
    expect(canAccessStaffProjectCommunication(owner, CAMPAIGN_ID, envelope, assigned)).toBe(true);
    expect(canReplyStaffProjectCommunication(staff, CAMPAIGN_ID, envelope, assigned)).toBe(true);
  });

  it("rejects client and unassigned staff", () => {
    expect(canAccessStaffProjectCommunication(client, CAMPAIGN_ID, envelope, assigned)).toBe(false);
    expect(canAccessStaffProjectCommunication(staff, CAMPAIGN_ID, envelope, unassigned)).toBe(
      false,
    );
    expect(canAccessStaffProjectCommunication(null, CAMPAIGN_ID, envelope, assigned)).toBe(false);
  });
});
