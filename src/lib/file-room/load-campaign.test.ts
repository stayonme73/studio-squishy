import { describe, expect, it, vi } from "vitest";

import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";

import { loadFileRoomCampaign, loadFileRoomCampaignList } from "./load-campaign";

vi.mock("@/lib/campaign-store/store", () => ({
  listCampaignEnvelopes: vi.fn(),
  readCampaignEnvelope: vi.fn(),
}));

vi.mock("@/lib/file-room/assignments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/file-room/assignments")>();
  return {
    ...actual,
    readCampaignAssignments: vi.fn(),
  };
});

import { listCampaignEnvelopes, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";

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

function envelope(campaignId: string): ServerCampaignEnvelope {
  return {
    campaignId,
    record: {
      campaignId,
      campaignName: campaignId,
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    syncedAt: "2026-01-01T00:00:00.000Z",
    syncVersion: 1,
  };
}

describe("loadFileRoomCampaign", () => {
  it("owner list hides fixtures", async () => {
    vi.mocked(listCampaignEnvelopes).mockResolvedValue([
      envelope("live-a"),
      envelope("owner-qa-dev"),
      envelope("test-123"),
    ]);
    vi.mocked(readCampaignAssignments).mockResolvedValue({ staffByUserId: {} });

    const result = await loadFileRoomCampaignList(owner);
    expect(result.campaigns.map((item) => item.campaignId)).toEqual(["live-a"]);
    expect(result.fixtureCountHidden).toBe(2);
  });

  it("staff list only includes assigned campaigns", async () => {
    vi.mocked(listCampaignEnvelopes).mockResolvedValue([
      envelope("live-a"),
      envelope("live-b"),
    ]);
    vi.mocked(readCampaignAssignments).mockResolvedValue({
      staffByUserId: { "staff-dev": ["live-b"] },
    });

    const result = await loadFileRoomCampaignList(staff);
    expect(result.campaigns.map((item) => item.campaignId)).toEqual(["live-b"]);
  });

  it("forbids staff from unassigned campaign detail", async () => {
    vi.mocked(readCampaignEnvelope).mockResolvedValue(envelope("live-a"));
    vi.mocked(readCampaignAssignments).mockResolvedValue({
      staffByUserId: { "staff-dev": ["live-b"] },
    });

    const result = await loadFileRoomCampaign(staff, "live-a");
    expect(result.kind).toBe("forbidden");
  });

  it("allows owner campaign detail", async () => {
    vi.mocked(readCampaignEnvelope).mockResolvedValue(envelope("live-a"));
    vi.mocked(readCampaignAssignments).mockResolvedValue({ staffByUserId: {} });

    const result = await loadFileRoomCampaign(owner, "live-a");
    expect(result.kind).toBe("ok");
  });

  it("blocks fixture campaign detail", async () => {
    vi.mocked(readCampaignEnvelope).mockClear();
    const result = await loadFileRoomCampaign(owner, "owner-qa-dev");
    expect(result.kind).toBe("forbidden");
    expect(readCampaignEnvelope).not.toHaveBeenCalled();
  });
});
