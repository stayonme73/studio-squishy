import Link from "next/link";

import FileRoomProductionTasksSection from "@/components/file-room/FileRoomProductionTasksSection";
import FileRoomSectionCard from "@/components/file-room/FileRoomSectionCard";
import { OfficeContextRail, OfficeQueuePanel } from "@/components/team-offices/TeamOfficePanels";
import {
  teamOfficeRoleLabels,
  teamOffices,
  type TeamOfficeRoleSlug,
} from "@/config/team-offices";
import type { FileRoomTaskOperatorContext } from "@/lib/campaign-tasks/file-room-controls-types";
import type { OfficeContextRailView, OfficeQueueTaskRow } from "@/lib/campaign-tasks/office-view";
import type { FileRoomProductionTasksView } from "@/lib/campaign-tasks/tasks-view";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { TeamOfficeWorkPacketView } from "@/lib/job-control/work-packets";

import FileRoomWorkPacketPanel from "./FileRoomWorkPacketPanel";

type FileRoomOfficeSceneProps = {
  campaignId: string;
  officeSlug: TeamOfficeRoleSlug;
  queueTasks: readonly OfficeQueueTaskRow[];
  selectedTask: OfficeQueueTaskRow | null;
  contextRail: OfficeContextRailView;
  productionTasks: FileRoomProductionTasksView;
  operatorContext: FileRoomTaskOperatorContext;
  productionEnvelope: ServerProductionEnvelope;
  studioUser: StudioUser;
  canEditWorkByTaskId: Readonly<Record<string, boolean>>;
  workPacket: TeamOfficeWorkPacketView | null;
  mode?: "production" | "qa";
};

export default function FileRoomOfficeScene({
  campaignId,
  officeSlug,
  queueTasks,
  selectedTask,
  contextRail,
  productionTasks,
  operatorContext,
  productionEnvelope,
  studioUser,
  canEditWorkByTaskId,
  workPacket,
  mode = "production",
}: FileRoomOfficeSceneProps) {
  const officeLabel = teamOfficeRoleLabels[officeSlug];
  const isQaMode = mode === "qa";

  return (
    <>
      <Link className="fr-back-link" href={`/file-room/${campaignId}`}>
        ← {teamOffices.backToCampaignLabel}
      </Link>

      <header className="fr-office-header">
        <h2 className="fr-office-header__title">{officeLabel} Office</h2>
        <p className="fr-header__meta">{teamOffices.officeLeads[officeSlug]}</p>
      </header>

      <div className="fr-office-grid">
        <div className="fr-office-grid__queue">
          <OfficeQueuePanel
            campaignId={campaignId}
            officeSlug={officeSlug}
            tasks={queueTasks}
            selectedTaskId={selectedTask?.id ?? null}
            isEmpty={queueTasks.length === 0}
          />
        </div>

        <div className="fr-office-grid__work">
          {selectedTask ? (
            <>
              <FileRoomWorkPacketPanel packet={workPacket} />
              <FileRoomProductionTasksSection
                campaignId={campaignId}
                productionTasks={productionTasks}
                operatorContext={operatorContext}
                showExceptionBadges={false}
                productionEnvelope={productionEnvelope}
                studioUser={studioUser}
                canEditWorkByTaskId={canEditWorkByTaskId}
                officeMode={{
                  readOnly: isQaMode ? true : selectedTask.isReadOnly,
                  hideQaActions: !isQaMode,
                  hideReassign: true,
                  submitLabel: "Submit to QA",
                  singleTask: selectedTask,
                }}
              />
            </>
          ) : (
            <FileRoomSectionCard title={teamOffices.activeWorkTitle}>
              <p className="fr-tasks-empty__body">{teamOffices.queueEmpty[officeSlug]}</p>
            </FileRoomSectionCard>
          )}
        </div>

        {!isQaMode ? <OfficeContextRail context={contextRail} campaignId={campaignId} /> : null}
      </div>
    </>
  );
}
