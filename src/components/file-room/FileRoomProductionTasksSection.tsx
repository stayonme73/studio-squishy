import { campaignTasksConfig, taskStatusLabel } from "@/config/campaign-tasks";
import type { FileRoomProductionTasksView } from "@/lib/campaign-tasks/tasks-view";

import FileRoomSectionCard from "./FileRoomSectionCard";

type FileRoomProductionTasksSectionProps = {
  productionTasks: FileRoomProductionTasksView;
};

export default function FileRoomProductionTasksSection({
  productionTasks,
}: FileRoomProductionTasksSectionProps) {
  if (productionTasks.isEmpty) {
    return (
      <FileRoomSectionCard title={campaignTasksConfig.sectionTitle}>
        <p className="fr-tasks-empty__title">{campaignTasksConfig.emptyTitle}</p>
        <p className="fr-tasks-empty__body">{campaignTasksConfig.emptyBody}</p>
      </FileRoomSectionCard>
    );
  }

  return (
    <FileRoomSectionCard title={campaignTasksConfig.sectionTitle}>
      <p className="fr-tasks-lead">{campaignTasksConfig.sectionLead}</p>

      <ul className="fr-tasks-summary" aria-label="Task status summary">
        <li>
          <span className="fr-tasks-summary__label">Ready</span>
          <span className="fr-tasks-summary__value">{productionTasks.readyCount}</span>
        </li>
        <li>
          <span className="fr-tasks-summary__label">Blocked</span>
          <span className="fr-tasks-summary__value">{productionTasks.blockedCount}</span>
        </li>
        <li>
          <span className="fr-tasks-summary__label">Not ready</span>
          <span className="fr-tasks-summary__value">{productionTasks.notReadyCount}</span>
        </li>
      </ul>

      {productionTasks.groups.map((group) => (
        <div key={`${group.familyId}-${group.serviceName}`} className="fr-scope-group">
          <p className="fr-scope-group__name">
            {group.serviceName}
            <span className="fr-tasks-family-label"> · {group.familyLabel}</span>
          </p>
          <ul className="fr-tasks-list">
            {group.tasks.map((task) => (
              <li
                key={task.id}
                className={`fr-tasks-row fr-tasks-row--${task.status}`}
              >
                <div className="fr-tasks-row__head">
                  <span className="fr-tasks-row__title">{task.title}</span>
                  <span
                    className={`fr-tasks-row__status${task.status === "blocked" ? " fr-tasks-row__status--blocked" : ""}`}
                  >
                    {taskStatusLabel(task.status)}
                  </span>
                </div>
                <p className="fr-tasks-row__meta">
                  {task.phaseLabel}
                  {task.cycleLabel ? ` · ${task.cycleLabel}` : ""}
                  {task.dependsOnCount > 0 ? ` · ${task.dependsOnCount} dependency` : ""}
                </p>
                {task.blockedReason ? (
                  <p className="fr-tasks-row__block-reason">{task.blockedReason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </FileRoomSectionCard>
  );
}
