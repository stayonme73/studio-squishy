import Link from "next/link";

import StudioKitchenAuditTrail from "@/components/studio-kitchen/StudioKitchenAuditTrail";
import StudioKitchenBucketBadge from "@/components/studio-kitchen/StudioKitchenBucketBadge";
import StudioKitchenDeliverablesCell from "@/components/studio-kitchen/StudioKitchenDeliverablesCell";
import StudioKitchenOwnerNotes from "@/components/studio-kitchen/StudioKitchenOwnerNotes";
import StudioKitchenPriorityBadge from "@/components/studio-kitchen/StudioKitchenPriorityBadge";
import {
  kitchenCampaignHref,
  kitchenFormatRevisionStatus,
  kitchenIsClientDelayed,
  kitchenStageTitle,
  studioKitchen,
  type KitchenCampaign,
} from "@/config/studio-kitchen";
import { formatKitchenDaysInStage, type KitchenCampaignWithBucket } from "@/lib/studio-kitchen-view";

type Props = {
  campaign: KitchenCampaignWithBucket;
  onClose: () => void;
};

export default function StudioKitchenCampaignDrawer({ campaign, onClose }: Props) {
  const { drawer, detail } = studioKitchen;
  const clientDelayed = kitchenIsClientDelayed(campaign);

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
              {campaign.campaignName}
            </h2>
            <p className="sk-drawer__sub">
              {campaign.folderNumber} · {campaign.clientName} · {kitchenStageTitle(campaign.currentStageId)}
            </p>
          </div>
          <button type="button" className="sk-drawer__close utility-btn utility-btn--secondary" onClick={onClose}>
            {drawer.closeLabel}
          </button>
        </header>

        <div className="sk-drawer__body">
          <div className="sk-drawer__meta">
            <StudioKitchenPriorityBadge priority={campaign.priority} />
            <StudioKitchenBucketBadge bucketId={campaign.bucketId} />
            {clientDelayed ? (
              <span className="sk-badge sk-badge--client-delayed">{studioKitchen.table.clientDelayedBadge}</span>
            ) : null}
          </div>

          <dl className="sk-drawer__facts">
            <div>
              <dt>{detail.nextActionLabel}</dt>
              <dd>{campaign.nextAction}</dd>
            </div>
            <div>
              <dt>{detail.waitingLabel}</dt>
              <dd>{campaign.waitingOn}</dd>
            </div>
            <div>
              <dt>{detail.revisionStatusLabel}</dt>
              <dd>{kitchenFormatRevisionStatus(campaign)}</dd>
            </div>
            <div>
              <dt>{detail.stageEnteredLabel}</dt>
              <dd>
                {campaign.stageEnteredAt.date}
                <br />
                {campaign.stageEnteredAt.time}
              </dd>
            </div>
            <div>
              <dt>{detail.daysLabel}</dt>
              <dd>{formatKitchenDaysInStage(campaign.daysInStage)}</dd>
            </div>
          </dl>

          <section className="sk-drawer__section" aria-labelledby="sk-drawer-deliverables">
            <h3 id="sk-drawer-deliverables" className="sk-drawer__section-title">
              {detail.deliverablesTitle}
            </h3>
            <StudioKitchenDeliverablesCell deliverables={campaign.deliverables} />
          </section>

          {campaign.ownerNotes.length > 0 ? (
            <StudioKitchenOwnerNotes notes={campaign.ownerNotes} />
          ) : null}

          <StudioKitchenAuditTrail
            events={campaign.auditTrail}
            title={drawer.auditTitle}
            id="sk-drawer-audit"
          />
        </div>

        <footer className="sk-drawer__foot">
          <Link
            href={kitchenCampaignHref(campaign.id)}
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
