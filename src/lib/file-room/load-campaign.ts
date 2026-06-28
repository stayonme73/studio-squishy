import { canReadCampaign, filterCampaignsForUser } from "@/lib/campaign-store/access";
import { isFixtureCampaignId } from "@/lib/campaign-store/fixture-guard";
import { listCampaignEnvelopes, readCampaignEnvelope } from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import { readCampaignAssignments } from "@/lib/file-room/assignments";

export type FileRoomLoadResult =
  | { kind: "ok"; envelope: ServerCampaignEnvelope }
  | { kind: "not-found" }
  | { kind: "forbidden" };

export type FileRoomListResult = {
  campaigns: ServerCampaignEnvelope[];
  fixtureCountHidden: number;
};

export async function loadFileRoomCampaignList(user: StudioUser): Promise<FileRoomListResult> {
  const [all, assignments] = await Promise.all([
    listCampaignEnvelopes(),
    readCampaignAssignments(),
  ]);

  const fixtureCountHidden = all.filter((envelope) =>
    isFixtureCampaignId(envelope.campaignId),
  ).length;

  return {
    campaigns: filterCampaignsForUser(all, user, assignments),
    fixtureCountHidden,
  };
}

export async function loadFileRoomCampaign(
  user: StudioUser,
  campaignId: string,
): Promise<FileRoomLoadResult> {
  if (!isFixtureCampaignId(campaignId)) {
    const envelope = await readCampaignEnvelope(campaignId);
    if (!envelope) return { kind: "not-found" };

    const assignments = await readCampaignAssignments();
    if (!canReadCampaign(user, campaignId, envelope, assignments)) {
      return { kind: "forbidden" };
    }
    return { kind: "ok", envelope };
  }

  return { kind: "forbidden" };
}
