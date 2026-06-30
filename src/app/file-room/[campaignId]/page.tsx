import { cookies } from "next/headers";

import FileRoomCampaignScene from "@/components/file-room/FileRoomCampaignScene";
import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import {
  FileRoomForbiddenState,
  FileRoomNotFoundState,
} from "@/components/file-room/FileRoomStatePanels";
import { listStudioUsers, toPublicUser } from "@/lib/auth/users";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { isInternalUser } from "@/lib/campaign-store/access";
import { resolveFileRoomTaskOperatorContext, resolveAssignCandidatesForException } from "@/lib/campaign-tasks/file-room-controls";
import { resolveFileRoomProductionTasksView } from "@/lib/campaign-tasks/tasks-view";
import {
  resolveFileRoomExceptionsView,
  resolveFileRoomExceptionOperatorContext,
  resolveOpenExceptionCountByTaskId,
} from "@/lib/campaign-tasks/exceptions-view";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { loadFileRoomCampaign } from "@/lib/file-room/load-campaign";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { resolveFileRoomCampaignView } from "@/lib/file-room-view";
import { canReviewMaterials } from "@/lib/materials/access";
import { resolveFileRoomMaterialsView } from "@/lib/materials/materials-view";
import { getOrInitializeMaterials } from "@/lib/materials/store";

type FileRoomCampaignPageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function FileRoomCampaignPage({ params }: FileRoomCampaignPageProps) {
  const { campaignId } = await params;
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  const result = await loadFileRoomCampaign(user, campaignId);

  if (result.kind === "not-found") {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomNotFoundState />
      </>
    );
  }

  if (result.kind === "forbidden") {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomForbiddenState />
      </>
    );
  }

  const materialsEnvelope = await getOrInitializeMaterials(
    campaignId,
    result.envelope.record,
  );
  const tasksEnvelope = await getOrGenerateTasks(campaignId, result.envelope.record);
  const [assignments, studioUsers] = await Promise.all([
    readCampaignAssignments(),
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
  const materialsView = resolveFileRoomMaterialsView(materialsEnvelope);
  const openExceptionCountByTaskId = resolveOpenExceptionCountByTaskId(
    tasksEnvelope.exceptionRecords,
  );
  const productionTasksView = resolveFileRoomProductionTasksView(tasksEnvelope, {
    user,
    assignments,
    openExceptionCountByTaskId,
  });
  const exceptionsView = resolveFileRoomExceptionsView(
    tasksEnvelope.exceptionRecords,
    tasksEnvelope.tasks,
    {
      user,
      assignments,
      materials: materialsEnvelope.items,
      events: tasksEnvelope.exceptionEvents,
    },
  );
  const view = resolveFileRoomCampaignView(
    result.envelope,
    materialsView,
    productionTasksView,
    exceptionsView,
  );
  const assignCandidates = resolveAssignCandidatesForException(
    campaignId,
    assignments,
    publicUsers,
  );
  const exceptionOperatorContext = resolveFileRoomExceptionOperatorContext(
    user,
    campaignId,
    assignments,
    assignCandidates,
  );
  const canReview = canReviewMaterials(user, campaignId, result.envelope, assignments);

  return (
    <>
      <FileRoomHeader user={user} campaignName={view.campaignName} />
      <FileRoomCampaignScene
        view={view}
        campaignId={campaignId}
        canReviewMaterials={canReview}
        operatorContext={operatorContext}
        exceptionOperatorContext={exceptionOperatorContext}
        showExceptions={isInternalUser(user)}
      />
    </>
  );
}
