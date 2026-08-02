"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  teamOffices,
  type TeamOfficeRoleSlug,
} from "@/config/team-offices";
import type { OfficeContextRailView, OfficeQueueTaskRow } from "@/lib/campaign-tasks/office-view";
import { resolveFileRoomTaskOwnershipPresentation } from "@/lib/campaign-tasks/task-ownership-presentation";

import FileRoomSectionCard from "@/components/file-room/FileRoomSectionCard";

type OfficeQueuePanelProps = {
  campaignId: string;
  officeSlug: TeamOfficeRoleSlug;
  tasks: readonly OfficeQueueTaskRow[];
  selectedTaskId: string | null;
  isEmpty: boolean;
};

export function OfficeQueuePanel({
  campaignId,
  officeSlug,
  tasks,
  selectedTaskId,
  isEmpty,
}: OfficeQueuePanelProps) {
  const title = teamOffices.queueTitles[officeSlug];
  const emptyBody = teamOffices.queueEmpty[officeSlug];

  if (isEmpty) {
    return (
      <FileRoomSectionCard title={title}>
        <p className="fr-tasks-empty__body">{emptyBody}</p>
      </FileRoomSectionCard>
    );
  }

  const isQaOffice = officeSlug === "qa";
  const primaryTasks = isQaOffice
    ? tasks.filter((task) => task.queueTier !== "secondary")
    : tasks;
  const secondaryTasks = isQaOffice
    ? tasks.filter((task) => task.queueTier === "secondary")
    : [];

  const renderQueueItems = (queueTasks: readonly OfficeQueueTaskRow[]) =>
    queueTasks.map((task) => {
      const isSelected = task.id === selectedTaskId;
      const href = `/file-room/${campaignId}/office/${officeSlug}?task=${encodeURIComponent(task.id)}`;
      const isSecondary = task.queueTier === "secondary";
      const ownership = resolveFileRoomTaskOwnershipPresentation({
        responsibleRole: task.responsibleRole,
        claimedByDisplayName: task.claimedByDisplayName,
      });
      return (
        <li key={task.id}>
          <Link
            className={`fr-office-queue__item${isSelected ? " fr-office-queue__item--selected" : ""}${isSecondary ? " fr-office-queue__item--secondary" : ""}`}
            href={href}
          >
            <span className="fr-office-queue__title">{task.title}</span>
            <span className="fr-office-queue__meta">{task.statusLabel}</span>
            <span
              className="fr-office-queue__meta fr-office-queue__ownership"
              data-fr-task-ownership={ownership.claimStatus}
            >
              <span data-fr-task-responsible-role>{ownership.responsibleRoleLine}</span>
              {" · "}
              <span data-fr-task-claim-status>{ownership.claimLine}</span>
            </span>
            {task.isWrongRole ? (
              <span className="fr-office-queue__badge">Other role</span>
            ) : null}
          </Link>
        </li>
      );
    });

  return (
    <FileRoomSectionCard title={title}>
      {isQaOffice && primaryTasks.length > 0 ? (
        <div className="fr-office-queue-section">
          <p className="fr-office-queue-section__title">{teamOffices.qaQueuePrimaryTitle}</p>
          <ul className="fr-office-queue">{renderQueueItems(primaryTasks)}</ul>
        </div>
      ) : null}

      {isQaOffice && secondaryTasks.length > 0 ? (
        <div className="fr-office-queue-section fr-office-queue-section--secondary">
          <p className="fr-office-queue-section__title">{teamOffices.qaQueueSecondaryTitle}</p>
          <ul className="fr-office-queue fr-office-queue--secondary">
            {renderQueueItems(secondaryTasks)}
          </ul>
        </div>
      ) : null}

      {!isQaOffice ? <ul className="fr-office-queue">{renderQueueItems(tasks)}</ul> : null}

      {isQaOffice && primaryTasks.length === 0 && secondaryTasks.length === 0 ? (
        <p className="fr-tasks-empty__body">{emptyBody}</p>
      ) : null}
    </FileRoomSectionCard>
  );
}

type OfficeContextRailProps = {
  context: OfficeContextRailView;
  campaignId: string;
};

function ReadonlyBody({ body, emptyLabel }: { body: string; emptyLabel: string }) {
  if (body) {
    return <pre className="fr-production-work__readonly">{body}</pre>;
  }
  return <p className="fr-tasks-row__meta">{emptyLabel}</p>;
}

export function OfficeContextRail({ context, campaignId }: OfficeContextRailProps) {
  const router = useRouter();
  const role = context.officeRole;

  const showDiscovery = role === "strategy";
  const showStrategyContext = role === "copy" || role === "creative_production";
  const showCopyContext = role === "creative_production";
  const showDownstream = role === "strategy" || role === "copy";

  return (
    <aside className="fr-office-rail" aria-label={teamOffices.contextRailTitle}>
      <FileRoomSectionCard title={teamOffices.contextRailTitle}>
        <ul className="fr-kv-list">
          <li className="fr-kv-list__row">
            <span className="fr-kv-list__label">Campaign</span>
            <p className="fr-kv-list__value">{context.campaignName}</p>
          </li>
          <li className="fr-kv-list__row">
            <span className="fr-kv-list__label">Materials</span>
            <p className="fr-kv-list__value">{context.materialsCount} on file</p>
          </li>
        </ul>

        {context.planIncludes.length > 0 ? (
          <div className="fr-scope-group">
            <p className="fr-scope-group__name">Approved Studio Plan</p>
            <ul className="fr-scope-group__list">
              {context.planIncludes.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {context.deliverableScope.length > 0 ? (
          <div className="fr-scope-group">
            <p className="fr-scope-group__name">Deliverable scope</p>
            {context.deliverableScope.map((group) => (
              <div key={group.serviceName}>
                <p className="fr-tasks-row__meta">{group.serviceName}</p>
                <ul className="fr-scope-group__list">
                  {group.deliverables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {showDiscovery ? (
          <div className="fr-scope-group">
            <p className="fr-scope-group__name">{teamOffices.discoverySnippetTitle}</p>
            {context.discoverySnippet.length > 0 ? (
              <ul className="fr-kv-list">
                {context.discoverySnippet.map((item) => (
                  <li key={item.label} className="fr-kv-list__row">
                    <span className="fr-kv-list__label">{item.label}</span>
                    <p className="fr-kv-list__value">{item.value}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fr-tasks-row__meta">{teamOffices.discoverySnippetEmpty}</p>
            )}
          </div>
        ) : null}

        {showStrategyContext ? (
          <div className="fr-scope-group">
            <p className="fr-scope-group__name">{teamOffices.strategyContextTitle}</p>
            {context.strategyContext.visible ? (
              <>
                <p className="fr-tasks-row__meta">{context.strategyContext.taskTitle}</p>
                <ReadonlyBody
                  body={context.strategyContext.currentBody}
                  emptyLabel={teamOffices.strategyContextEmpty}
                />
              </>
            ) : (
              <p className="fr-tasks-row__meta">{teamOffices.strategyContextEmpty}</p>
            )}
          </div>
        ) : null}

        {showCopyContext ? (
          <div className="fr-scope-group">
            <p className="fr-scope-group__name">{teamOffices.copyContextTitle}</p>
            {context.copyContext.visible ? (
              <>
                <p className="fr-tasks-row__meta">{context.copyContext.taskTitle}</p>
                <ReadonlyBody
                  body={context.copyContext.currentBody}
                  emptyLabel={teamOffices.copyContextEmpty}
                />
              </>
            ) : (
              <p className="fr-tasks-row__meta">{teamOffices.copyContextEmpty}</p>
            )}
          </div>
        ) : null}

        {showDownstream ? (
          <div className="fr-scope-group">
            <p className="fr-scope-group__name">{teamOffices.downstreamTitle}</p>
            {context.downstreamStatus.visible ? (
              <p className="fr-tasks-row__meta">
                {context.downstreamStatus.taskTitle} · {context.downstreamStatus.statusLabel}
              </p>
            ) : (
              <p className="fr-tasks-row__meta">
                {role === "strategy"
                  ? teamOffices.downstreamCopyEmpty
                  : teamOffices.downstreamCreativeEmpty}
              </p>
            )}
          </div>
        ) : null}

        <p className="fr-tasks-row__meta">
          <button
            type="button"
            className="fr-back-link"
            onClick={() => router.push(`/file-room/${campaignId}`)}
          >
            {teamOffices.backToCampaignLabel}
          </button>
        </p>
      </FileRoomSectionCard>
    </aside>
  );
}
