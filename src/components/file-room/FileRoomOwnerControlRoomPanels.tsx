"use client";

import Link from "next/link";

import { productionWorkspaceRoute } from "@/config/production-workspace";
import { OWNER_CONTROL_ROOM_SECTION } from "@/config/job-control";
import { formatActivityKind } from "@/lib/job-control/activity-log";
import type { OwnerControlRoomView } from "@/lib/job-control/control-room-view";

import FileRoomSectionCard from "./FileRoomSectionCard";

type Props = {
  controlRoom: OwnerControlRoomView;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function reminderBadge(status: string): string | null {
  switch (status) {
    case "reminder_due":
      return OWNER_CONTROL_ROOM_SECTION.reminderDueLabel;
    case "move_to_tray_due":
      return OWNER_CONTROL_ROOM_SECTION.moveToTrayLabel;
    case "refund_eligible":
      return OWNER_CONTROL_ROOM_SECTION.refundEligibleLabel;
    default:
      return null;
  }
}

export default function FileRoomOwnerControlRoomPanels({ controlRoom }: Props) {
  const { ownerDesk, lanes, waitingOnClient, activity, jobCount } = controlRoom;

  return (
    <div className="fr-control-room">
      <header className="fr-control-room__header">
        <h2 className="fr-control-room__title">{OWNER_CONTROL_ROOM_SECTION.pageTitle}</h2>
        <p className="fr-header__meta">
          {OWNER_CONTROL_ROOM_SECTION.pageLead} · {jobCount} job{jobCount === 1 ? "" : "s"}
        </p>
      </header>

      <FileRoomSectionCard title={OWNER_CONTROL_ROOM_SECTION.ownerDeskTitle}>
        <p className="fr-control-room__section-lead">{OWNER_CONTROL_ROOM_SECTION.ownerDeskLead}</p>
        {ownerDesk.length === 0 ? (
          <p className="fr-tasks-empty__body">{OWNER_CONTROL_ROOM_SECTION.ownerDeskEmpty}</p>
        ) : (
          <ul className="fr-control-room-desk" aria-label="Owner Desk">
            {ownerDesk.map((item) => (
              <li key={item.id} className="fr-control-room-desk__item">
                <div className="fr-control-room-desk__head">
                  <span className="fr-control-room-desk__reason">{item.reasonLabel}</span>
                  <span className="fr-control-room-desk__meta">
                    {item.campaignName} · {item.serviceName}
                  </span>
                </div>
                <p className="fr-control-room-desk__title">{item.title}</p>
                <p className="fr-control-room-desk__detail">{item.detail}</p>
                <Link className="fr-back-link" href={item.drillDownHref}>
                  Open drill-down →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FileRoomSectionCard>

      <FileRoomSectionCard title={OWNER_CONTROL_ROOM_SECTION.lanesTitle}>
        <p className="fr-control-room__section-lead">{OWNER_CONTROL_ROOM_SECTION.lanesLead}</p>
        <div className="fr-control-room-lanes">
          {lanes.map((lane) => (
            <section key={lane.lane} className="fr-control-room-lane">
              <header className="fr-control-room-lane__head">
                <h3 className="fr-control-room-lane__title">{lane.label}</h3>
                <p className="fr-control-room-lane__capacity">
                  {OWNER_CONTROL_ROOM_SECTION.activeCountLabel} {lane.activeCount}/{lane.capacity}
                  {" · "}
                  {OWNER_CONTROL_ROOM_SECTION.availableSlotsLabel} {lane.availableSlots}
                </p>
              </header>

              <div className="fr-control-room-lane__section">
                <h4 className="fr-control-room-lane__subtitle">Active work</h4>
                {lane.activeJobs.length === 0 ? (
                  <p className="fr-tasks-empty__body">No active jobs.</p>
                ) : (
                  <ul className="fr-control-room-lane__list">
                    {lane.activeJobs.map((job) => (
                      <li key={job.jobId} className="fr-control-room-lane__job">
                        <span className="fr-control-room-lane__job-name">
                          {job.campaignName} — {job.serviceName}
                        </span>
                        <span className="fr-control-room-lane__job-status">
                          {OWNER_CONTROL_ROOM_SECTION.spineStatusLabels[job.spineStatus]}
                          {job.isPaused ? " (paused)" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="fr-control-room-lane__section">
                <h4 className="fr-control-room-lane__subtitle">
                  {OWNER_CONTROL_ROOM_SECTION.nextUpLabel}
                </h4>
                {lane.nextUpJobs.length === 0 ? (
                  <p className="fr-tasks-empty__body">Queue clear.</p>
                ) : (
                  <ul className="fr-control-room-lane__list">
                    {lane.nextUpJobs.map((job) => (
                      <li key={job.jobId} className="fr-control-room-lane__job">
                        <span className="fr-control-room-lane__job-name">
                          {job.campaignName} — {job.serviceName}
                        </span>
                        <Link
                          className="fr-back-link"
                          href={productionWorkspaceRoute(job.campaignId, job.jobId)}
                        >
                          Open workspace →
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </FileRoomSectionCard>

      <FileRoomSectionCard title={OWNER_CONTROL_ROOM_SECTION.waitingTrayTitle}>
        <p className="fr-control-room__section-lead">
          {OWNER_CONTROL_ROOM_SECTION.waitingTrayLead}
        </p>
        {waitingOnClient.length === 0 ? (
          <p className="fr-tasks-empty__body">No jobs waiting on client.</p>
        ) : (
          <ul className="fr-control-room-waiting" aria-label="Waiting on Client">
            {waitingOnClient.map((item) => {
              const badge = reminderBadge(item.reminderStatus);
              return (
                <li key={item.jobId} className="fr-control-room-waiting__item">
                  <div className="fr-control-room-waiting__head">
                    <span className="fr-control-room-waiting__campaign">{item.campaignName}</span>
                    <span className="fr-control-room-waiting__service">{item.serviceName}</span>
                  </div>
                  {badge ? (
                    <p className="fr-control-room-waiting__badge" role="status">
                      {badge}
                    </p>
                  ) : null}
                  <dl className="fr-control-room-waiting__fields">
                    <div>
                      <dt>{OWNER_CONTROL_ROOM_SECTION.missingItemsLabel}</dt>
                      <dd>{item.missingItems.join(", ") || "—"}</dd>
                    </div>
                    <div>
                      <dt>{OWNER_CONTROL_ROOM_SECTION.requestedLabel}</dt>
                      <dd>{formatWhen(item.requestedAt)}</dd>
                    </div>
                    <div>
                      <dt>{OWNER_CONTROL_ROOM_SECTION.lastResponseLabel}</dt>
                      <dd>
                        {item.lastClientResponseAt
                          ? formatWhen(item.lastClientResponseAt)
                          : "No response yet"}
                      </dd>
                    </div>
                    <div>
                      <dt>{OWNER_CONTROL_ROOM_SECTION.returnLaneLabel}</dt>
                      <dd>{OWNER_CONTROL_ROOM_SECTION.laneLabels[item.returnLane]}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </FileRoomSectionCard>

      <FileRoomSectionCard title={OWNER_CONTROL_ROOM_SECTION.activityTitle}>
        <p className="fr-control-room__section-lead">{OWNER_CONTROL_ROOM_SECTION.activityLead}</p>
        {activity.length === 0 ? (
          <p className="fr-tasks-empty__body">{OWNER_CONTROL_ROOM_SECTION.activityEmpty}</p>
        ) : (
          <ol className="fr-control-room-activity" aria-label="Activity timeline">
            {activity.slice(0, 40).map((event) => (
              <li key={event.id} className="fr-control-room-activity__item">
                <time className="fr-control-room-activity__when" dateTime={event.occurredAt}>
                  {formatWhen(event.occurredAt)}
                </time>
                <span className="fr-control-room-activity__kind">
                  {formatActivityKind(event.kind)}
                </span>
                <span className="fr-control-room-activity__actor">
                  {event.actor.displayName ?? event.actor.role}
                </span>
                <span className="fr-control-room-activity__job">{event.jobId}</span>
                {event.reason ? (
                  <p className="fr-control-room-activity__reason">{event.reason}</p>
                ) : null}
                {event.messageContent ? (
                  <p className="fr-control-room-activity__message">{event.messageContent}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </FileRoomSectionCard>
    </div>
  );
}
