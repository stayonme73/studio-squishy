import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomOfficeScene from "@/components/file-room/FileRoomOfficeScene";
import FileRoomProducerOfficeScene from "@/components/file-room/FileRoomProducerOfficeScene";
import {
  FileRoomForbiddenState,
  FileRoomNotFoundState,
} from "@/components/file-room/FileRoomStatePanels";
import FileRoomSectionCard from "@/components/file-room/FileRoomSectionCard";
import {
  isTeamOfficeRoleSlug,
  teamOfficeRoleLabels,
  teamOffices,
} from "@/config/team-offices";
import { listStudioUsers, toPublicUser } from "@/lib/auth/users";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { canEditKitchenWorkForTask, resolveKitchenWorkEditByTaskId } from "@/lib/campaign-production/access";
import { getOrInitializeProduction } from "@/lib/campaign-production/store";
import { resolveFileRoomTaskOperatorContext } from "@/lib/campaign-tasks/file-room-controls";
import { resolveTeamOfficeAccess } from "@/lib/campaign-tasks/office-access";
import {
  filterOfficeQueueTasks,
  filterQaOfficeQueueTasks,
  resolveOfficeContextRail,
  resolveOfficeSelectedTask,
  resolveProducerDispatchView,
} from "@/lib/campaign-tasks/office-view";
import { resolveFileRoomProductionTasksView } from "@/lib/campaign-tasks/tasks-view";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { loadFileRoomCampaign } from "@/lib/file-room/load-campaign";
import { resolveFileRoomCampaignView } from "@/lib/file-room-view";
import { resolveFileRoomMaterialsView } from "@/lib/materials/materials-view";
import { getOrInitializeMaterials } from "@/lib/materials/store";
import { resolveOpenExceptionCountByTaskId, resolveFileRoomExceptionsView } from "@/lib/campaign-tasks/exceptions-view";

type FileRoomOfficePageProps = {
  params: Promise<{ campaignId: string; role: string }>;
  searchParams: Promise<{ task?: string }>;
};

export default async function FileRoomOfficePage({ params, searchParams }: FileRoomOfficePageProps) {
  const { campaignId, role } = await params;
  const { task: deepLinkTaskId } = await searchParams;

  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  if (!isTeamOfficeRoleSlug(role)) {
    notFound();
  }

  const assignments = await readCampaignAssignments();
  const access = resolveTeamOfficeAccess(user, campaignId, role, assignments);

  if (access.kind === "invalid-role") {
    notFound();
  }

  const result = await loadFileRoomCampaign(user, campaignId);

  if (result.kind === "not-found") {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomNotFoundState />
      </>
    );
  }

  if (result.kind === "forbidden" || access.kind === "forbidden") {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomForbiddenState />
      </>
    );
  }

  if (access.kind === "not-built") {
    return (
      <>
        <FileRoomHeader user={user} campaignName={result.envelope.record.campaignName} />
        <FileRoomSectionCard title={teamOffices.notBuiltTitle}>
          <p className="fr-tasks-empty__body">{teamOffices.notBuiltBody}</p>
          <p className="fr-tasks-row__meta">
            {teamOfficeRoleLabels[role]} — not built in Kitchen V1.
          </p>
        </FileRoomSectionCard>
      </>
    );
  }

  const [materialsEnvelope, productionEnvelope, tasksEnvelope, studioUsers] = await Promise.all([
    getOrInitializeMaterials(campaignId, result.envelope.record),
    getOrInitializeProduction(campaignId, result.envelope.record),
    getOrGenerateTasks(campaignId, result.envelope.record),
    listStudioUsers(),
  ]);

  const publicUsers = studioUsers.map(toPublicUser);
  const operatorContext = resolveFileRoomTaskOperatorContext(
    user,
    campaignId,
    result.envelope,
    assignments,
    publicUsers,
  );

  const openExceptionCountByTaskId = resolveOpenExceptionCountByTaskId(
    tasksEnvelope.exceptionRecords,
  );

  const productionTasksView = resolveFileRoomProductionTasksView(tasksEnvelope, {
    user,
    assignments,
    openExceptionCountByTaskId,
  });

  const canEditWorkByTaskId = resolveKitchenWorkEditByTaskId(
    user,
    tasksEnvelope.tasks,
    assignments,
    campaignId,
    productionEnvelope,
  );

  const canEditForTask = (task: import("@/lib/campaign-tasks/types").CampaignTaskItem) =>
    canEditKitchenWorkForTask(user, task, assignments, campaignId, productionEnvelope);

  const materialsView = resolveFileRoomMaterialsView(materialsEnvelope);
  const exceptionsView = resolveFileRoomExceptionsView(
    tasksEnvelope.exceptionRecords,
    tasksEnvelope.tasks,
    { user, assignments, materials: materialsEnvelope.items, events: tasksEnvelope.exceptionEvents },
  );

  const campaignView = resolveFileRoomCampaignView(
    result.envelope,
    materialsView,
    productionTasksView,
    exceptionsView,
  );

  const contextRail = resolveOfficeContextRail(
    campaignView,
    productionEnvelope,
    tasksEnvelope,
    access.officeRole,
  );

  const header = (
    <FileRoomHeader
      user={user}
      campaignName={campaignView.campaignName}
      campaignId={campaignId}
      assignments={assignments}
    />
  );

  if (role === "producer_dispatcher") {
    const taskTitleById = Object.fromEntries(
      tasksEnvelope.tasks.map((task) => [task.id, task.title]),
    );
    const dispatch = resolveProducerDispatchView(
      productionTasksView,
      tasksEnvelope.handoffs ?? [],
      exceptionsView.openCount,
      taskTitleById,
    );

    const allDispatchTasks = dispatch.buckets.flatMap((bucket) => bucket.tasks);
    const selectedTask =
      allDispatchTasks.find((task) => task.id === deepLinkTaskId) ?? allDispatchTasks[0] ?? null;

    return (
      <>
        {header}
        <FileRoomProducerOfficeScene
          campaignId={campaignId}
          dispatch={dispatch}
          selectedTask={selectedTask}
          productionTasks={productionTasksView}
          operatorContext={operatorContext}
          productionEnvelope={productionEnvelope}
          studioUser={user}
          canEditWorkByTaskId={canEditWorkByTaskId}
        />
      </>
    );
  }

  const queue =
    role === "qa"
      ? filterQaOfficeQueueTasks(productionTasksView, {
          canEditForTask,
          deepLinkTaskId: deepLinkTaskId ?? null,
        })
      : filterOfficeQueueTasks(productionTasksView, access.officeRole, {
          userId: user.id,
          canEditForTask,
          deepLinkTaskId: deepLinkTaskId ?? null,
        });

  const selectedTask = resolveOfficeSelectedTask(queue, deepLinkTaskId ?? null);

  return (
    <>
      {header}
      <FileRoomOfficeScene
        campaignId={campaignId}
        officeSlug={role}
        queueTasks={queue.tasks}
        selectedTask={selectedTask}
        contextRail={contextRail}
        productionTasks={productionTasksView}
        operatorContext={operatorContext}
        productionEnvelope={productionEnvelope}
        studioUser={user}
        canEditWorkByTaskId={canEditWorkByTaskId}
        mode={role === "qa" ? "qa" : "production"}
      />
    </>
  );
}
