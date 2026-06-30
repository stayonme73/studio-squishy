import { listStudioUsers } from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import {
  resolveAssignCandidatesByCampaign,
  resolveOwnerConsoleView,
  shouldIncludeCampaignInOwnerConsoleAggregate,
  type OwnerConsoleCampaignBundle,
} from "@/lib/campaign-tasks/owner-console-view";
import { resolveOwnerConsoleAccess } from "@/lib/campaign-tasks/owner-console-access";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { loadFileRoomCampaignList } from "@/lib/file-room/load-campaign";

export type OwnerConsoleAggregateResult =
  | { kind: "forbidden" }
  | {
      kind: "ok";
      view: ReturnType<typeof resolveOwnerConsoleView>;
      refreshedAt: string;
    };

export async function loadOwnerConsoleAggregate(
  user: StudioUser,
): Promise<OwnerConsoleAggregateResult> {
  const access = resolveOwnerConsoleAccess(user);
  if (access.kind === "forbidden") {
    return { kind: "forbidden" };
  }

  const [{ campaigns }, assignments, studioUsers] = await Promise.all([
    loadFileRoomCampaignList(user),
    readCampaignAssignments(),
    listStudioUsers(),
  ]);

  const rawBundles = await Promise.all(
    campaigns.map(async (envelope): Promise<OwnerConsoleCampaignBundle> => {
      const [tasksEnvelope, materialsEnvelope] = await Promise.all([
        getOrGenerateTasks(envelope.campaignId, envelope.record),
        getOrInitializeMaterials(envelope.campaignId, envelope.record),
      ]);
      return {
        envelope,
        tasksEnvelope,
        materials: materialsEnvelope.items,
      };
    }),
  );

  const assignCandidatesByCampaign = resolveAssignCandidatesByCampaign(
    rawBundles,
    assignments,
    studioUsers,
  );

  const provisionalView = resolveOwnerConsoleView(
    rawBundles,
    user,
    assignments,
    assignCandidatesByCampaign,
  );

  const waitingByCampaign = new Set(
    provisionalView.waitingOnOwner.map((card) => card.campaignId),
  );

  const bundles = rawBundles.filter((bundle) =>
    shouldIncludeCampaignInOwnerConsoleAggregate(
      bundle.envelope,
      waitingByCampaign.has(bundle.envelope.campaignId),
    ),
  );

  const view = resolveOwnerConsoleView(
    bundles,
    user,
    assignments,
    assignCandidatesByCampaign,
  );

  return {
    kind: "ok",
    view,
    refreshedAt: new Date().toISOString(),
  };
}
