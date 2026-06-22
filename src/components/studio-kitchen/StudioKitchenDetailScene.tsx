"use client";

import Link from "next/link";
import { useMemo } from "react";

import StudioKitchenAuditTrail from "@/components/studio-kitchen/StudioKitchenAuditTrail";
import StudioKitchenHeader from "@/components/studio-kitchen/StudioKitchenHeader";
import StudioKitchenOwnerNotes from "@/components/studio-kitchen/StudioKitchenOwnerNotes";
import StudioKitchenWorkflowTimeline, {
  StudioKitchenCampaignMeta,
} from "@/components/studio-kitchen/StudioKitchenWorkflowTimeline";
import { kitchenStageTitle, studioKitchen } from "@/config/studio-kitchen";
import { kitchenFileBucketLabel } from "@/config/studio-kitchen-file-room";
import { getKitchenFolder } from "@/lib/studio-kitchen-file-room-view";
import { buildKitchenDetailView } from "@/lib/studio-kitchen-view";

type Props = {
  campaignId: string;
};

/** Studio Kitchen V3 — single campaign workflow detail. */
export default function StudioKitchenDetailScene({ campaignId }: Props) {
  const folder = useMemo(() => getKitchenFolder(campaignId), [campaignId]);
  const view = useMemo(() => (folder ? buildKitchenDetailView(folder) : null), [folder]);

  if (!folder || !view) {
    return (
      <div className="sk-page utility-page" aria-label="Campaign not found">
        <StudioKitchenHeader
          backHref={studioKitchen.route}
          backLabel={studioKitchen.page.dashboardBackLabel}
        />
        <div className="sk-not-found utility-card">
          <h2 className="sk-not-found__title">Campaign not found</h2>
          <p className="sk-not-found__lead">That campaign is not in the Kitchen yet.</p>
          <Link href={studioKitchen.route} className="utility-btn utility-btn--primary">
            Back to all campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sk-page utility-page" aria-label={`${folder.campaignName} — Studio Kitchen`}>
      <StudioKitchenHeader
        title={folder.campaignName}
        backHref={studioKitchen.route}
        backLabel={studioKitchen.page.dashboardBackLabel}
        lead={`${folder.folderNumber} · ${folder.clientName} · ${folder.placement.homeBucketId ? kitchenFileBucketLabel(folder.placement.homeBucketId) : kitchenStageTitle(folder.currentStageId)} · ${folder.nextAction}`}
      />

      <div className="sk-detail">
        <StudioKitchenCampaignMeta campaign={folder} />
        <StudioKitchenWorkflowTimeline campaign={folder} stages={view.stages} />
        <StudioKitchenOwnerNotes notes={folder.ownerNotes} />
        <StudioKitchenAuditTrail events={folder.auditTrail} />
      </div>
    </div>
  );
}
