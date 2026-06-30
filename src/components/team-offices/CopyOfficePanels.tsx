"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { teamOffices } from "@/config/team-offices";
import type { OfficeContextRailView, OfficeQueueTaskRow } from "@/lib/campaign-tasks/office-view";

import FileRoomSectionCard from "@/components/file-room/FileRoomSectionCard";

type OfficeQueuePanelProps = {
  campaignId: string;
  officeSlug: string;
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
  if (isEmpty) {
    return (
      <FileRoomSectionCard title={teamOffices.queueTitle}>
        <p className="fr-tasks-empty__body">{teamOffices.queueEmpty}</p>
      </FileRoomSectionCard>
    );
  }

  return (
    <FileRoomSectionCard title={teamOffices.queueTitle}>
      <ul className="fr-office-queue">
        {tasks.map((task) => {
          const isSelected = task.id === selectedTaskId;
          const href = `/file-room/${campaignId}/office/${officeSlug}?task=${encodeURIComponent(task.id)}`;
          return (
            <li key={task.id}>
              <Link
                className={`fr-office-queue__item${isSelected ? " fr-office-queue__item--selected" : ""}`}
                href={href}
              >
                <span className="fr-office-queue__title">{task.title}</span>
                <span className="fr-office-queue__meta">{task.statusLabel}</span>
                {task.isWrongRole ? (
                  <span className="fr-office-queue__badge">Other role</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </FileRoomSectionCard>
  );
}

type OfficeContextRailProps = {
  context: OfficeContextRailView;
  campaignId: string;
};

export function OfficeContextRail({ context, campaignId }: OfficeContextRailProps) {
  const router = useRouter();

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

        <div className="fr-scope-group">
          <p className="fr-scope-group__name">{teamOffices.strategyContextTitle}</p>
          {context.strategyContext.visible ? (
            <>
              <p className="fr-tasks-row__meta">{context.strategyContext.taskTitle}</p>
              {context.strategyContext.currentBody ? (
                <pre className="fr-production-work__readonly">{context.strategyContext.currentBody}</pre>
              ) : (
                <p className="fr-tasks-row__meta">{teamOffices.strategyContextEmpty}</p>
              )}
            </>
          ) : (
            <p className="fr-tasks-row__meta">{teamOffices.strategyContextEmpty}</p>
          )}
        </div>

        <div className="fr-scope-group">
          <p className="fr-scope-group__name">{teamOffices.downstreamTitle}</p>
          {context.downstreamStatus.visible ? (
            <p className="fr-tasks-row__meta">
              {context.downstreamStatus.taskTitle} · {context.downstreamStatus.statusLabel}
            </p>
          ) : (
            <p className="fr-tasks-row__meta">{teamOffices.downstreamEmpty}</p>
          )}
        </div>

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
