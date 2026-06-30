import Link from "next/link";

import FileRoomProductionTasksSection from "@/components/file-room/FileRoomProductionTasksSection";
import FileRoomSectionCard from "@/components/file-room/FileRoomSectionCard";
import {
  teamOfficeRoleLabels,
  teamOffices,
} from "@/config/team-offices";
import type { FileRoomTaskOperatorContext } from "@/lib/campaign-tasks/file-room-controls-types";
import type {
  OfficeQueueTaskRow,
  ProducerDispatchView,
} from "@/lib/campaign-tasks/office-view";
import type { FileRoomProductionTasksView } from "@/lib/campaign-tasks/tasks-view";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import type { StudioUser } from "@/lib/campaign-store/types";

type FileRoomProducerOfficeSceneProps = {
  campaignId: string;
  dispatch: ProducerDispatchView;
  selectedTask: OfficeQueueTaskRow | null;
  productionTasks: FileRoomProductionTasksView;
  operatorContext: FileRoomTaskOperatorContext;
  productionEnvelope: ServerProductionEnvelope;
  studioUser: StudioUser;
  canEditWorkByTaskId: Readonly<Record<string, boolean>>;
};

export default function FileRoomProducerOfficeScene({
  campaignId,
  dispatch,
  selectedTask,
  productionTasks,
  operatorContext,
  productionEnvelope,
  studioUser,
  canEditWorkByTaskId,
}: FileRoomProducerOfficeSceneProps) {
  const officeLabel = teamOfficeRoleLabels.producer_dispatcher;

  return (
    <>
      <Link className="fr-back-link" href={`/file-room/${campaignId}`}>
        ← {teamOffices.backToCampaignLabel}
      </Link>

      <header className="fr-office-header">
        <h2 className="fr-office-header__title">{officeLabel} Office</h2>
        <p className="fr-header__meta">{teamOffices.officeLeads.producer_dispatcher}</p>
      </header>

      <div className="fr-office-grid">
        <div className="fr-office-grid__queue">
          <FileRoomSectionCard title={teamOffices.producerDispatchTitle}>
            {dispatch.isEmpty ? (
              <p className="fr-tasks-empty__body">{teamOffices.producerDispatchEmpty}</p>
            ) : (
              <>
                {dispatch.openExceptionCount > 0 ? (
                  <div className="fr-scope-group">
                    <p className="fr-scope-group__name">{teamOffices.producerExceptionsTitle}</p>
                    <p className="fr-tasks-row__meta">
                      {dispatch.openExceptionCount} open exception
                      {dispatch.openExceptionCount === 1 ? "" : "s"}
                    </p>
                  </div>
                ) : null}

                {dispatch.buckets.map((bucket) => (
                  <div key={bucket.key} className="fr-scope-group">
                    <p className="fr-scope-group__name">
                      {bucket.title} ({bucket.tasks.length})
                    </p>
                    <ul className="fr-office-queue">
                      {bucket.tasks.map((task) => {
                        const isSelected = task.id === selectedTask?.id;
                        const href = `/file-room/${campaignId}/office/producer_dispatcher?task=${encodeURIComponent(task.id)}`;
                        return (
                          <li key={task.id}>
                            <Link
                              className={`fr-office-queue__item${isSelected ? " fr-office-queue__item--selected" : ""}`}
                              href={href}
                            >
                              <span className="fr-office-queue__title">{task.title}</span>
                              <span className="fr-office-queue__meta">{task.statusLabel}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                <div className="fr-scope-group">
                  <p className="fr-scope-group__name">{teamOffices.producerHandoffFeedTitle}</p>
                  {dispatch.recentHandoffs.length > 0 ? (
                    <ul className="fr-kv-list">
                      {dispatch.recentHandoffs.map((entry) => (
                        <li key={entry.id} className="fr-kv-list__row">
                          <span className="fr-kv-list__label">{entry.taskTitle}</span>
                          <p className="fr-kv-list__value">
                            {entry.fromRole} → {entry.toRole} · {entry.summary}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fr-tasks-row__meta">{teamOffices.producerHandoffFeedEmpty}</p>
                  )}
                </div>
              </>
            )}
          </FileRoomSectionCard>
        </div>

        <div className="fr-office-grid__work">
          {selectedTask ? (
            <FileRoomProductionTasksSection
              campaignId={campaignId}
              productionTasks={productionTasks}
              operatorContext={operatorContext}
              showExceptionBadges
              productionEnvelope={productionEnvelope}
              studioUser={studioUser}
              canEditWorkByTaskId={canEditWorkByTaskId}
              officeMode={{
                readOnly: true,
                hideQaActions: true,
                hideReassign: false,
                allowHandoffDespiteReadOnly: true,
                singleTask: selectedTask,
              }}
            />
          ) : (
            <FileRoomSectionCard title={teamOffices.activeWorkTitle}>
              <p className="fr-tasks-empty__body">{teamOffices.producerDispatchEmpty}</p>
            </FileRoomSectionCard>
          )}
        </div>
      </div>
    </>
  );
}
