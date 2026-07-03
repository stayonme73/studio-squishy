import type { StudioUser } from "@/lib/campaign-store/types";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { canReadProductionTasks } from "@/lib/campaign-tasks/access";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";
import { mergeActivityEvents, deriveBaselineActivityEvents } from "@/lib/job-control/activity-log";
import { parseJobId } from "@/lib/job-control/lane-map";
import { resolveProductionWorkspaceView } from "@/lib/job-control/production-workspace-view";
import { syncJobRecordsFromCampaign } from "@/lib/job-control/resolve-jobs";
import { applyWaitingOnClientPolicies } from "@/lib/job-control/waiting-on-client";
import { loadFileRoomCampaign } from "@/lib/file-room/load-campaign";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";

export type LoadProductionWorkspaceResult =
  | { kind: "not-found" }
  | { kind: "forbidden" }
  | { kind: "job-not-found" }
  | {
      kind: "ok";
      view: ReturnType<typeof resolveProductionWorkspaceView>;
      isOwner: boolean;
    };

export async function loadProductionWorkspace(
  user: StudioUser,
  campaignId: string,
  jobId: string,
): Promise<LoadProductionWorkspaceResult> {
  const result = await loadFileRoomCampaign(user, campaignId);
  if (result.kind === "not-found") return { kind: "not-found" };
  if (result.kind === "forbidden") return { kind: "forbidden" };

  const assignments = await readCampaignAssignments();
  if (!canReadProductionTasks(user, campaignId, result.envelope, assignments)) {
    return { kind: "forbidden" };
  }

  const parsed = parseJobId(jobId);
  if (!parsed || parsed.campaignId !== campaignId) {
    return { kind: "job-not-found" };
  }

  const [tasksEnvelope, materialsEnvelope] = await Promise.all([
    getOrGenerateTasks(campaignId, result.envelope.record),
    getOrInitializeMaterials(campaignId, result.envelope.record),
  ]);

  const materials = materialsEnvelope.items;
  const tasks = tasksEnvelope.tasks ?? [];
  const exceptions = tasksEnvelope.exceptionRecords ?? [];

  const synced = syncJobRecordsFromCampaign(
    result.envelope.record,
    tasks,
    materials,
    exceptions,
    tasksEnvelope.jobRecords,
  );
  const jobs = applyWaitingOnClientPolicies(synced, materials);
  const job = jobs.find((entry) => entry.jobId === jobId);
  if (!job) {
    return { kind: "job-not-found" };
  }

  const listItem = resolveFileRoomListItemView(result.envelope);
  const laneViews = resolveProductionLaneViews([
    { campaignName: listItem.campaignName, job, tasks },
  ]);

  const activity = mergeActivityEvents(
    tasksEnvelope.jobActivityEvents,
    deriveBaselineActivityEvents(result.envelope.record, jobs, materials, tasksEnvelope.exceptionEvents),
  );

  const view = resolveProductionWorkspaceView({
    campaign: result.envelope.record,
    job,
    materials,
    activityEvents: activity,
    laneViews,
  });

  return {
    kind: "ok",
    view,
    isOwner: user.roles.includes("owner"),
  };
}
