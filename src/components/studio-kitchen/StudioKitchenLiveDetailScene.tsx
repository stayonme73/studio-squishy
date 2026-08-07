import Link from "next/link";

import StudioKitchenCommsPanel from "@/components/studio-kitchen/StudioKitchenCommsPanel";
import StudioKitchenHeader from "@/components/studio-kitchen/StudioKitchenHeader";
import { studioKitchenFoundation } from "@/config/studio-kitchen-foundation-v1";
import { studioKitchen } from "@/config/studio-kitchen";
import { kitchenFileBucketLabel } from "@/config/studio-kitchen-file-room";
import {
  kitchenDataSourceLabel,
  type KitchenProjectionDetail,
} from "@/lib/studio-kitchen";
import type { KitchenCommsLedger } from "@/lib/studio-kitchen-comms";

type Props = {
  detail: KitchenProjectionDetail;
  ledger: KitchenCommsLedger | null;
};

export default function StudioKitchenLiveDetailScene({ detail, ledger }: Props) {
  const copy = studioKitchenFoundation.page;

  if (detail.kind === "unavailable") {
    return (
      <div className="sk-page utility-page" aria-label="Campaign unavailable">
        <StudioKitchenHeader
          backHref={studioKitchen.route}
          backLabel={studioKitchen.page.dashboardBackLabel}
        />
        <div className="sk-not-found utility-card">
          <h2 className="sk-not-found__title">{copy.unknownCampaignTitle}</h2>
          <p className="sk-not-found__lead">
            {copy.unknownCampaignBody} ({detail.reason})
          </p>
          <Link href={studioKitchen.route} className="utility-btn utility-btn--primary">
            Back to Kitchen
          </Link>
        </div>
      </div>
    );
  }

  const { folder } = detail;

  return (
    <div
      className="sk-page utility-page"
      aria-label={`${folder.campaignName} — Studio Kitchen`}
      data-kitchen-source={folder.source}
    >
      <StudioKitchenHeader
        title={folder.campaignName}
        backHref={
          folder.source === "fixture_demo"
            ? `${studioKitchen.route}?demo=1`
            : studioKitchen.route
        }
        backLabel={studioKitchen.page.dashboardBackLabel}
        lead={`${folder.clientLabel} · ${kitchenFileBucketLabel(folder.placement.homeBucketId)} · ${folder.nextActionLabel}`}
        aside={
          <p className="sk-intro__phase" role="note">
            {kitchenDataSourceLabel(folder.source)}
          </p>
        }
      />

      <div className="sk-detail">
        <section className="utility-card" aria-labelledby="sk-live-status">
          <h2 id="sk-live-status">Production status</h2>
          <p>{copy.projectionNote}</p>
          <dl className="sk-drawer__facts">
            <div>
              <dt>Campaign status</dt>
              <dd>{folder.campaignStatusLabel}</dd>
            </div>
            <div>
              <dt>Primary job</dt>
              <dd>
                {folder.primaryJob
                  ? `${folder.primaryJob.serviceName} — ${folder.primaryJob.spineStatusLabel}`
                  : copy.noJobsBody}
              </dd>
            </div>
            <div>
              <dt>Assigned / responsible</dt>
              <dd>{folder.assignedToLabel}</dd>
            </div>
            <div>
              <dt>Waiting on</dt>
              <dd>{folder.waitingOnLabel}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{folder.dueLabel}</dd>
            </div>
            <div>
              <dt>Open exceptions</dt>
              <dd>{folder.openExceptionCount}</dd>
            </div>
            <div>
              <dt>Blocking materials</dt>
              <dd>
                {folder.honesty.materialsRecorded
                  ? folder.blockingMaterialCount
                  : copy.unavailableLabel}
              </dd>
            </div>
            <div>
              <dt>Pending outbox</dt>
              <dd>{folder.pendingOutboxCount}</dd>
            </div>
          </dl>
        </section>

        <section className="utility-card" aria-labelledby="sk-live-jobs">
          <h2 id="sk-live-jobs">Jobs</h2>
          {folder.jobs.length === 0 ? (
            <p>{copy.noJobsBody}</p>
          ) : (
            <ul>
              {folder.jobs.map((job) => (
                <li key={job.jobId}>
                  {job.serviceName} ({job.skuId}) — {job.spineStatusLabel}
                  {job.lane ? ` · lane ${job.lane}` : ""}
                  {job.ownerApprovalPending
                    ? ` · owner gate: ${job.ownerApprovalPending}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="utility-card" aria-labelledby="sk-live-tasks">
          <h2 id="sk-live-tasks">Tasks</h2>
          {!folder.honesty.tasksRecorded ? (
            <p>{copy.noTasksBody}</p>
          ) : folder.tasks.length === 0 ? (
            <p>{copy.noTasksTitle}</p>
          ) : (
            <ul>
              {folder.tasks.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong> — {task.effectiveStatusLabel}
                  {task.responsibleRoleLabel
                    ? ` · ${task.responsibleRoleLabel}`
                    : ""}
                  {task.claimedByDisplayName
                    ? ` · claimed by ${task.claimedByDisplayName}`
                    : " · unclaimed"}
                  {task.blockedReason ? ` · blocked: ${task.blockedReason}` : ""}
                  {` · QA: ${task.qaState}`}
                  {task.latestHandoffSummary
                    ? ` · handoff: ${task.latestHandoffSummary}`
                    : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        {ledger && folder.source === "live_production" ? (
          <StudioKitchenCommsPanel ledger={ledger} />
        ) : null}

        <p>
          <Link href={folder.fileRoomHref} className="utility-btn utility-btn--primary">
            {copy.openFileRoomLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
