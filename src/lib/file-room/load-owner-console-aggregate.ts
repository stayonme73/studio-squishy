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
  bundleHasRecentlyResolvedForOwnerConsole,
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
import { COORDINATOR_SYSTEM_USER } from "@/studio-coordinator/config";
import { applyOrdinaryMissingClientFactsInEnvelope } from "@/lib/campaign-tasks/missing-client-fact-ask";
import { recoverOwnerDecisionAftermath } from "@/lib/campaign-tasks/owner-decision-aftermath";
import { shouldAppearOnLiveOwnerDesk } from "@/lib/file-room/owner-console-live-desk";
import { getOrInitializeMaterials, readMaterialsEnvelope, writeMaterialsEnvelope } from "@/lib/materials/store";
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

  const liveCampaigns = campaigns.filter((envelope) =>
    shouldAppearOnLiveOwnerDesk(envelope.campaignId),
  );

  const loadedBundles = await Promise.all(
    liveCampaigns.map(async (envelope) => {
      const tasksEnvelope = await getOrGenerateTasks(envelope.campaignId, envelope.record);
      const materialsEnvelope = await readMaterialsEnvelope(envelope.campaignId);
      return { envelope, tasksEnvelope, materialsEnvelope };
    }),
  );
  const rawBundles = await Promise.all(
    loadedBundles.map(async (bundle): Promise<OwnerConsoleCampaignBundle> => {
      let tasksEnvelope = bundle.tasksEnvelope;
      let materials = bundle.materialsEnvelope?.items ?? [];
      const openMissingFacts = (tasksEnvelope.exceptionRecords ?? []).some(
        (record) =>
          record.kind === "missing_client_fact" &&
          record.status !== "resolved" &&
          record.status !== "cancelled" &&
          !(record.promotion && record.status === "waiting_client"),
      );
      if (shouldAppearOnLiveOwnerDesk(bundle.envelope.campaignId) && openMissingFacts) {
        const workingMaterials =
          bundle.materialsEnvelope ??
          (await getOrInitializeMaterials(
            bundle.envelope.campaignId,
            bundle.envelope.record,
          ));
        const asked = applyOrdinaryMissingClientFactsInEnvelope(
          tasksEnvelope,
          COORDINATOR_SYSTEM_USER,
          assignments,
          workingMaterials,
        );
        if (asked.askedIds.length > 0) {
          materials = asked.materialsEnvelope.items;
          tasksEnvelope = asked.envelope;
          await writeMaterialsEnvelope(asked.materialsEnvelope);
        } else {
          materials = workingMaterials.items;
        }
      }

      const synced = syncJobRecordsFromCampaign(
        bundle.envelope.record,
        tasksEnvelope.tasks ?? [],
        materials,
        tasksEnvelope.exceptionRecords ?? [],
        tasksEnvelope.jobRecords,
      );
      const jobs = applyWaitingOnClientPolicies(synced, materials);
      const recoveredAftermath = recoverOwnerDecisionAftermath({
        ...tasksEnvelope,
        jobRecords: jobs,
      });
      tasksEnvelope = recoveredAftermath.envelope;
      const recoveredJobs = tasksEnvelope.jobRecords ?? jobs;
      const clientId = resolveCampaignCommunicationClientId(
        bundle.envelope.clientUserId,
        bundle.envelope.campaignId,
      );
      const communicationSync = syncJobCommunicationRecords({
        envelope: tasksEnvelope,
        campaign: bundle.envelope.record,
        clientId,
        jobs: recoveredJobs,
        materials,
      });
      const nextEnvelope = communicationSync.envelope;
      const changed =
        JSON.stringify(bundle.tasksEnvelope.jobRecords ?? []) !==
          JSON.stringify(nextEnvelope.jobRecords ?? []) ||
        JSON.stringify(bundle.tasksEnvelope.jobCommunicationRecords ?? []) !==
          JSON.stringify(nextEnvelope.jobCommunicationRecords ?? []) ||
        JSON.stringify(bundle.tasksEnvelope.jobActivityEvents ?? []) !==
          JSON.stringify(nextEnvelope.jobActivityEvents ?? []) ||
        JSON.stringify(bundle.tasksEnvelope.exceptionRecords ?? []) !==
          JSON.stringify(nextEnvelope.exceptionRecords ?? []);

      const saved = changed ? await writeTasksEnvelope(nextEnvelope) : nextEnvelope;
      return {
        envelope: bundle.envelope,
        tasksEnvelope: saved,
        materials,
      };
    }),
  );

  const liveRawBundles = rawBundles.filter((bundle) =>
    shouldAppearOnLiveOwnerDesk(bundle.envelope.campaignId),
  );

  const assignCandidatesByCampaign = resolveAssignCandidatesByCampaign(
    liveRawBundles,
    assignments,
    studioUsers,
  );

  const provisionalView = resolveOwnerConsoleView(
    liveRawBundles,
    user,
    assignments,
    assignCandidatesByCampaign,
  );

  const waitingByCampaign = new Set(
    provisionalView.waitingOnOwner.map((card) => card.campaignId),
  );

  const recentlyResolvedByCampaign = new Set(
    liveRawBundles
      .filter((bundle) => bundleHasRecentlyResolvedForOwnerConsole(bundle))
      .map((bundle) => bundle.envelope.campaignId),
  );

  const bundles = liveRawBundles.filter((bundle) =>
    shouldIncludeCampaignInOwnerConsoleAggregate(
      bundle.envelope,
      waitingByCampaign.has(bundle.envelope.campaignId),
      recentlyResolvedByCampaign.has(bundle.envelope.campaignId),
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

  const controlRoomBundles = filterBundlesForControlRoom(liveRawBundles);
  const controlRoom = resolveOwnerControlRoomView(controlRoomBundles);

  return {
    kind: "ok",
    view,
    scan,
    controlRoom,
    refreshedAt: new Date().toISOString(),
  };
}
