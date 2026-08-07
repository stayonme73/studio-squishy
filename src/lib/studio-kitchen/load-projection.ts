import type { StudioUser } from "@/lib/campaign-store/types";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { loadFileRoomCampaign, loadFileRoomCampaignList } from "@/lib/file-room/load-campaign";
import { readMaterialsEnvelope } from "@/lib/materials/store";

import {
  buildKitchenProductionFolderFromFixture,
  buildKitchenProductionFolderFromLive,
} from "./build-folder";
import {
  isKitchenFixtureDemoActive,
  kitchenFixtureCampaignSeed,
} from "./fixture-boundary";
import type { KitchenProjectionBoard, KitchenProjectionDetail } from "./types";

/**
 * Read-only Kitchen projection loader.
 *
 * Does not call getOrGenerateTasks / material init — viewing Kitchen must not
 * create production records.
 */
export async function loadKitchenProjectionBoard(
  user: StudioUser,
  options: { fixtureDemoRequested: boolean },
): Promise<KitchenProjectionBoard> {
  const { campaigns } = await loadFileRoomCampaignList(user);

  const liveFolders = await Promise.all(
    campaigns.map(async (envelope) => {
      const [tasksEnvelope, materialsEnvelope] = await Promise.all([
        readTasksEnvelope(envelope.campaignId),
        readMaterialsEnvelope(envelope.campaignId),
      ]);
      return buildKitchenProductionFolderFromLive({
        envelope,
        tasksEnvelope,
        materials: materialsEnvelope?.items ?? [],
      });
    }),
  );

  const liveCampaignCount = liveFolders.length;
  const fixtureDemoActive = isKitchenFixtureDemoActive({
    fixtureDemoRequested: options.fixtureDemoRequested,
    liveCampaignCount,
  });
  const fixtureFolders = fixtureDemoActive
    ? kitchenFixtureCampaignSeed.map(buildKitchenProductionFolderFromFixture)
    : [];

  return {
    sourceMode:
      liveCampaignCount > 0
        ? "live_production"
        : fixtureDemoActive
          ? "fixture_demo"
          : "empty",
    folders: liveCampaignCount > 0 ? liveFolders : fixtureFolders,
    liveCampaignCount,
    fixtureCampaignCount: fixtureFolders.length,
    fixtureDemoActive,
    refreshedAt: new Date().toISOString(),
  };
}

export async function loadKitchenProjectionDetail(
  user: StudioUser,
  campaignId: string,
  options: { fixtureDemoRequested: boolean },
): Promise<KitchenProjectionDetail> {
  const [{ campaigns }, loaded] = await Promise.all([
    loadFileRoomCampaignList(user),
    loadFileRoomCampaign(user, campaignId),
  ]);
  const liveCampaignCount = campaigns.length;
  const fixtureDemoActive = isKitchenFixtureDemoActive({
    fixtureDemoRequested: options.fixtureDemoRequested,
    liveCampaignCount,
  });

  if (loaded.kind === "ok") {
    const [tasksEnvelope, materialsEnvelope] = await Promise.all([
      readTasksEnvelope(campaignId),
      readMaterialsEnvelope(campaignId),
    ]);
    return {
      kind: "ok",
      folder: buildKitchenProductionFolderFromLive({
        envelope: loaded.envelope,
        tasksEnvelope,
        materials: materialsEnvelope?.items ?? [],
      }),
    };
  }

  if (loaded.kind === "forbidden") {
    return { kind: "unavailable", campaignId, reason: "forbidden" };
  }

  // Same gate as the board: fixture detail only when no live campaigns exist.
  if (fixtureDemoActive) {
    const fixture = kitchenFixtureCampaignSeed.find((entry) => entry.id === campaignId);
    if (fixture) {
      return {
        kind: "ok",
        folder: buildKitchenProductionFolderFromFixture(fixture),
      };
    }
  }

  return { kind: "unavailable", campaignId, reason: "not_found" };
}
