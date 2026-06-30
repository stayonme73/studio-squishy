import { listStudioUsers } from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import { getOrInitializeProduction } from "@/lib/campaign-production/store";
import {
  resolveOwnerConsoleCampaignDetailView,
  type OwnerConsoleCampaignDetailView,
} from "@/lib/campaign-tasks/owner-console-campaign-view";
import { resolveOwnerConsoleAccess } from "@/lib/campaign-tasks/owner-console-access";
import { resolveAssignCandidatesForException } from "@/lib/campaign-tasks/file-room-controls";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { loadFileRoomCampaign } from "@/lib/file-room/load-campaign";
import { getOrInitializeMaterials } from "@/lib/materials/store";

export type OwnerConsoleCampaignResult =
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | {
      kind: "ok";
      view: OwnerConsoleCampaignDetailView;
      refreshedAt: string;
    };

export async function loadOwnerConsoleCampaign(
  user: StudioUser,
  campaignId: string,
  selectedItemId: string | null,
): Promise<OwnerConsoleCampaignResult> {
  const access = resolveOwnerConsoleAccess(user);
  if (access.kind === "forbidden") {
    return { kind: "forbidden" };
  }

  const result = await loadFileRoomCampaign(user, campaignId);
  if (result.kind === "not-found") return { kind: "not-found" };
  if (result.kind === "forbidden") return { kind: "forbidden" };

  const [tasksEnvelope, materialsEnvelope, productionEnvelope, assignments, studioUsers] =
    await Promise.all([
      getOrGenerateTasks(campaignId, result.envelope.record),
      getOrInitializeMaterials(campaignId, result.envelope.record),
      getOrInitializeProduction(campaignId, result.envelope.record),
      readCampaignAssignments(),
      listStudioUsers(),
    ]);

  const assignCandidates = resolveAssignCandidatesForException(
    campaignId,
    assignments,
    studioUsers,
  );

  const view = resolveOwnerConsoleCampaignDetailView(
    {
      envelope: result.envelope,
      tasksEnvelope,
      materials: materialsEnvelope.items,
      productionEnvelope,
      user,
      assignments,
      assignCandidates,
      selectedItemId,
    },
    studioUsers,
  );

  return {
    kind: "ok",
    view,
    refreshedAt: new Date().toISOString(),
  };
}
