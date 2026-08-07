import Link from "next/link";

import StudioKitchenFileBucketBadge from "@/components/studio-kitchen/StudioKitchenFileBucketBadge";
import { studioKitchenFoundation } from "@/config/studio-kitchen-foundation-v1";
import { studioKitchen } from "@/config/studio-kitchen";
import { kitchenFileBucketLabel } from "@/config/studio-kitchen-file-room";
import {
  kitchenDataSourceLabel,
  type KitchenLiveFolderSlot,
} from "@/lib/studio-kitchen";

type Props = {
  folder: KitchenLiveFolderSlot;
  onClose: () => void;
};

export default function StudioKitchenLiveDrawer({ folder, onClose }: Props) {
  const { drawer, detail } = studioKitchen;
  const bucketId = folder.placement.homeBucketId;
  const copy = studioKitchenFoundation.page;

  return (
    <div className="sk-drawer-root" role="presentation">
      <button type="button" className="sk-drawer-backdrop" aria-label={drawer.closeLabel} onClick={onClose} />
      <aside
        className="sk-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sk-drawer-title"
      >
        <header className="sk-drawer__head">
          <div>
            <p className="sk-drawer__eyebrow">{drawer.title}</p>
            <h2 id="sk-drawer-title" className="sk-drawer__title">
              {folder.campaignName}
            </h2>
            <p className="sk-drawer__sub">
              {folder.clientLabel} · {kitchenFileBucketLabel(bucketId)} ·{" "}
              {kitchenDataSourceLabel(folder.source)}
            </p>
          </div>
          <button type="button" className="sk-drawer__close utility-btn utility-btn--secondary" onClick={onClose}>
            {drawer.closeLabel}
          </button>
        </header>

        <div className="sk-drawer__body">
          <div className="sk-drawer__meta">
            <StudioKitchenFileBucketBadge bucketId={bucketId} />
            {folder.placement.folderLocation === "tray" ? (
              <span className="sk-badge sk-badge--client-delayed">{studioKitchen.table.clientDelayedBadge}</span>
            ) : null}
          </div>

          <p className="sk-drawer__moves" role="note">
            {copy.projectionNote}
          </p>

          <dl className="sk-drawer__facts">
            <div>
              <dt>{detail.nextActionLabel}</dt>
              <dd>{folder.nextActionLabel}</dd>
            </div>
            <div>
              <dt>{detail.waitingLabel}</dt>
              <dd>{folder.waitingOnLabel}</dd>
            </div>
            <div>
              <dt>Assigned / responsible</dt>
              <dd>{folder.assignedToLabel}</dd>
            </div>
            <div>
              <dt>Primary job status</dt>
              <dd>
                {folder.primaryJob
                  ? folder.primaryJob.spineStatusLabel
                  : copy.unavailableLabel}
              </dd>
            </div>
            <div>
              <dt>Tasks recorded</dt>
              <dd>
                {folder.honesty.tasksRecorded
                  ? `${folder.tasks.length} task(s)`
                  : copy.noTasksTitle}
              </dd>
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
              <dt>Due date</dt>
              <dd>{folder.dueLabel}</dd>
            </div>
          </dl>

          {folder.tasks.length > 0 ? (
            <section aria-label="Production tasks">
              <h3 className="sk-drawer__eyebrow">Tasks</h3>
              <ul>
                {folder.tasks.slice(0, 8).map((task) => (
                  <li key={task.id}>
                    {task.title} — {task.effectiveStatusLabel}
                    {task.claimedByDisplayName
                      ? ` · ${task.claimedByDisplayName}`
                      : task.responsibleRoleLabel
                        ? ` · ${task.responsibleRoleLabel} (unclaimed)`
                        : ""}
                    {task.blockedReason ? ` · blocked: ${task.blockedReason}` : ""}
                    {` · QA: ${task.qaState}`}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="sk-drawer__footer">
            <Link href={folder.fileRoomHref} className="utility-btn utility-btn--primary">
              {copy.openFileRoomLabel}
            </Link>
            <Link
              href={`/studio-kitchen/${encodeURIComponent(folder.campaignId)}${
                folder.source === "fixture_demo" ? "?demo=1" : ""
              }`}
              className="utility-btn utility-btn--secondary"
            >
              Open Kitchen detail
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
