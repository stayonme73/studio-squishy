import { listStudioUsers } from "@/lib/auth/users";
import type { StudioUser } from "@/lib/campaign-store/types";
import { getOrGenerateTasks, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  resolveAssignCandidatesByCampaign,
  resolveOwnerConsoleView,
  shouldIncludeCampaignInOwnerConsoleAggregate,
  type OwnerConsoleCampaignBundle,
} from "@/lib/campaign-tasks/owner-console-view";
import {
  resolveOwnerConsoleScanView,
  resolveWaitingOwnerExceptionIds,
  type OwnerConsoleScanView,
} from "@/lib/campaign-tasks/owner-console-scan-view";
import { resolveOwnerConsoleAccess } from "@/lib/campaign-tasks/owner-console-access";
import {
  filterBundlesForControlRoom,
  resolveOwnerControlRoomView,
  type OwnerControlRoomView,
} from "@/lib/job-control/control-room-view";
import {
  resolveCampaignCommunicationClientId,
  syncJobCommunicationRecords,
} from "@/lib/job-control/communication";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { loadFileRoomCampaignList } from "@/lib/file-room/load-campaign";

export type OwnerConsoleAggregateResult =
  | { kind: "forbidden" }
  | {
      kind: "ok";
      view: ReturnType<typeof resolveOwnerConsoleView>;
      scan: OwnerConsoleScanView;
      controlRoom: OwnerControlRoomView;
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

  const loadedBundles = await Promise.all(
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
  const rawBundles = await Promise.all(
    loadedBundles.map(async (bundle): Promise<OwnerConsoleCampaignBundle> => {
      const synced = syncJobRecordsFromCampaign(
        bundle.envelope.record,
        bundle.tasksEnvelope.tasks ?? [],
        bundle.materials ?? [],
        bundle.tasksEnvelope.exceptionRecords ?? [],
        bundle.tasksEnvelope.jobRecords,
      );
      const jobs = applyWaitingOnClientPolicies(synced, bundle.materials ?? []);
      const clientId = resolveCampaignCommunicationClientId(
        bundle.envelope.clientUserId,
        bundle.envelope.campaignId,
      );
      const communicationSync = syncJobCommunicationRecords({
        envelope: bundle.tasksEnvelope,
        campaign: bundle.envelope.record,
        clientId,
        jobs,
        materials: bundle.materials ?? [],
      });
      const nextEnvelope = communicationSync.envelope;
      const changed =
        JSON.stringify(bundle.tasksEnvelope.jobRecords ?? []) !==
          JSON.stringify(nextEnvelope.jobRecords ?? []) ||
        JSON.stringify(bundle.tasksEnvelope.jobCommunicationRecords ?? []) !==
          JSON.stringify(nextEnvelope.jobCommunicationRecords ?? []) ||
        JSON.stringify(bundle.tasksEnvelope.jobActivityEvents ?? []) !==
          JSON.stringify(nextEnvelope.jobActivityEvents ?? []);

      if (!changed) return bundle;
      const saved = await writeTasksEnvelope(nextEnvelope);
      return { ...bundle, tasksEnvelope: saved };
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

  const scan = resolveOwnerConsoleScanView(
    bundles,
    user,
    assignments,
    resolveWaitingOwnerExceptionIds(view.waitingOnOwner),
  );

  const controlRoomBundles = filterBundlesForControlRoom(rawBundles);
  const controlRoom = resolveOwnerControlRoomView(controlRoomBundles);

  return {
    kind: "ok",
    view,
    scan,
    controlRoom,
    refreshedAt: new Date().toISOString(),
  };
}
