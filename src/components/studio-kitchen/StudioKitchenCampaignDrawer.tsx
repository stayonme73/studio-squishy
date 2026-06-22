import Link from "next/link";

import StudioKitchenAuditTrail from "@/components/studio-kitchen/StudioKitchenAuditTrail";
import StudioKitchenDeliverablesCell from "@/components/studio-kitchen/StudioKitchenDeliverablesCell";
import StudioKitchenFileBucketBadge from "@/components/studio-kitchen/StudioKitchenFileBucketBadge";
import StudioKitchenFolderActions from "@/components/studio-kitchen/StudioKitchenFolderActions";
import StudioKitchenOwnerNotes from "@/components/studio-kitchen/StudioKitchenOwnerNotes";
import StudioKitchenPriorityBadge from "@/components/studio-kitchen/StudioKitchenPriorityBadge";
import {
  kitchenCampaignHref,
  kitchenFormatRevisionStatus,
  studioKitchen,
} from "@/config/studio-kitchen";
import { kitchenBucketMoveToLabel, kitchenFileBucketLabel } from "@/config/studio-kitchen-file-room";
import { formatKitchenDaysInStage } from "@/lib/studio-kitchen-view";
import type { KitchenFolderView } from "@/lib/studio-kitchen-file-room-view";

type Props = {
  folder: KitchenFolderView;
  onClose: () => void;
};

export default function StudioKitchenCampaignDrawer({ folder, onClose }: Props) {
  const { drawer, detail, fileRoom } = studioKitchen;
  const bucketId = folder.placement.homeBucketId;
  const movesTo = kitchenBucketMoveToLabel(bucketId);

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
              {folder.folderNumber} · {folder.clientName} · {kitchenFileBucketLabel(bucketId)}
            </p>
          </div>
          <button type="button" className="sk-drawer__close utility-btn utility-btn--secondary" onClick={onClose}>
            {drawer.closeLabel}
          </button>
        </header>

        <div className="sk-drawer__body">
          <div className="sk-drawer__meta">
            <StudioKitchenPriorityBadge priority={folder.priority} />
            <StudioKitchenFileBucketBadge bucketId={bucketId} />
            {folder.placement.folderLocation === "tray" ? (
              <span className="sk-badge sk-badge--client-delayed">{studioKitchen.table.clientDelayedBadge}</span>
            ) : null}
            {folder.showReturnedToQueue ? (
              <span className="sk-folder__returned sk-folder__returned--inline">{fileRoom.returnedToQueueLabel}</span>
            ) : null}
          </div>

          {movesTo ? (
            <p className="sk-drawer__moves">
              {fileRoom.movesToLabel} <strong>{movesTo}</strong>
            </p>
          ) : null}

          <StudioKitchenFolderActions bucketId={bucketId} />

          <dl className="sk-drawer__facts">
            <div>
              <dt>{detail.nextActionLabel}</dt>
              <dd>{folder.nextAction}</dd>
            </div>
            <div>
              <dt>{detail.waitingLabel}</dt>
              <dd>{folder.waitingOn}</dd>
            </div>
            <div>
              <dt>{detail.revisionStatusLabel}</dt>
              <dd>{kitchenFormatRevisionStatus(folder)}</dd>
            </div>
            <div>
              <dt>{detail.daysLabel}</dt>
              <dd>{formatKitchenDaysInStage(folder.daysInStage)}</dd>
            </div>
          </dl>

          <section className="sk-drawer__section" aria-labelledby="sk-drawer-deliverables">
            <h3 id="sk-drawer-deliverables" className="sk-drawer__section-title">
              {detail.deliverablesTitle}
            </h3>
            <StudioKitchenDeliverablesCell deliverables={folder.deliverables} />
          </section>

          {folder.ownerNotes.length > 0 ? <StudioKitchenOwnerNotes notes={folder.ownerNotes} /> : null}

          <StudioKitchenAuditTrail events={folder.auditTrail} title={drawer.auditTitle} id="sk-drawer-audit" />
        </div>

        <footer className="sk-drawer__foot">
          <Link
            href={kitchenCampaignHref(folder.id)}
            className="utility-btn utility-btn--primary sk-drawer__full-link"
            onClick={onClose}
          >
            {detail.drawerFullViewLabel}
          </Link>
        </footer>
      </aside>
    </div>
  );
}
