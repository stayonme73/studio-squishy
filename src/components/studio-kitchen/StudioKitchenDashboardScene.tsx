"use client";

import { useCallback, useMemo, useState } from "react";

import StudioKitchenAlertCenter from "@/components/studio-kitchen/StudioKitchenAlertCenter";
import StudioKitchenBucketOverview from "@/components/studio-kitchen/StudioKitchenBucketOverview";
import StudioKitchenCampaignDrawer from "@/components/studio-kitchen/StudioKitchenCampaignDrawer";
import StudioKitchenCampaignTable from "@/components/studio-kitchen/StudioKitchenCampaignTable";
import StudioKitchenHeader from "@/components/studio-kitchen/StudioKitchenHeader";
import { studioKitchen } from "@/config/studio-kitchen";
import { getKitchenFolder } from "@/lib/studio-kitchen-file-room-view";
import { buildKitchenDashboardView } from "@/lib/studio-kitchen-view";

const { page } = studioKitchen;

/** Studio Kitchen V3 — owner dashboard with campaign buckets. */
export default function StudioKitchenDashboardScene() {
  const view = useMemo(() => buildKitchenDashboardView(), []);
  const [drawerCampaignId, setDrawerCampaignId] = useState<string | null>(null);

  const drawerFolder = useMemo(() => {
    if (!drawerCampaignId) return null;
    return getKitchenFolder(drawerCampaignId);
  }, [drawerCampaignId]);

  const handleOpenCampaign = useCallback((campaignId: string) => {
    setDrawerCampaignId(campaignId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerCampaignId(null);
  }, []);

  return (
    <div className="sk-page utility-page" aria-label="Studio Kitchen Dashboard">
      <StudioKitchenHeader
        backHref={page.backHref}
        backLabel={page.backLabel}
        lead={page.lead}
        aside={
          <p className="sk-intro__phase" role="note">
            {page.phaseNote}
          </p>
        }
      />

      <div className="sk-dashboard">
        <StudioKitchenAlertCenter alerts={view.alerts} />
        <StudioKitchenBucketOverview board={view.bucketBoard} />
        <StudioKitchenCampaignTable tableGroups={view.tableGroups} onOpenCampaign={handleOpenCampaign} />
      </div>

      {drawerFolder ? (
        <StudioKitchenCampaignDrawer folder={drawerFolder} onClose={handleCloseDrawer} />
      ) : null}
    </div>
  );
}
